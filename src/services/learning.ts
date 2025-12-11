import { prisma } from '@/lib/prisma'

export interface WinningPattern {
  signalType: string
  direction: string
  conditions: {
    miyagi?: string
    daily?: string
    tfcScoreMin?: number
    volScoreMin?: number
    scannerBias?: string
  }
  winRate: number
  avgPnL: number
  sampleSize: number
  confidence: number
}

export interface OutcomeAnalysis {
  totalOutcomes: number
  winningPatterns: WinningPattern[]
  losingPatterns: WinningPattern[]
  recommendations: string[]
  optimizedParameters: {
    stopLossPercent?: number
    takeProfitPercent?: number
    minTFCScore?: number
    minVolScore?: number
  }
}

export interface OptimizationResult {
  parameter: string
  currentValue: number
  recommendedValue: number
  expectedImprovement: number
  confidence: number
  reasoning: string
}

export interface StrategyVariant {
  id: string
  name: string
  config: {
    stopLossPercent: number
    takeProfitPercent: number
    minTFCScore: number
    minVolScore: number
    maxPositions: number
  }
  enabled: boolean
}

export interface TestResult {
  variantId: string
  startDate: Date
  endDate: Date
  totalTrades: number
  winRate: number
  totalPnL: number
  sharpeRatio: number
  betterThanBaseline: boolean
}

export class LearningService {
  /**
   * Analyze trade outcomes and identify winning/losing patterns
   */
  async analyzeOutcomes(timeframe?: { start?: Date; end?: Date }): Promise<OutcomeAnalysis> {
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

    if (outcomes.length === 0) {
      return {
        totalOutcomes: 0,
        winningPatterns: [],
        losingPatterns: [],
        recommendations: ['No trade outcomes available for analysis'],
        optimizedParameters: {},
      }
    }

    // Identify winning patterns
    const winningPatterns = this.identifyWinningPatterns(outcomes)
    const losingPatterns = this.identifyLosingPatterns(outcomes)

    // Generate recommendations
    const recommendations = this.generateRecommendations(winningPatterns, losingPatterns, outcomes)

    // Calculate optimized parameters
    const optimizedParameters = await this.calculateOptimizedParameters(outcomes)

    return {
      totalOutcomes: outcomes.length,
      winningPatterns,
      losingPatterns,
      recommendations,
      optimizedParameters,
    }
  }

  /**
   * Identify winning patterns from trade outcomes
   */
  private identifyWinningPatterns(outcomes: any[]): WinningPattern[] {
    const winningOutcomes = outcomes.filter((o) => o.pnl > 0)
    const patterns: Map<string, any> = new Map()

    winningOutcomes.forEach((outcome) => {
      const signal = outcome.signal
      const decision = outcome.decision
      const meta = (decision?.meta as any) || {}

      const key = `${signal?.type || 'unknown'}_${decision?.direction || 'unknown'}_${signal?.miyagi || 'unknown'}_${signal?.daily || 'unknown'}`

      if (!patterns.has(key)) {
        patterns.set(key, {
          signalType: signal?.type || 'unknown',
          direction: decision?.direction || 'unknown',
          conditions: {
            miyagi: signal?.miyagi,
            daily: signal?.daily,
            tfcScoreMin: meta.tfcScore,
            volScoreMin: meta.volScore,
            scannerBias: meta.scannerBias,
          },
          pnls: [],
          sampleSize: 0,
        })
      }

      const pattern = patterns.get(key)
      pattern.pnls.push(outcome.pnl)
      pattern.sampleSize++
    })

    // Convert to WinningPattern array
    const winningPatterns: WinningPattern[] = Array.from(patterns.values())
      .map((pattern) => {
        const wins = pattern.pnls.length
        const total = pattern.sampleSize
        const winRate = (wins / total) * 100
        const avgPnL = pattern.pnls.reduce((sum: number, p: number) => sum + p, 0) / pattern.pnls.length
        const confidence = Math.min(100, (total / 10) * 100) // More samples = higher confidence

        return {
          signalType: pattern.signalType,
          direction: pattern.direction,
          conditions: pattern.conditions,
          winRate,
          avgPnL,
          sampleSize: pattern.sampleSize,
          confidence,
        }
      })
      .filter((p) => p.sampleSize >= 3) // Minimum 3 samples
      .sort((a, b) => b.winRate - a.winRate)

    return winningPatterns
  }

