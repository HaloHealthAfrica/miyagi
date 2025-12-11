import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { JobQueue } from '@/services/jobQueue'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const rl = rateLimit(`cron:enqueue-unprocessed:${ip}`, Number(process.env.CRON_RL_LIMIT || 30), Number(process.env.CRON_RL_WINDOW_MS || 60_000))
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50)
    const signals = await prisma.signal.findMany({
      where: { processed: false, type: { notIn: ['invalid', 'error'] } },
      orderBy: { createdAt: 'asc' },
      take: Math.min(500, Math.max(1, limit)),
    })

    const queue = new JobQueue()
    let enqueued = 0

    for (const s of signals) {
      await queue.enqueue({
        type: 'PROCESS_SIGNAL',
        payload: { signalId: s.id, execute: process.env.EXECUTION_ENABLED === 'true' },
        priority: 0,
      })
      enqueued++
    }

    return NextResponse.json({ success: true, scanned: signals.length, enqueued, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('enqueue-unprocessed-signals error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}


