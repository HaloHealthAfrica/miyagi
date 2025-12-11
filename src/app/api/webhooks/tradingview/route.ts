import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DecisionEngine } from '@/engine/decisionEngine'
import { ExecutionEngine } from '@/execution/executor'
import { TradingViewSignal } from '@/types/tradingview'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { JobQueue } from '@/services/jobQueue'

// Validation schemas
const CoreSignalSchema = z.object({
  type: z.literal('core'),
  direction: z.enum(['long', 'short']),
  signal: z.string(),
  tf: z.string(),
  strike_hint: z.number(),
  risk_mult: z.number(),
  miyagi: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  daily: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  timestamp: z.string(),
})

const RunnerSignalSchema = z.object({
  type: z.literal('runner'),
  direction: z.enum(['long', 'short']),
  signal: z.string(),
  tf: z.string(),
  strike_hint: z.number(),
  risk_mult: z.number(),
  miyagi: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  daily: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  timestamp: z.string(),
})

const ScannerSignalSchema = z.object({
  type: z.literal('scanner'),
  symbol: z.string(),
  new_bias: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  timestamp: z.string(),
})

const TradingViewSignalSchema = z.discriminatedUnion('type', [
  CoreSignalSchema,
  RunnerSignalSchema,
  ScannerSignalSchema,
])

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let signalId: string | null = null
  
  try {
    // Optional auth (recommended in production)
    const expectedSecret = process.env.TV_WEBHOOK_SECRET
    const headerSecret =
      request.headers.get('x-tv-secret') || request.headers.get('x-webhook-secret')

    // TradingView can’t always send custom headers; allow secret inside JSON payload as `secret` too.
    // If a header secret is provided, it must match immediately.
    if (expectedSecret && headerSecret && headerSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit (best-effort)
    const ip = getClientIp(request)
    const rl = await rateLimit(
      `tv-webhook:${ip}`,
      Number(process.env.WEBHOOK_RL_LIMIT || 60),
      Number(process.env.WEBHOOK_RL_WINDOW_MS || 60_000)
    )
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', resetAt: new Date(rl.resetAt).toISOString() },
        { status: 429 }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error('Webhook: Failed to parse JSON body', parseError)
      
      // Save invalid webhook for debugging
      const { prisma } = await import('@/lib/prisma')
      await prisma.signal.create({
        data: {
          type: 'invalid',
          signal: 'parse_error',
          rawPayload: { error: 'Failed to parse JSON', message: parseError.message },
          timestamp: new Date(),
          processed: false,
        },
      }).catch(() => {}) // Don't fail if this fails
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON payload',
          message: parseError.message,
          saved: true, // We saved it for debugging
        },
        { status: 400 }
      )
    }

    // Log incoming webhook
    console.log('📥 Webhook received:', {
      type: body.type,
      timestamp: body.timestamp,
      body: JSON.stringify(body).substring(0, 200),
    })

    // Validate payload
    const validationResult = TradingViewSignalSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.warn('⚠️ Webhook validation failed:', validationResult.error.errors)
      
      // Save invalid webhook for debugging
      const { prisma } = await import('@/lib/prisma')
      try {
        await prisma.$connect().catch(() => {})
        const invalidSignal = await prisma.signal.create({
          data: {
            type: body.type || 'invalid',
            signal: body.signal || 'validation_error',
            rawPayload: body,
            timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
            processed: false,
          },
        })
        signalId = invalidSignal.id
      } catch (dbError: any) {
        console.error('Failed to save invalid webhook:', dbError)
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid payload',
          details: validationResult.error.errors,
          saved: signalId !== null,
          signalId,
        },
        { status: 400 }
      )
    }

    const signal = validationResult.data as TradingViewSignal

    // Secret validation via body (if header wasn’t provided)
    if (expectedSecret && !headerSecret) {
      const bodySecret = body?.secret
      if (bodySecret !== expectedSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Ensure database connection
    const { prisma } = await import('@/lib/prisma')
    await prisma.$connect().catch(() => {
      // Connection might already be established
    })

    // Build idempotency key (prevents duplicates on retries)
    const dedupeKey = JSON.stringify({
      type: signal.type,
      ts: signal.timestamp,
      ...(signal.type === 'scanner'
        ? { symbol: (signal as any).symbol, new_bias: (signal as any).new_bias }
        : {
            direction: (signal as any).direction,
            signal: (signal as any).signal,
            tf: (signal as any).tf,
            strike_hint: (signal as any).strike_hint,
            risk_mult: (signal as any).risk_mult,
          }),
    })

    // STEP 1: Save signal to database FIRST (before processing)
    // This ensures we have a record even if processing fails
    let storedSignal
    try {
      storedSignal = await prisma.signal.create({
        data: {
          type: signal.type,
          direction: 'direction' in signal ? signal.direction : null,
          signal: 'signal' in signal ? signal.signal : 'scanner',
          tf: 'tf' in signal ? signal.tf : null,
          strikeHint: 'strike_hint' in signal ? signal.strike_hint : null,
          riskMult: 'risk_mult' in signal ? signal.risk_mult : null,
          miyagi: 'miyagi' in signal ? signal.miyagi : null,
          daily: 'daily' in signal ? signal.daily : null,
          symbol: 'symbol' in signal ? signal.symbol : null,
          newBias: 'new_bias' in signal ? signal.new_bias : null,
          dedupeKey,
          rawPayload: body as any,
          timestamp: new Date(signal.timestamp),
          processed: false, // Mark as unprocessed initially
        },
      })
    } catch (e: any) {
      // Unique constraint on dedupeKey → treat as idempotent replay
      if (e?.code === 'P2002') {
        const existing = await prisma.signal.findFirst({ where: { dedupeKey } })
        return NextResponse.json({
          success: true,
          duplicate: true,
          signalId: existing?.id || null,
          message: 'Duplicate webhook ignored (idempotent)',
        })
      }
      throw e
    }

    signalId = storedSignal.id

    console.log(`💾 Signal saved to database: ${signalId}`)

    // Phase 6: enqueue processing instead of doing heavy work inline.
    // This prevents serverless timeouts and enables retries/backoff.
    const queue = new JobQueue()
    const job = await queue.enqueue({
      type: 'PROCESS_SIGNAL',
      payload: {
        signalId: storedSignal.id,
        // If you want worker to also execute orders, set execute=true.
        execute: process.env.EXECUTION_ENABLED === 'true',
      },
      priority: 0,
      dedupeKey: `process-signal:${storedSignal.id}`,
      maxAttempts: 5,
    })

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      signalId,
      queued: true,
      jobId: job.id,
      processingTime: `${processingTime}ms`,
    })
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('❌ Webhook error:', {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`,
    })

    // Try to save the error for debugging
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$connect().catch(() => {})
      await prisma.signal.create({
        data: {
          type: 'error',
          signal: 'webhook_error',
          rawPayload: {
            error: error.message,
            stack: error.stack,
          },
          timestamp: new Date(),
          processed: false,
        },
      }).catch(() => {})
    } catch (saveError) {
      console.error('Failed to save error webhook:', saveError)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        signalId,
        processingTime: `${processingTime}ms`,
      },
      { status: 500 }
    )
  }
}

