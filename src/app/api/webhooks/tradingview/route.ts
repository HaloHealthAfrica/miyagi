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
  try {
    const body = await request.json()

    // Validate payload
    const validationResult = TradingViewSignalSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const signal = validationResult.data as TradingViewSignal

    // Process signal through decision engine
    const decisionEngine = new DecisionEngine()
    const decision = await decisionEngine.processSignal(signal)

    // Execute decision if not IGNORE
    if (decision.action !== 'IGNORE') {
      // Get the decision ID from the database (it was just created)
      const { prisma } = await import('@/lib/prisma')
      const storedDecision = await prisma.decision.findFirst({
        where: {
          symbol: decision.symbol,
          action: decision.action,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })

      if (storedDecision) {
        const executionEngine = new ExecutionEngine()
        await executionEngine.executeDecision(decision, storedDecision.id)
      }
    }

    return NextResponse.json({
      success: true,
      signal: signal.type,
      decision: decision.action,
      reasoning: decision.reasoning,
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

