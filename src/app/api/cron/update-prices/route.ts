import { NextRequest, NextResponse } from 'next/server'
import { PriceUpdater } from '@/services/priceUpdater'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

// This endpoint can be called by external cron services or Vercel Cron
// Recommended: Call every 1-5 minutes during market hours
export async function GET(request: NextRequest) {
  // Optional: Add authentication header check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Best-effort rate limit (mostly to avoid accidental loops)
  const ip = getClientIp(request)
  const rl = rateLimit(`cron:update-prices:${ip}`, Number(process.env.CRON_RL_LIMIT || 120), Number(process.env.CRON_RL_WINDOW_MS || 60_000))
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const priceUpdater = new PriceUpdater()
    const result = await priceUpdater.updateAllPositions()

    return NextResponse.json({
      success: true,
      message: 'Price update completed',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Price update error:', error)
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

