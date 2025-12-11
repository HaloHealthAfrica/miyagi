import { prisma } from '@/lib/prisma'

export interface PerformanceMetrics {
  // Overall metrics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnL: number
  averagePnL: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  
  // Risk metrics
  sharpeRatio: number
  maxDrawdown: number
  profitFactor: number
  
  // Time-based metrics
  averageHoldTime: number // minutes
  totalTradingDays: number
  
  // Signal quality
  signalSuccessRate: Record<string, number> // by signal type
  exitReasonDistribution: Record<string, number>
  
  // Time series data
  dailyPnL: Array<{ date: string; pnl: number }>
  cumulativePnL: Array<{ date: string; cumulative: number }>
}

export interface SignalQualityReport {
  byType: {
    core: { total: number; wins: number; losses: number; winRate: number; avgPnL: number }
    runner: { total: number; wins: number; losses: number; winRate: number; avgPnL: number }
    scanner: { total: number; wins: number; losses: number; winRate: number; avgPnL: number }
  }
  byDirection: {
    long: { total: number; wins: number; losses: number; winRate: number; avgPnL: number }
    short: { total: number; wins: number; losses: number; winRate: number; avgPnL: number }
  }
  byExitReason: Record<string, { count: number; avgPnL: number; winRate: number }>
  topPerformingSignals: Array<{ signal: string; count: number; winRate: number; avgPnL: number }>
}

export interface PerformanceReport {
  metrics: PerformanceMetrics
  signalQuality: SignalQualityReport
  timeframe: { start: Date; end: Date }
  generatedAt: Date
}

