import { NextRequest, NextResponse } from 'next/server'
import { DecisionEngine } from '@/engine/decisionEngine'
import { ExecutionEngine } from '@/execution/executor'
import { prisma } from '@/lib/prisma'

/**
 * Reprocess unprocessed or failed signals
 * Useful for retrying signals that failed during initial processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signalId = body.signalId

    if (!signalId) {
      return NextResponse.json({ error: 'signalId is required' }, { status: 400 })
    }

    // Get signal from database
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
    })

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    // Parse signal from rawPayload
    const signalData = signal.rawPayload as any

    // Process signal through decision engine
    const decisionEngine = new DecisionEngine()
    const decision = await decisionEngine.processSignal(signalData, signal.strategyId || undefined, signal.id)

    // Execute decision if not IGNORE
    if (decision.action !== 'IGNORE') {
      const storedDecision = await prisma.decision.findFirst({
        where: {
          signalId: signal.id,
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
        }
      }
    }

    return NextResponse.json({
      success: true,
      signalId: signal.id,
      decision: decision.action,
      reasoning: decision.reasoning,
    })
  } catch (error: any) {
    console.error('Reprocess error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Get all unprocessed signals
 */
export async function GET() {
  try {
    const unprocessedSignals = await prisma.signal.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      count: unprocessedSignals.length,
      signals: unprocessedSignals.map((s) => ({
        id: s.id,
        type: s.type,
        signal: s.signal,
        timestamp: s.timestamp,
        createdAt: s.createdAt,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching unprocessed signals:', error)
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    )
  }
}

