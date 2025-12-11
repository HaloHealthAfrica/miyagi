import { NextRequest, NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'

/**
 * Scheduled job to batch update signal quality
 * Recommended: Run daily or weekly
 */
export async function GET(request: NextRequest) {
  // Optional: Add authentication header check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const learningService = new LearningService()
    const result = await learningService.batchUpdateSignalQuality()

    return NextResponse.json({
      success: true,
      message: 'Signal quality update completed',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Signal quality update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request)
}

