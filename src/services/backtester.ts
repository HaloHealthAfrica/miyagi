import { prisma } from '@/lib/prisma'
import { TwelveDataClient } from '@/providers/twelvedataClient'
import type { OHLC } from '@/providers/base'

export type BacktestExitReason = 'stop_loss' | 'take_profit' | 'timeout' | 'data_missing'

export interface BacktestParams {
  name?: string
  symbol: string
  startDate: Date
  endDate: Date
  timeframe?: '1min' | '5min' | '15min' | '1day'
  stopLossPercent?: number
  takeProfitPercent?: number
  maxHoldBars?: number
  positionSize?: number
  contractMultiplier?: number
}

export class Backtester {
  private twelvedata: TwelveDataClient | null = null

  constructor() {
    try {
      this.twelvedata = new TwelveDataClient()
    } catch (e) {
      console.warn('TwelveData client initialization failed:', e)
    }
  }

  async run(params: BacktestParams): Promise<{ runId: string }> {
    const timeframe = params.timeframe || '5min'
    const stopLossPercent = params.stopLossPercent ?? 5.0
    const takeProfitPercent = params.takeProfitPercent ?? 10.0
    const maxHoldBars = params.maxHoldBars ?? (timeframe === '5min' ? 78 : 200)
    const positionSize = params.positionSize ?? 1
    const contractMultiplier = params.contractMultiplier ?? 100

    if (!this.twelvedata) throw new Error('TwelveData client not available (missing TWELVEDATA_API_KEY)')

    // Load signals to replay (core + runner only)
    const signals = await prisma.signal.findMany({
      where: {
        type: { in: ['core', 'runner'] },
        timestamp: { gte: params.startDate, lte: params.endDate },
      },
      orderBy: { timestamp: 'asc' },
    })

    // Create run record first
    const run = await prisma.backtestRun.create({
      data: {
        name: params.name || `Backtest ${params.symbol} ${timeframe}`,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        timeframe,
        stopLossPercent,
        takeProfitPercent,
        maxHoldBars,
        positionSize,
        contractMultiplier,
      },
    })

    // Fetch OHLC once (best-effort lookback)
    // TwelveData supports outputsize only; we overfetch and filter by dates.
    const lookback = Math.min(5000, Math.max(200, signals.length * maxHoldBars + 200))
    const ohlc = await this.twelvedata.getOHLC({ symbol: params.symbol, timeframe, lookback })
    const bars = ohlc.filter((b) => b.timestamp >= params.startDate && b.timestamp <= params.endDate)

    if (bars.length < 10) {
      await prisma.backtestRun.update({
        where: { id: run.id },
        data: {
          results: { error: 'Not enough OHLC data returned for timeframe/date range' } as any,
        },
      })
      return { runId: run.id }
    }

    // Replay signals
    const trades: Array<{
      backtestRunId: string
      signalId: string | null
      decisionId: string | null
      direction: string
      entryTime: Date
      exitTime: Date
      entryPrice: number
      exitPrice: number
      pnl: number
      pnlPercent: number
      exitReason: BacktestExitReason
    }> = []

    for (const s of signals) {
      const raw: any = s.rawPayload
      const dir = (raw?.direction || s.direction || 'long').toString().toLowerCase()
      const direction = dir === 'short' ? 'SHORT' : 'LONG'

      const entryIdx = this.findFirstBarOnOrAfter(bars, s.timestamp)
      if (entryIdx < 0) continue

      const entryBar = bars[entryIdx]
      const entryPrice = entryBar.close

      const sl =
        direction === 'LONG'
          ? entryPrice * (1 - stopLossPercent / 100)
          : entryPrice * (1 + stopLossPercent / 100)
      const tp =
        direction === 'LONG'
          ? entryPrice * (1 + takeProfitPercent / 100)
          : entryPrice * (1 - takeProfitPercent / 100)

      const { exitBar, exitPrice, exitReason } = this.simulateExit(
        bars,
        entryIdx,
        direction,
        sl,
        tp,
        maxHoldBars
      )

      const pnlPercent =
        direction === 'LONG'
          ? ((exitPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - exitPrice) / entryPrice) * 100
      const notional = entryPrice * positionSize * contractMultiplier
      const pnl = (pnlPercent / 100) * notional

      trades.push({
        backtestRunId: run.id,
        signalId: s.id,
        decisionId: null,
        direction,
        entryTime: entryBar.timestamp,
        exitTime: exitBar.timestamp,
        entryPrice,
        exitPrice,
        pnl,
        pnlPercent,
        exitReason,
      })
    }

    if (trades.length > 0) {
      await prisma.backtestTrade.createMany({ data: trades as any })
    }

    // Summaries
    const totalTrades = trades.length
    const winningTrades = trades.filter((t) => t.pnl > 0).length
    const losingTrades = trades.filter((t) => t.pnl < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
    const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : 0

    const equityCurve = this.buildEquityCurve(trades)
    const maxDrawdown = this.maxDrawdownFromEquity(equityCurve.map((p) => p.equity))
    const sharpeRatio = this.sharpeFromTradePnL(trades.map((t) => t.pnl))

    await prisma.backtestRun.update({
      where: { id: run.id },
      data: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalPnL,
        averagePnL,
        maxDrawdown,
        sharpeRatio,
        results: {
          equityCurve,
          exitReasonDistribution: this.exitReasonDist(trades),
          bars: { timeframe, count: bars.length },
        } as any,
      },
    })

    return { runId: run.id }
  }

