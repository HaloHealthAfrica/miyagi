import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Test endpoint to verify webhook functionality
export async function POST(request: NextRequest) {
  try {
    await prisma.$connect().catch(() => {})

    const body = await request.json()
    const testType = body.type || 'test'

    // Create a test signal
    const testSignal = await prisma.signal.create({
      data: {
        type: testType,
        signal: 'test_webhook',
        rawPayload: {
          ...body,
          test: true,
          receivedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        processed: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Test webhook received and saved',
      signalId: testSignal.id,
      signal: testSignal,
    })
  } catch (error: any) {
    console.error('Test webhook error:', error)
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

// GET endpoint to check webhook status
export async function GET() {
  try {
    await prisma.$connect().catch(() => {})

    const recentSignals = await prisma.signal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        signal: true,
        timestamp: true,
        processed: true,
        createdAt: true,
      },
    })

    const stats = {
      total: await prisma.signal.count(),
      processed: await prisma.signal.count({ where: { processed: true } }),
      unprocessed: await prisma.signal.count({ where: { processed: false } }),
      recent: recentSignals,
    }

    return NextResponse.json({
      success: true,
      webhookEndpoint: '/api/webhooks/tradingview',
      testEndpoint: '/api/webhooks/test',
      stats,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

