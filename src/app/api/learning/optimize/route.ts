import { NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'

export async function GET() {
  try {
    const learningService = new LearningService()
    const optimizations = await learningService.optimizeDecisionEngine()

    return NextResponse.json({
      optimizations,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Optimization error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to optimize',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

