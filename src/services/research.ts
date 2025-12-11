import { prisma } from '@/lib/prisma'
import { Backtester, BacktestParams } from '@/services/backtester'

export type ExperimentKind = 'sweep' | 'walkforward' | 'montecarlo'

export interface SweepConfig {
  kind: 'sweep'
  name: string
  symbols: string[]
  startDate: string
  endDate: string
  timeframe?: '1min' | '5min' | '15min' | '1day'
  stopLossPercents: number[]
  takeProfitPercents: number[]
  slippageBps?: number
  feePerTrade?: number
  maxHoldBars?: number
  positionSize?: number
  contractMultiplier?: number
}

export interface WalkForwardConfig {
  kind: 'walkforward'
  name: string
  symbols: string[]
  startDate: string
  endDate: string
  timeframe?: '1min' | '5min' | '15min' | '1day'
  trainDays: number
  testDays: number
  stepDays: number
  // grid for selecting best params on train window
  stopLossPercents: number[]
  takeProfitPercents: number[]
  slippageBps?: number
  feePerTrade?: number
}

export interface MonteCarloConfig {
  kind: 'montecarlo'
  name: string
  backtestRunId: string
  simulations: number
  seed?: number
}

export type ExperimentConfig = SweepConfig | WalkForwardConfig | MonteCarloConfig

export class ResearchService {
  private backtester = new Backtester()

  async createExperiment(config: ExperimentConfig) {
    return prisma.backtestExperiment.create({
      data: {
        name: config.name,
        kind: config.kind,
        config: config as any,
        status: 'QUEUED',
      },
    })
  }

  async runExperiment(experimentId: string) {
    const exp = await prisma.backtestExperiment.findUnique({ where: { id: experimentId } })
    if (!exp) throw new Error('Experiment not found')

    await prisma.backtestExperiment.update({ where: { id: exp.id }, data: { status: 'RUNNING', error: null } })
    const cfg = exp.config as any as ExperimentConfig

    try {
      let result: any = null
      if (cfg.kind === 'sweep') result = await this.runSweep(exp.id, cfg)
      if (cfg.kind === 'walkforward') result = await this.runWalkForward(exp.id, cfg)
      if (cfg.kind === 'montecarlo') result = await this.runMonteCarlo(exp.id, cfg)

      await prisma.backtestExperiment.update({
        where: { id: exp.id },
        data: { status: 'SUCCEEDED', result: result as any },
      })
      return result
    } catch (e: any) {
      await prisma.backtestExperiment.update({
        where: { id: exp.id },
        data: { status: 'FAILED', error: e?.message || 'Experiment failed' },
      })
      throw e
    }
  }

  private async runSweep(experimentId: string, cfg: SweepConfig) {
    const startDate = new Date(cfg.startDate)
    const endDate = new Date(cfg.endDate)

    const grid: Array<{ symbol: string; sl: number; tp: number; runId: string; totalPnL: number; winRate: number }> = []

    for (const symbol of cfg.symbols) {
      for (const sl of cfg.stopLossPercents) {
        for (const tp of cfg.takeProfitPercents) {
          const { runId } = await this.backtester.run({
            experimentId,
            symbol,
            startDate,
            endDate,
            timeframe: cfg.timeframe,
            stopLossPercent: sl,
            takeProfitPercent: tp,
            slippageBps: cfg.slippageBps,
            feePerTrade: cfg.feePerTrade,
            maxHoldBars: cfg.maxHoldBars,
            positionSize: cfg.positionSize,
            contractMultiplier: cfg.contractMultiplier,
            name: `${symbol} SL${sl} TP${tp}`,
          } satisfies BacktestParams)

          const run = await prisma.backtestRun.findUnique({ where: { id: runId } })
          grid.push({
            symbol,
            sl,
            tp,
            runId,
            totalPnL: run?.totalPnL || 0,
            winRate: run?.winRate || 0,
          })
        }
      }
    }

    // Best per symbol
    const bestBySymbol: Record<string, any> = {}
    for (const row of grid) {
      const cur = bestBySymbol[row.symbol]
      if (!cur || row.totalPnL > cur.totalPnL) bestBySymbol[row.symbol] = row
    }

    return { kind: 'sweep', bestBySymbol, gridSize: grid.length }
  }

