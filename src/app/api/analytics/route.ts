import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/services/analytics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reportType = searchParams.get('type') || 'metrics' // 'metrics' | 'signal-quality' | 'full'

    const timeframe = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    }

    const analyticsService = new AnalyticsService()

    if (reportType === 'full') {
      const report = await analyticsService.generateReport(timeframe)
      return NextResponse.json(report)
    } else if (reportType === 'signal-quality') {
      const signalQuality = await analyticsService.analyzeSignalQuality(timeframe)
      return NextResponse.json({ signalQuality, timeframe })
    } else {
      const metrics = await analyticsService.calculateMetrics(timeframe)
      return NextResponse.json({ metrics, timeframe })
    }
  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to calculate analytics',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