export class AnalyticsService {
  /**
   * Calculate comprehensive performance metrics
   */
  async calculateMetrics(timeframe?: { start?: Date; end?: Date }): Promise<PerformanceMetrics> {
    const startDate = timeframe?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Default: 90 days
    const endDate = timeframe?.end || new Date()

    // Get all trade outcomes in timeframe
    const outcomes = await prisma.tradeOutcome.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        signal: true,
        decision: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (outcomes.length === 0) {
      return this.getEmptyMetrics()
    }

    // Basic counts
    const totalTrades = outcomes.length
    const winningTrades = outcomes.filter((o) => o.pnl > 0).length
    const losingTrades = outcomes.filter((o) => o.pnl < 0).length
    const winRate = (winningTrades / totalTrades) * 100

    // P&L calculations
    const totalPnL = outcomes.reduce((sum, o) => sum + o.pnl, 0)
    const averagePnL = totalPnL / totalTrades

    const wins = outcomes.filter((o) => o.pnl > 0).map((o) => o.pnl)
    const losses = outcomes.filter((o) => o.pnl < 0).map((o) => o.pnl)

    const averageWin = wins.length > 0 ? wins.reduce((sum, p) => sum + p, 0) / wins.length : 0
    const averageLoss = losses.length > 0 ? losses.reduce((sum, p) => sum + p, 0) / losses.length : 0

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0

    // Risk metrics
    const sharpeRatio = this.calculateSharpeRatio(outcomes.map((o) => o.pnl))
    const maxDrawdown = this.calculateMaxDrawdown(outcomes)
    const profitFactor = Math.abs(averageWin * winningTrades) / (Math.abs(averageLoss * losingTrades) || 1)

    // Time metrics
    const averageHoldTime = outcomes.reduce((sum, o) => sum + o.holdTime, 0) / totalTrades
    const tradingDays = this.getTradingDays(startDate, endDate)

    // Signal quality by type
    const signalSuccessRate: Record<string, { wins: number; total: number }> = {}
    outcomes.forEach((outcome) => {
      const signalType = outcome.signal?.type || 'unknown'
      if (!signalSuccessRate[signalType]) {
        signalSuccessRate[signalType] = { wins: 0, total: 0 }
      }
      signalSuccessRate[signalType].total++
      if (outcome.pnl > 0) {
        signalSuccessRate[signalType].wins++
      }
    })

    const signalSuccessRatePercent: Record<string, number> = {}
    Object.keys(signalSuccessRate).forEach((type) => {
      signalSuccessRatePercent[type] =
        (signalSuccessRate[type].wins / signalSuccessRate[type].total) * 100
    })

    // Exit reason distribution
    const exitReasonDistribution: Record<string, number> = {}
    outcomes.forEach((outcome) => {
      exitReasonDistribution[outcome.exitReason] =
        (exitReasonDistribution[outcome.exitReason] || 0) + 1
    })

    // Time series data
    const dailyPnL = this.calculateDailyPnL(outcomes)
    const cumulativePnL = this.calculateCumulativePnL(dailyPnL)

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averagePnL,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
      averageHoldTime,
      totalTradingDays: tradingDays,
      signalSuccessRate: signalSuccessRatePercent,
      exitReasonDistribution,
      dailyPnL,
      cumulativePnL,
    }
  }

  /**
   * Analyze signal quality
   */
  async analyzeSignalQuality(timeframe?: { start?: Date; end?: Date }): Promise<SignalQualityReport> {
    const startDate = timeframe?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const endDate = timeframe?.end || new Date()

    const outcomes = await prisma.tradeOutcome.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        signal: true,
        decision: true,
      },
    })

    // Group by signal type
    const byType: any = { core: { total: 0, wins: 0, losses: 0, pnl: 0 }, runner: { total: 0, wins: 0, losses: 0, pnl: 0 }, scanner: { total: 0, wins: 0, losses: 0, pnl: 0 } }

    outcomes.forEach((outcome) => {
      const type = (outcome.signal?.type || 'unknown').toLowerCase()
      if (byType[type]) {
        byType[type].total++
        if (outcome.pnl > 0) byType[type].wins++
        else if (outcome.pnl < 0) byType[type].losses++
        byType[type].pnl += outcome.pnl
      }
    })

    // Calculate metrics for each type
    Object.keys(byType).forEach((type) => {
      const data = byType[type]
      data.winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0
      data.avgPnL = data.total > 0 ? data.pnl / data.total : 0
    })

    // Group by direction
    const byDirection: any = { long: { total: 0, wins: 0, losses: 0, pnl: 0 }, short: { total: 0, wins: 0, losses: 0, pnl: 0 } }

    outcomes.forEach((outcome) => {
      const direction = (outcome.decision?.direction || 'unknown').toLowerCase()
      if (byDirection[direction]) {
        byDirection[direction].total++
        if (outcome.pnl > 0) byDirection[direction].wins++
        else if (outcome.pnl < 0) byDirection[direction].losses++
        byDirection[direction].pnl += outcome.pnl
      }
    })

    Object.keys(byDirection).forEach((dir) => {
      const data = byDirection[dir]
      data.winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0
      data.avgPnL = data.total > 0 ? data.pnl / data.total : 0
    })

    // Group by exit reason
    const byExitReason: Record<string, { count: number; pnl: number; wins: number }> = {}
    outcomes.forEach((outcome) => {
      if (!byExitReason[outcome.exitReason]) {
        byExitReason[outcome.exitReason] = { count: 0, pnl: 0, wins: 0 }
      }
      byExitReason[outcome.exitReason].count++
      byExitReason[outcome.exitReason].pnl += outcome.pnl
      if (outcome.pnl > 0) byExitReason[outcome.exitReason].wins++
    })

    const exitReasonMetrics: Record<string, { count: number; avgPnL: number; winRate: number }> = {}
    Object.keys(byExitReason).forEach((reason) => {
      const data = byExitReason[reason]
      exitReasonMetrics[reason] = {
        count: data.count,
        avgPnL: data.count > 0 ? data.pnl / data.count : 0,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }
    })

    // Top performing signals
    const signalPerformance: Record<string, { count: number; wins: number; pnl: number }> = {}
    outcomes.forEach((outcome) => {
      const signal = outcome.signal?.signal || 'unknown'
      if (!signalPerformance[signal]) {
        signalPerformance[signal] = { count: 0, wins: 0, pnl: 0 }
      }
      signalPerformance[signal].count++
      if (outcome.pnl > 0) signalPerformance[signal].wins++
      signalPerformance[signal].pnl += outcome.pnl
    })

    const topPerformingSignals = Object.keys(signalPerformance)
      .map((signal) => ({
        signal,
        count: signalPerformance[signal].count,
        winRate: (signalPerformance[signal].wins / signalPerformance[signal].count) * 100,
        avgPnL: signalPerformance[signal].pnl / signalPerformance[signal].count,
      }))
      .sort((a, b) => b.avgPnL - a.avgPnL)
      .slice(0, 10)

    return {
      byType,
      byDirection,
      byExitReason: exitReasonMetrics,
      topPerformingSignals,
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(timeframe?: { start?: Date; end?: Date }): Promise<PerformanceReport> {
    const metrics = await this.calculateMetrics(timeframe)
    const signalQuality = await this.analyzeSignalQuality(timeframe)

    return {
      metrics,
      signalQuality,
      timeframe: {
        start: timeframe?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: timeframe?.end || new Date(),
      },
      generatedAt: new Date(),
    }
  }

  // Helper methods

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      averagePnL: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      averageHoldTime: 0,
      totalTradingDays: 0,
      signalSuccessRate: {},
      exitReasonDistribution: {},
      dailyPnL: [],
      cumulativePnL: [],
    }
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    if (stdDev === 0) return 0
    // Assuming risk-free rate of 0 for simplicity
    return (mean / stdDev) * Math.sqrt(252) // Annualized
  }

  private calculateMaxDrawdown(outcomes: any[]): number {
    if (outcomes.length === 0) return 0
    let cumulative = 0
    let peak = 0
    let maxDrawdown = 0

    outcomes.forEach((outcome) => {
      cumulative += outcome.pnl
      if (cumulative > peak) peak = cumulative
      const drawdown = peak - cumulative
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    })

    return maxDrawdown
  }

  private getTradingDays(start: Date, end: Date): number {
    let days = 0
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday or Saturday
        days++
      }
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  private calculateDailyPnL(outcomes: any[]): Array<{ date: string; pnl: number }> {
    const daily: Record<string, number> = {}
    outcomes.forEach((outcome) => {
      const date = outcome.createdAt.toISOString().split('T')[0]
      daily[date] = (daily[date] || 0) + outcome.pnl
    })

    return Object.keys(daily)
      .sort()
      .map((date) => ({ date, pnl: daily[date] }))
  }

  private calculateCumulativePnL(
    dailyPnL: Array<{ date: string; pnl: number }>
  ): Array<{ date: string; cumulative: number }> {
    let cumulative = 0
    return dailyPnL.map((day) => {
      cumulative += day.pnl
      return { date: day.date, cumulative }
    })
  }
}

