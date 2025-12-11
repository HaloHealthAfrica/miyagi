import { prisma } from '@/lib/prisma'

export interface WinningPattern {
  signalType: string
  direction: string
  miyagiBias: string
  dailyBias: string
  tfcScoreRange: { min: number; max: number }
  volScoreRange: { min: number; max: number }
  winRate: number
  avgPnL: number
  sampleSize: number
}

export interface OutcomeAnalysis {
  totalOutcomes: number
  winningOutcomes: number
  losingOutcomes: number
  winRate: number
  patterns: WinningPattern[]
  recommendations: string[]
}

export interface OptimizationResult {
  parameter: string
  currentValue: number
  recommendedValue: number
  expectedImprovement: number
  confidence: number
}

export interface StrategyVariant {
  id: string
  name: string
  config: {
    minTFCScore?: number
    minVolScore?: number
    stopLossPercent?: number
    takeProfitPercent?: number
    positionSizeMultiplier?: number
  }
}

export interface TestResult {
  variantId: string
  period: { start: Date; end: Date }
  metrics: {
    totalTrades: number
    winRate: number
    totalPnL: number
    sharpeRatio: number
  }
  comparison: {
    vsBaseline: {
      winRateDelta: number
      pnlDelta: number
    }
  }
}

export class LearningService {
  /**
   * Analyze trade outcomes and identify winning patterns
   */
  async analyzeOutcomes(timeframe?: { start?: Date; end?: Date }): Promise<OutcomeAnalysis> {
    const startDate = timeframe?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const endDate = timeframe?.end || new Date()

    // Get all trade outcomes with related data
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

    if (outcomes.length === 0) {
      return {
        totalOutcomes: 0,
        winningOutcomes: 0,
        losingOutcomes: 0,
        winRate: 0,
        patterns: [],
        recommendations: ['Insufficient data for analysis'],
      }
    }

    const winningOutcomes = outcomes.filter((o) => o.pnl > 0)
    const losingOutcomes = outcomes.filter((o) => o.pnl < 0)
    const winRate = (winningOutcomes.length / outcomes.length) * 100

    // Identify patterns
    const patterns = this.identifyWinningPatterns(outcomes)

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, outcomes)

