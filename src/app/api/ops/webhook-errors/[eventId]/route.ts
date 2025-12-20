import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, ctx: { params: { eventId: string } }) {
  const token = process.env.OPS_TOKEN
  if (token) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const eventId = ctx.params.eventId
    const row = await prisma.webhookEvent.findUnique({
      where: { eventId },
      select: {
        eventId: true,
        traceId: true,
        dedupeKey: true,
        createdAt: true,
        strategyId: true,
        event: true,
        symbol: true,
        timeframe: true,
        timestamp: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        errorFields: true,
        rawPayload: true,
        normalizedPayload: true,
      },
    })

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ item: row })
  } catch (error: any) {
    console.error('ops webhook-error detail error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load webhook error detail' }, { status: 500 })
  }
}


