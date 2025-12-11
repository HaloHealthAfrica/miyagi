import { NextRequest, NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'analyze' // 'analyze' | 'optimize' | 'patterns'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

