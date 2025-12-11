import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DecisionEngine } from '@/engine/decisionEngine'
import { ExecutionEngine } from '@/execution/executor'
import { TradingViewSignal } from '@/types/tradingview'

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

    // Ensure database connection
    const { prisma } = await import('@/lib/prisma')
    await prisma.$connect().catch(() => {
      // Connection might already be established
    })

    // Process signal through decision engine (this saves the signal)
    const decisionEngine = new DecisionEngine()
    const decision = await decisionEngine.processSignal(signal)

    // Get the stored signal ID from the decision engine
    const storedSignal = await prisma.signal.findFirst({
      where: {
        type: signal.type,
        timestamp: new Date(signal.timestamp),
      },
      orderBy: { createdAt: 'desc' },
    })
    
    if (storedSignal) {
      signalId = storedSignal.id
    }

    // Execute decision if not IGNORE
    if (decision.action !== 'IGNORE') {
      // Get the decision ID from the database (it was just created)
      const storedDecision = await prisma.decision.findFirst({
        where: {
          signalId: storedSignal?.id,
          action: decision.action,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })

      if (storedDecision) {
        try {
          const executionEngine = new ExecutionEngine()
          await executionEngine.executeDecision(decision, storedDecision.id)
        } catch (execError: any) {
          console.error('Execution error (non-fatal):', execError)
          // Don't fail the webhook if execution fails
        }
      }
    }

    const processingTime = Date.now() - startTime

    console.log('✅ Webhook processed:', {
      signalId,
      type: signal.type,
      decision: decision.action,
      processingTime: `${processingTime}ms`,
    })

    return NextResponse.json({
      success: true,
      signalId,
      signal: signal.type,
      decision: decision.action,
      reasoning: decision.reasoning,
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

