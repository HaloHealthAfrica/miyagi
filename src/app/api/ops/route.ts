import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = process.env.OPS_TOKEN
  if (token) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const [signals, decisions, orders, positions, outcomes, backtests, latestMetrics] = await Promise.all([
      prisma.signal.count(),
      prisma.decision.count(),
      prisma.order.count(),
      prisma.position.count(),
      prisma.tradeOutcome.count(),
      prisma.backtestRun.count(),
      prisma.performanceMetrics.findMany({ orderBy: { updatedAt: 'desc' }, take: 10 }),
    ])

    return NextResponse.json({
      counts: { signals, decisions, orders, positions, outcomes, backtests },
      performanceMetrics: latestMetrics,
      cronEndpoints: [
        '/api/cron/update-prices',
        '/api/cron/monitor-positions',
        '/api/cron/poll-orders',
        '/api/cron/update-signal-quality',
        '/api/cron/snapshot-metrics',
      ],
      env: {
        hasCronSecret: Boolean(process.env.CRON_SECRET),
        hasWebhookSecret: Boolean(process.env.TV_WEBHOOK_SECRET),
        executionEnabled: process.env.EXECUTION_ENABLED === 'true',
      },
    })
  } catch (error: any) {
    console.error('ops error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load ops' }, { status: 500 })
  }
}