  private findFirstBarOnOrAfter(bars: OHLC[], ts: Date): number {
    let lo = 0
    let hi = bars.length - 1
    let ans = -1
    const t = ts.getTime()
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const mt = bars[mid].timestamp.getTime()
      if (mt >= t) {
        ans = mid
        hi = mid - 1
      } else {
        lo = mid + 1
      }
    }
    return ans
  }

  private simulateExit(
    bars: OHLC[],
    entryIdx: number,
    direction: 'LONG' | 'SHORT',
    stopLoss: number,
    takeProfit: number,
    maxHoldBars: number
  ): { exitBar: OHLC; exitPrice: number; exitReason: BacktestExitReason } {
    const endIdx = Math.min(bars.length - 1, entryIdx + maxHoldBars)

    for (let i = entryIdx + 1; i <= endIdx; i++) {
      const b = bars[i]

      // Conservative ordering: if both SL/TP hit same bar, assume SL first.
      if (direction === 'LONG') {
        if (b.low <= stopLoss) return { exitBar: b, exitPrice: stopLoss, exitReason: 'stop_loss' }
        if (b.high >= takeProfit) return { exitBar: b, exitPrice: takeProfit, exitReason: 'take_profit' }
      } else {
        if (b.high >= stopLoss) return { exitBar: b, exitPrice: stopLoss, exitReason: 'stop_loss' }
        if (b.low <= takeProfit) return { exitBar: b, exitPrice: takeProfit, exitReason: 'take_profit' }
      }
    }

    const last = bars[endIdx] || bars[entryIdx]
    return { exitBar: last, exitPrice: last.close, exitReason: 'timeout' }
  }

  private buildEquityCurve(trades: Array<{ exitTime: Date; pnl: number }>) {
    const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())
    let equity = 0
    return sorted.map((t) => {
      equity += t.pnl
      return { date: t.exitTime.toISOString(), equity }
    })
  }

  private maxDrawdownFromEquity(series: number[]): number {
    let peak = 0
    let maxDd = 0
    let cur = 0
    for (const v of series) {
      cur = v
      if (cur > peak) peak = cur
      const dd = peak - cur
      if (dd > maxDd) maxDd = dd
    }
    return maxDd
  }

  private sharpeFromTradePnL(pnls: number[]): number {
    if (pnls.length < 2) return 0
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length
    const varr = pnls.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (pnls.length - 1)
    const sd = Math.sqrt(varr)
    if (!sd) return 0
    return mean / sd
  }

  private exitReasonDist(trades: Array<{ exitReason: string }>) {
    const dist: Record<string, number> = {}
    for (const t of trades) dist[t.exitReason] = (dist[t.exitReason] || 0) + 1
    return dist
  }
}


