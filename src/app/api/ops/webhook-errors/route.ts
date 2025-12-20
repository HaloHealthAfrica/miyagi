import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = process.env.OPS_TOKEN
  if (token) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 100)))

    const rows = await prisma.webhookEvent.findMany({
      where: { status: { in: ['REJECTED', 'ERROR'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        eventId: true,
        traceId: true,
        createdAt: true,
        strategyId: true,
        event: true,
        symbol: true,
        timeframe: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        errorFields: true,
      },
    })

    return NextResponse.json({ items: rows })
  } catch (error: any) {
    console.error('ops webhook-errors error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load webhook errors' }, { status: 500 })
  }
}


