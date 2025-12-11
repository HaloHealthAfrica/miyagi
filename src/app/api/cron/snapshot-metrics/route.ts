import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/services/analytics'
import { prisma } from '@/lib/prisma'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 sun
  const diff = (day === 0 ? 6 : day - 1) // monday as start
  x.setDate(x.getDate() - diff)
  return x
}

function startOfMonth(d: Date) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const rl = await rateLimit(
    `cron:snapshot-metrics:${ip}`,
    Number(process.env.CRON_RL_LIMIT || 30),
    Number(process.env.CRON_RL_WINDOW_MS || 60_000)
  )
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  try {
    const now = new Date()
    const analytics = new AnalyticsService()

    const windows = [
      { period: 'daily', startDate: startOfDay(now), endDate: now },
      { period: 'weekly', startDate: startOfWeek(now), endDate: now },
      { period: 'monthly', startDate: startOfMonth(now), endDate: now },
      { period: 'all', startDate: new Date(0), endDate: now },
    ] as const

    const upserts = []
    for (const w of windows) {
      const metrics = await analytics.calculateMetrics({ start: w.startDate, end: w.endDate })
      upserts.push(
        prisma.performanceMetrics.upsert({
          where: { period_startDate_endDate: { period: w.period, startDate: w.startDate, endDate: w.endDate } },
          create: {
            period: w.period,
            startDate: w.startDate,
            endDate: w.endDate,
            totalTrades: metrics.totalTrades,
            winningTrades: metrics.winningTrades,
            losingTrades: metrics.losingTrades,
            winRate: metrics.winRate,
            totalPnL: metrics.totalPnL,
            averagePnL: metrics.averagePnL,
            sharpeRatio: metrics.sharpeRatio,
            maxDrawdown: metrics.maxDrawdown,
            profitFactor: metrics.profitFactor,
            metrics: metrics as any,
          },
          update: {
            totalTrades: metrics.totalTrades,
            winningTrades: metrics.winningTrades,
            losingTrades: metrics.losingTrades,
            winRate: metrics.winRate,
            totalPnL: metrics.totalPnL,
            averagePnL: metrics.averagePnL,
            sharpeRatio: metrics.sharpeRatio,
            maxDrawdown: metrics.maxDrawdown,
            profitFactor: metrics.profitFactor,
            metrics: metrics as any,
          },
        })
      )
    }

    const saved = await Promise.all(upserts)

    return NextResponse.json({
      success: true,
      saved: saved.length,
      periods: saved.map((s) => ({ id: s.id, period: s.period, startDate: s.startDate, endDate: s.endDate })),
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('snapshot-metrics error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}


