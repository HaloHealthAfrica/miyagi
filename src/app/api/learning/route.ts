import { NextRequest, NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'analyze' // 'analyze' | 'optimize' | 'patterns' | 'signal-quality'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const signalId = searchParams.get('signalId')
    const signalPattern = searchParams.get('signal')

    const timeframe = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    }

    const learningService = new LearningService()

    if (action === 'optimize') {
      const results = await learningService.optimizeDecisionEngine()
      return NextResponse.json({ optimizations: results })
    } else if (action === 'patterns') {
      const analysis = await learningService.analyzeOutcomes(timeframe)
      return NextResponse.json({
        winningPatterns: analysis.winningPatterns,
        losingPatterns: analysis.losingPatterns,
        recommendations: analysis.recommendations,
      })
    } else if (action === 'signal-quality') {
      if (!signalId && !signalPattern) {
        return NextResponse.json(
          { error: 'Provide signalId or signal pattern via ?signalId=... or ?signal=...' },
          { status: 400 }
        )
      }

      // If signalId provided, return exact record + computed score.
      if (signalId) {
        const score = await learningService.getSignalQuality(signalId)
        return NextResponse.json({ signalId, score })
      }

      // If pattern provided, compute aggregated success rate across matching signals.
      // (Lightweight: derive from Signal table and SignalQuality table)
      const { prisma } = await import('@/lib/prisma')
      const signals = await prisma.signal.findMany({
        where: { signal: signalPattern || undefined },
        select: { id: true },
        take: 500,
      })
      const ids = signals.map((s) => s.id)
      if (ids.length === 0) return NextResponse.json({ signal: signalPattern, count: 0, avgSuccessRate: 0 })

      const qualities = await prisma.signalQuality.findMany({
        where: { signalId: { in: ids } },
        select: { successRate: true },
      })
      const avgSuccessRate =
        qualities.length > 0
          ? qualities.reduce((sum, q) => sum + (q.successRate || 0), 0) / qualities.length
          : 0
      return NextResponse.json({ signal: signalPattern, count: qualities.length, avgSuccessRate })
    } else {
      // Full analysis
      const analysis = await learningService.analyzeOutcomes(timeframe)
      return NextResponse.json(analysis)
    }
  } catch (error: any) {
    console.error('Learning service error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to analyze outcomes',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Batch update signal quality for recent outcomes
 */
export async function POST(request: NextRequest) {
  try {
    const learningService = new LearningService()
    const result = await learningService.batchUpdateSignalQuality()

    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.updated} signal quality records`,
    })
  } catch (error: any) {
    console.error('Batch update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