  /**
   * Identify losing patterns
   */
  private identifyLosingPatterns(outcomes: any[]): WinningPattern[] {
    const losingOutcomes = outcomes.filter((o) => o.pnl < 0)
    const patterns: Map<string, any> = new Map()

    losingOutcomes.forEach((outcome) => {
      const signal = outcome.signal
      const decision = outcome.decision
      const meta = (decision?.meta as any) || {}

      const key = `${signal?.type || 'unknown'}_${decision?.direction || 'unknown'}_${signal?.miyagi || 'unknown'}_${signal?.daily || 'unknown'}`

      if (!patterns.has(key)) {
        patterns.set(key, {
          signalType: signal?.type || 'unknown',
          direction: decision?.direction || 'unknown',
          conditions: {
            miyagi: signal?.miyagi,
            daily: signal?.daily,
            tfcScoreMin: meta.tfcScore,
            volScoreMin: meta.volScore,
          },
          pnls: [],
          sampleSize: 0,
        })
      }

      const pattern = patterns.get(key)
      pattern.pnls.push(outcome.pnl)
      pattern.sampleSize++
    })

    const losingPatterns: WinningPattern[] = Array.from(patterns.values())
      .map((pattern) => {
        const losses = pattern.pnls.length
        const total = pattern.sampleSize
        const winRate = ((total - losses) / total) * 100 // Inverted for losing patterns
        const avgPnL = pattern.pnls.reduce((sum: number, p: number) => sum + p, 0) / pattern.pnls.length
        const confidence = Math.min(100, (total / 10) * 100)

        return {
          signalType: pattern.signalType,
          direction: pattern.direction,
          conditions: pattern.conditions,
          winRate,
          avgPnL,
          sampleSize: pattern.sampleSize,
          confidence,
        }
      })
      .filter((p) => p.sampleSize >= 3)
      .sort((a, b) => a.winRate - b.winRate) // Sort by worst win rate

    return losingPatterns
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(
    winningPatterns: WinningPattern[],
    losingPatterns: WinningPattern[],
    outcomes: any[]
  ): string[] {
    const recommendations: string[] = []

    // Analyze winning patterns
    if (winningPatterns.length > 0) {
      const topPattern = winningPatterns[0]
      if (topPattern.winRate >= 70 && topPattern.sampleSize >= 5) {
        recommendations.push(
          `High-performing pattern: ${topPattern.signalType} ${topPattern.direction} with ${topPattern.conditions.miyagi} miyagi bias (${topPattern.winRate.toFixed(1)}% win rate)`
        )
      }
    }

    // Analyze losing patterns
    if (losingPatterns.length > 0) {
      const worstPattern = losingPatterns[0]
      if (worstPattern.winRate <= 30 && worstPattern.sampleSize >= 5) {
        recommendations.push(
          `Avoid pattern: ${worstPattern.signalType} ${worstPattern.direction} with ${worstPattern.conditions.miyagi} miyagi bias (${worstPattern.winRate.toFixed(1)}% win rate)`
        )
      }
    }

    // Analyze exit reasons
    const exitReasonStats: Record<string, { count: number; avgPnL: number; pnls: number[] }> = {}
    outcomes.forEach((o) => {
      if (!exitReasonStats[o.exitReason]) {
        exitReasonStats[o.exitReason] = { count: 0, avgPnL: 0, pnls: [] }
      }
      exitReasonStats[o.exitReason].count++
      exitReasonStats[o.exitReason].pnls.push(o.pnl)
    })

    Object.keys(exitReasonStats).forEach((reason) => {
      const stats = exitReasonStats[reason]
      stats.avgPnL = stats.pnls.reduce((sum, p) => sum + p, 0) / stats.pnls.length
    })

    const takeProfitPnL = exitReasonStats['take_profit']?.avgPnL || 0
    const stopLossPnL = exitReasonStats['stop_loss']?.avgPnL || 0

    if (takeProfitPnL > 0 && stopLossPnL < 0) {
      recommendations.push('Take profit exits are profitable. Consider tightening stop losses.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring. Need more data for pattern identification.')
    }

    return recommendations
  }

  /**
   * Calculate optimized parameters based on outcomes
   */
  private async calculateOptimizedParameters(outcomes: any[]): Promise<any> {
    if (outcomes.length < 10) {
      return {} // Not enough data
    }

    const optimized: any = {}

    // Analyze stop loss performance
    const stopLossOutcomes = outcomes.filter((o) => o.exitReason === 'stop_loss')
    if (stopLossOutcomes.length >= 5) {
      const avgStopLossPnL = stopLossOutcomes.reduce((sum, o) => sum + o.pnl, 0) / stopLossOutcomes.length
      if (avgStopLossPnL < -100) {
        // Stop losses are too tight
        optimized.stopLossPercent = 7.0 // Increase from default 5%
      } else if (avgStopLossPnL > -50) {
        // Stop losses are too loose
        optimized.stopLossPercent = 3.0 // Decrease from default 5%
      }
    }

    // Analyze take profit performance
    const takeProfitOutcomes = outcomes.filter((o) => o.exitReason === 'take_profit')
    if (takeProfitOutcomes.length >= 5) {
      const avgTakeProfitPnL = takeProfitOutcomes.reduce((sum, o) => sum + o.pnl, 0) / takeProfitOutcomes.length
      if (avgTakeProfitPnL < 50) {
        // Take profits are too tight
        optimized.takeProfitPercent = 15.0 // Increase from default 10%
      }
    }

    // Analyze signal scores
    const outcomesWithScores = outcomes.filter((o) => {
      const meta = (o.decision?.meta as any) || {}
      return meta.tfcScore && meta.volScore
    })

    if (outcomesWithScores.length >= 10) {
      const winningScores = outcomesWithScores
        .filter((o) => o.pnl > 0)
        .map((o) => ({
          tfc: (o.decision?.meta as any)?.tfcScore || 0,
          vol: (o.decision?.meta as any)?.volScore || 0,
        }))

      if (winningScores.length > 0) {
        const avgTFC = winningScores.reduce((sum, s) => sum + s.tfc, 0) / winningScores.length
        const avgVol = winningScores.reduce((sum, s) => sum + s.vol, 0) / winningScores.length

        optimized.minTFCScore = Math.max(0.5, avgTFC - 0.2) // Slightly below average
        optimized.minVolScore = Math.max(0.5, avgVol - 0.2)
      }
    }

    return optimized
  }

  /**
   * Update signal quality scores based on trade outcomes
   */
  async updateSignalQuality(signalId: string, outcome: any): Promise<void> {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
    })

