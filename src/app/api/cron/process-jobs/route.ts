import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { JobProcessor } from '@/services/jobQueue'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const rl = await rateLimit(
    `cron:process-jobs:${ip}`,
    Number(process.env.CRON_RL_LIMIT || 60),
    Number(process.env.CRON_RL_WINDOW_MS || 60_000)
  )
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 20)
    const workerId = process.env.WORKER_ID || `vercel-${process.env.VERCEL_REGION || 'local'}`
    const processor = new JobProcessor()
    const result = await processor.processBatch(Math.min(100, Math.max(1, limit)), workerId)
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('process-jobs error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}