    return {
      totalOutcomes: outcomes.length,
      winningOutcomes: winningOutcomes.length,
      losingOutcomes: losingOutcomes.length,
      winRate,
      patterns,
      recommendations,
    }
  }

  /**
   * Identify winning patterns from trade outcomes
   */
  private identifyWinningPatterns(outcomes: any[]): WinningPattern[] {
    const patternMap = new Map<string, any>()

    outcomes.forEach((outcome) => {
      const signal = outcome.signal
      const decision = outcome.decision
      if (!signal || !decision) return

      const meta = decision.meta as any
      const tfcScore = meta?.tfcScore || 0
      const volScore = meta?.volScore || 0

      // Create pattern key
      const key = `${signal.type}_${decision.direction}_${signal.miyagi || 'NONE'}_${signal.daily || 'NONE'}`

      if (!patternMap.has(key)) {
        patternMap.set(key, {
          signalType: signal.type,
          direction: decision.direction,
          miyagiBias: signal.miyagi || 'NONE',
          dailyBias: signal.daily || 'NONE',
          tfcScores: [],
          volScores: [],
          wins: 0,
          losses: 0,
          pnl: 0,
          count: 0,
        })
      }

      const pattern = patternMap.get(key)!
      pattern.tfcScores.push(tfcScore)
      pattern.volScores.push(volScore)
      pattern.count++
      pattern.pnl += outcome.pnl

      if (outcome.pnl > 0) {
        pattern.wins++
      } else if (outcome.pnl < 0) {
        pattern.losses++
      }
    })

    // Convert to WinningPattern format
    const patterns: WinningPattern[] = Array.from(patternMap.values())
      .filter((p) => p.count >= 3) // Minimum sample size
      .map((p) => ({
        signalType: p.signalType,
        direction: p.direction,
        miyagiBias: p.miyagiBias,
        dailyBias: p.dailyBias,
        tfcScoreRange: {
          min: Math.min(...p.tfcScores),
          max: Math.max(...p.tfcScores),
        },
        volScoreRange: {
          min: Math.min(...p.volScores),
          max: Math.max(...p.volScores),
        },
        winRate: (p.wins / p.count) * 100,
        avgPnL: p.pnl / p.count,
        sampleSize: p.count,
      }))
      .sort((a, b) => b.winRate - a.winRate) // Sort by win rate

    return patterns
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: WinningPattern[], outcomes: any[]): string[] {
    const recommendations: string[] = []

    // Find best performing patterns
    const topPatterns = patterns.filter((p) => p.winRate >= 60 && p.sampleSize >= 5)
    if (topPatterns.length > 0) {
      const best = topPatterns[0]
      recommendations.push(
        `Best performing pattern: ${best.signalType} ${best.direction} with ${best.miyagiBias} miyagi bias (${best.winRate.toFixed(1)}% win rate)`
      )
    }

    // Analyze score thresholds
    const winningOutcomes = outcomes.filter((o) => o.pnl > 0)
    const losingOutcomes = outcomes.filter((o) => o.pnl < 0)

    if (winningOutcomes.length > 0 && losingOutcomes.length > 0) {
      const winningTFC = winningOutcomes
        .map((o) => (o.decision?.meta as any)?.tfcScore || 0)
        .filter((s) => s > 0)
      const losingTFC = losingOutcomes
        .map((o) => (o.decision?.meta as any)?.tfcScore || 0)
        .filter((s) => s > 0)

      if (winningTFC.length > 0 && losingTFC.length > 0) {
        const avgWinningTFC = winningTFC.reduce((a, b) => a + b, 0) / winningTFC.length
        const avgLosingTFC = losingTFC.reduce((a, b) => a + b, 0) / losingTFC.length

        if (avgWinningTFC > avgLosingTFC) {
          recommendations.push(
            `Consider increasing minimum TFC score threshold. Winning trades average ${avgWinningTFC.toFixed(2)} vs ${avgLosingTFC.toFixed(2)} for losing trades.`
          )
        }
      }
    }

    // Analyze exit reasons
    const exitReasonStats: Record<string, { wins: number; total: number }> = {}
    outcomes.forEach((o) => {
      if (!exitReasonStats[o.exitReason]) {
        exitReasonStats[o.exitReason] = { wins: 0, total: 0 }
      }
      exitReasonStats[o.exitReason].total++
      if (o.pnl > 0) exitReasonStats[o.exitReason].wins++
    })

    Object.entries(exitReasonStats).forEach(([reason, stats]) => {
      const winRate = (stats.wins / stats.total) * 100
      if (stats.total >= 5) {
        if (winRate < 40) {
          recommendations.push(
            `Low win rate for ${reason} exits (${winRate.toFixed(1)}%). Consider adjusting stop loss/take profit levels.`
          )
        }
      }
    })

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring. No strong patterns identified yet.')
    }

    return recommendations
  }

  /**
   * Optimize decision engine parameters based on outcomes
   */
  async optimizeDecisionEngine(): Promise<OptimizationResult[]> {
    const outcomes = await prisma.tradeOutcome.findMany({
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
      take: 1000, // Analyze last 1000 trades
      orderBy: { createdAt: 'desc' },
    })

    if (outcomes.length < 20) {
      return [] // Not enough data
    }

    const optimizations: OptimizationResult[] = []

    // Analyze TFC score threshold
    const tfcAnalysis = this.analyzeScoreThreshold(outcomes, 'tfcScore')
    if (tfcAnalysis) {
      optimizations.push(tfcAnalysis)
    }

    // Analyze Volatility score threshold
    const volAnalysis = this.analyzeScoreThreshold(outcomes, 'volScore')
    if (volAnalysis) {
      optimizations.push(volAnalysis)
    }

    // Analyze stop loss/take profit
    const slAnalysis = this.analyzeStopLossTakeProfit(outcomes)
    if (slAnalysis) {
      optimizations.push(...slAnalysis)
    }

    return optimizations
  }

  /**
   * Analyze score threshold optimization
   */
  private analyzeScoreThreshold(outcomes: any[], scoreType: 'tfcScore' | 'volScore'): OptimizationResult | null {
    const scores = outcomes
      .map((o) => ({
        score: (o.decision?.meta as any)?.[scoreType] || 0,
        pnl: o.pnl,
        win: o.pnl > 0,
      }))
      .filter((s) => s.score > 0)

    if (scores.length < 10) return null

    // Find optimal threshold
    const sortedScores = [...scores].sort((a, b) => a.score - b.score)
    const currentThreshold = 0.5 // Default
    let bestThreshold = currentThreshold
    let bestWinRate = 0

    for (let threshold = 0.3; threshold <= 0.9; threshold += 0.1) {
      const filtered = sortedScores.filter((s) => s.score >= threshold)
      if (filtered.length < 5) continue

      const winRate = (filtered.filter((s) => s.win).length / filtered.length) * 100
      if (winRate > bestWinRate) {
        bestWinRate = winRate
        bestThreshold = threshold
      }
    }

    if (Math.abs(bestThreshold - currentThreshold) > 0.1) {
      return {
        parameter: `min${scoreType.charAt(0).toUpperCase() + scoreType.slice(1)}Score`,
        currentValue: currentThreshold,
        recommendedValue: bestThreshold,
        expectedImprovement: bestWinRate - (scores.filter((s) => s.win).length / scores.length) * 100,
        confidence: Math.min(100, (scores.length / 100) * 100),
      }
    }

    return null
  }

  /**
   * Analyze stop loss and take profit optimization
   */
  private analyzeStopLossTakeProfit(outcomes: any[]): OptimizationResult[] {
    const results: OptimizationResult[] = []

    // Analyze stop loss exits
    const stopLossOutcomes = outcomes.filter((o) => o.exitReason === 'stop_loss')
    if (stopLossOutcomes.length >= 10) {
      const avgLoss = stopLossOutcomes.reduce((sum, o) => sum + Math.abs(o.pnl), 0) / stopLossOutcomes.length
      const currentSL = 5.0 // Default 5%
      // If average loss is much larger than expected, recommend tighter stop
      if (avgLoss > 500) {
        results.push({
          parameter: 'stopLossPercent',
          currentValue: currentSL,
          recommendedValue: currentSL * 0.8, // 20% tighter
          expectedImprovement: -avgLoss * 0.2,
          confidence: Math.min(100, (stopLossOutcomes.length / 50) * 100),
        })
      }
    }

    // Analyze take profit exits
    const takeProfitOutcomes = outcomes.filter((o) => o.exitReason === 'take_profit')
    if (takeProfitOutcomes.length >= 10) {
      const avgWin = takeProfitOutcomes.reduce((sum, o) => sum + o.pnl, 0) / takeProfitOutcomes.length
      const currentTP = 10.0 // Default 10%
      // If average win is much larger, could let winners run longer
      if (avgWin > 1000) {
        results.push({
          parameter: 'takeProfitPercent',
          currentValue: currentTP,
          recommendedValue: currentTP * 1.2, // 20% wider
          expectedImprovement: avgWin * 0.2,
          confidence: Math.min(100, (takeProfitOutcomes.length / 50) * 100),
        })
      }
    }

    return results
  }

  /**
   * Update signal quality scores based on outcomes
   */
  async updateSignalQuality(signalId: string, outcome: any): Promise<void> {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: {
        outcomes: true,
      },
    })

    if (!signal) return

    // Get all outcomes for this signal pattern
    const allOutcomes = await prisma.tradeOutcome.findMany({
      where: {
        signal: {
          signal: signal.signal, // Same signal pattern
        },
      },
    })

    if (allOutcomes.length === 0) return

    const wins = allOutcomes.filter((o) => o.pnl > 0).length
    const successRate = (wins / allOutcomes.length) * 100
    const avgPnL = allOutcomes.reduce((sum, o) => sum + o.pnl, 0) / allOutcomes.length

    // Get decision meta for scores
    const decision = await prisma.decision.findFirst({
      where: { signalId },
    })
    const meta = (decision?.meta as any) || {}
    const tfcScore = meta.tfcScore
    const volScore = meta.volScore

    // Update or create signal quality record
    await prisma.signalQuality.upsert({
      where: { signalId },
      create: {
        signalId,
        tfcScore,
        volScore,
        outcome: outcome.pnl > 0 ? 'win' : outcome.pnl < 0 ? 'loss' : 'breakeven',
        pnl: outcome.pnl,
        successRate,
      },
      update: {
        tfcScore,
        volScore,
        outcome: outcome.pnl > 0 ? 'win' : outcome.pnl < 0 ? 'loss' : 'breakeven',
        pnl: outcome.pnl,
        successRate,
      },
    })
  }

  /**
   * Get signal quality score for a signal
   */
  async getSignalQuality(signalId: string): Promise<number> {
    const quality = await prisma.signalQuality.findUnique({
      where: { signalId },
    })

    if (!quality) return 0.5 // Default neutral score

    // Combine success rate and average P&L into quality score (0-1)
    const successWeight = 0.6
    const pnlWeight = 0.4
    const normalizedSuccess = quality.successRate / 100
    const normalizedPnL = Math.min(1, Math.max(0, (quality.pnl || 0) / 1000 + 0.5)) // Normalize to 0-1

    return normalizedSuccess * successWeight + normalizedPnL * pnlWeight
  }

  /**
   * A/B test strategy variant
   */
  async testStrategyVariant(variant: StrategyVariant, timeframe: { start: Date; end: Date }): Promise<TestResult> {
    // This would require implementing variant tracking
    // For now, return mock structure
    return {
      variantId: variant.id,
      period: timeframe,
      metrics: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        sharpeRatio: 0,
      },
      comparison: {
        vsBaseline: {
          winRateDelta: 0,
          pnlDelta: 0,
        },
      },
    }
  }
}

