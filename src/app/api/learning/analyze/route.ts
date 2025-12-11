import { NextRequest, NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const timeframe = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    }

    const learningService = new LearningService()
    const analysis = await learningService.analyzeOutcomes(timeframe)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Learning analysis error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to analyze outcomes',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