    if (!signal) return

    // Get all outcomes for this signal pattern (same signal string)
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
   * Get signal quality score for filtering
   */
  async getSignalQuality(signalId: string): Promise<number> {
    const quality = await prisma.signalQuality.findUnique({
      where: { signalId },
    })

    if (!quality) return 0.5 // Default neutral score

    // Combine success rate with score quality
    const baseScore = quality.successRate / 100
    const scoreBonus = ((quality.tfcScore || 0.5) + (quality.volScore || 0.5)) / 2

    return (baseScore * 0.7 + scoreBonus * 0.3) // Weighted combination
  }

  /**
   * Optimize decision engine parameters
   */
  async optimizeDecisionEngine(): Promise<OptimizationResult[]> {
    const outcomes = await prisma.tradeOutcome.findMany({
      include: {
        decision: true,
        signal: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Analyze last 100 trades
    })

    if (outcomes.length < 20) {
      return [] // Not enough data
    }

    const results: OptimizationResult[] = []

    // Optimize stop loss
    const stopLossAnalysis = this.analyzeStopLossTakeProfit(outcomes, 'stop_loss')
    if (stopLossAnalysis) {
      results.push(stopLossAnalysis)
    }

    // Optimize take profit
    const takeProfitAnalysis = this.analyzeStopLossTakeProfit(outcomes, 'take_profit')
    if (takeProfitAnalysis) {
      results.push(takeProfitAnalysis)
    }

    // Optimize signal score thresholds
    const scoreAnalysis = this.analyzeSignalScores(outcomes)
    results.push(...scoreAnalysis)

    return results
  }

  private analyzeStopLossTakeProfit(outcomes: any[], exitReason: string): OptimizationResult | null {
    const relevantOutcomes = outcomes.filter((o) => o.exitReason === exitReason)
    if (relevantOutcomes.length < 5) return null

    const avgPnL = relevantOutcomes.reduce((sum, o) => sum + o.pnl, 0) / relevantOutcomes.length
    const isStopLoss = exitReason === 'stop_loss'

    let recommendedValue: number
    let reasoning: string

    if (isStopLoss) {
      if (avgPnL < -100) {
        recommendedValue = 7.0
        reasoning = 'Stop losses are too tight, causing large losses. Recommend increasing to 7%'
      } else if (avgPnL > -30) {
        recommendedValue = 3.0
        reasoning = 'Stop losses are too loose. Recommend tightening to 3%'
      } else {
        recommendedValue = 5.0
        reasoning = 'Current stop loss setting is optimal'
      }
    } else {
      if (avgPnL < 50) {
        recommendedValue = 15.0
        reasoning = 'Take profits are too tight. Recommend increasing to 15%'
      } else if (avgPnL > 200) {
        recommendedValue = 8.0
        reasoning = 'Take profits are too loose, leaving money on table. Recommend tightening to 8%'
      } else {
        recommendedValue = 10.0
        reasoning = 'Current take profit setting is optimal'
      }
    }

    return {
      parameter: isStopLoss ? 'stopLossPercent' : 'takeProfitPercent',
      currentValue: isStopLoss ? 5.0 : 10.0,
      recommendedValue,
      expectedImprovement: Math.abs(avgPnL) * 0.1, // Estimate 10% improvement
      confidence: Math.min(100, (relevantOutcomes.length / 10) * 100),
      reasoning,
    }
  }

  private analyzeSignalScores(outcomes: any[]): OptimizationResult[] {
    const results: OptimizationResult[] = []

    const outcomesWithScores = outcomes.filter((o) => {
      const meta = (o.decision?.meta as any) || {}
      return meta.tfcScore && meta.volScore
    })

    if (outcomesWithScores.length < 10) return results

    // Analyze TFC score
    const winningTFC = outcomesWithScores
      .filter((o) => o.pnl > 0)
      .map((o) => (o.decision?.meta as any)?.tfcScore || 0)
    const losingTFC = outcomesWithScores
      .filter((o) => o.pnl < 0)
      .map((o) => (o.decision?.meta as any)?.tfcScore || 0)

    if (winningTFC.length > 0 && losingTFC.length > 0) {
      const avgWinningTFC = winningTFC.reduce((sum, s) => sum + s, 0) / winningTFC.length
      const avgLosingTFC = losingTFC.reduce((sum, s) => sum + s, 0) / losingTFC.length

      if (avgWinningTFC > avgLosingTFC) {
        results.push({
          parameter: 'minTFCScore',
          currentValue: 0.5,
          recommendedValue: Math.max(0.5, avgLosingTFC + 0.1),
          expectedImprovement: (avgWinningTFC - avgLosingTFC) * 100,
          confidence: Math.min(100, (outcomesWithScores.length / 20) * 100),
          reasoning: `Winning trades have higher TFC scores (${avgWinningTFC.toFixed(2)}) vs losing (${avgLosingTFC.toFixed(2)})`,
        })
      }
    }

    // Analyze Volatility score
    const winningVol = outcomesWithScores
      .filter((o) => o.pnl > 0)
      .map((o) => (o.decision?.meta as any)?.volScore || 0)
    const losingVol = outcomesWithScores
      .filter((o) => o.pnl < 0)
      .map((o) => (o.decision?.meta as any)?.volScore || 0)

    if (winningVol.length > 0 && losingVol.length > 0) {
      const avgWinningVol = winningVol.reduce((sum, s) => sum + s, 0) / winningVol.length
      const avgLosingVol = losingVol.reduce((sum, s) => sum + s, 0) / losingVol.length

      if (avgWinningVol > avgLosingVol) {
        results.push({
          parameter: 'minVolScore',
          currentValue: 0.5,
          recommendedValue: Math.max(0.5, avgLosingVol + 0.1),
          expectedImprovement: (avgWinningVol - avgLosingVol) * 100,
          confidence: Math.min(100, (outcomesWithScores.length / 20) * 100),
          reasoning: `Winning trades have higher volatility scores (${avgWinningVol.toFixed(2)}) vs losing (${avgLosingVol.toFixed(2)})`,
        })
      }
    }

    return results
  }

  /**
   * Batch update signal quality for all recent outcomes
   */
  async batchUpdateSignalQuality(): Promise<{ updated: number; failed: number }> {
    const recentOutcomes = await prisma.tradeOutcome.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        signal: true,
      },
    })

    let updated = 0
    let failed = 0

    for (const outcome of recentOutcomes) {
      if (outcome.signalId) {
        try {
          await this.updateSignalQuality(outcome.signalId, outcome)
          updated++
        } catch (error: any) {
          console.error(`Failed to update signal quality for ${outcome.signalId}:`, error)
          failed++
        }
      }
    }

    return { updated, failed }
  }
}