  private async runWalkForward(experimentId: string, cfg: WalkForwardConfig) {
    const start = new Date(cfg.startDate)
    const end = new Date(cfg.endDate)

    const windows: any[] = []
    let cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    while (cursor < end) {
      const trainStart = new Date(cursor)
      const trainEnd = new Date(cursor)
      trainEnd.setDate(trainEnd.getDate() + cfg.trainDays)

      const testStart = new Date(trainEnd)
      const testEnd = new Date(trainEnd)
      testEnd.setDate(testEnd.getDate() + cfg.testDays)

      if (testEnd > end) break

      // Pick best params on train (aggregate pnl across symbols)
      let best: { sl: number; tp: number; score: number } | null = null
      for (const sl of cfg.stopLossPercents) {
        for (const tp of cfg.takeProfitPercents) {
          let score = 0
          for (const sym of cfg.symbols) {
            const { runId } = await this.backtester.run({
              experimentId,
              symbol: sym,
              startDate: trainStart,
              endDate: trainEnd,
              timeframe: cfg.timeframe,
              stopLossPercent: sl,
              takeProfitPercent: tp,
              slippageBps: cfg.slippageBps,
              feePerTrade: cfg.feePerTrade,
              name: `[TRAIN] ${sym} SL${sl} TP${tp}`,
            })
            const run = await prisma.backtestRun.findUnique({ where: { id: runId } })
            score += run?.totalPnL || 0
          }
          if (!best || score > best.score) best = { sl, tp, score }
        }
      }

      // Evaluate on test using best params
      let testPnL = 0
      const testRuns: string[] = []
      for (const sym of cfg.symbols) {
        const { runId } = await this.backtester.run({
          experimentId,
          symbol: sym,
          startDate: testStart,
          endDate: testEnd,
          timeframe: cfg.timeframe,
          stopLossPercent: best!.sl,
          takeProfitPercent: best!.tp,
          slippageBps: cfg.slippageBps,
          feePerTrade: cfg.feePerTrade,
          name: `[TEST] ${sym} SL${best!.sl} TP${best!.tp}`,
        })
        testRuns.push(runId)
        const run = await prisma.backtestRun.findUnique({ where: { id: runId } })
        testPnL += run?.totalPnL || 0
      }

      windows.push({
        train: { start: trainStart.toISOString(), end: trainEnd.toISOString() },
        test: { start: testStart.toISOString(), end: testEnd.toISOString() },
        bestParams: best,
        testPnL,
        testRuns,
      })

      cursor.setDate(cursor.getDate() + cfg.stepDays)
    }

    const totalTestPnL = windows.reduce((s, w) => s + (w.testPnL || 0), 0)
    return { kind: 'walkforward', windows: windows.length, totalTestPnL, details: windows }
  }

  private async runMonteCarlo(experimentId: string, cfg: MonteCarloConfig) {
    const run = await prisma.backtestRun.findUnique({
      where: { id: cfg.backtestRunId },
      include: { trades: true },
    })
    if (!run) throw new Error('Backtest run not found')
    const pnls = run.trades.map((t) => t.pnl)
    if (pnls.length < 5) throw new Error('Not enough trades for Monte Carlo')

    // Simple seeded RNG
    let seed = cfg.seed ?? 1337
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }

    const sims = Math.min(2000, Math.max(10, cfg.simulations))
    const totals: number[] = []
    const drawdowns: number[] = []

    for (let i = 0; i < sims; i++) {
      let equity = 0
      let peak = 0
      let maxDd = 0
      for (let j = 0; j < pnls.length; j++) {
        const pick = pnls[Math.floor(rand() * pnls.length)]
        equity += pick
        if (equity > peak) peak = equity
        const dd = peak - equity
        if (dd > maxDd) maxDd = dd
      }
      totals.push(equity)
      drawdowns.push(maxDd)
    }

    totals.sort((a, b) => a - b)
    drawdowns.sort((a, b) => a - b)

    const pct = (arr: number[], p: number) => arr[Math.floor((p / 100) * (arr.length - 1))]

    return {
      kind: 'montecarlo',
      baseRunId: run.id,
      trades: pnls.length,
      simulations: sims,
      totalPnL: {
        p5: pct(totals, 5),
        p50: pct(totals, 50),
        p95: pct(totals, 95),
        min: totals[0],
        max: totals[totals.length - 1],
      },
      maxDrawdown: {
        p5: pct(drawdowns, 5),
        p50: pct(drawdowns, 50),
        p95: pct(drawdowns, 95),
      },
    }
  }
}


