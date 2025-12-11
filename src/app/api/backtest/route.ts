import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Backtester } from '@/services/backtester'

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get('runId')

    if (runId) {
      const run = await prisma.backtestRun.findUnique({
        where: { id: runId },
        include: {
          trades: {
            orderBy: { exitTime: 'asc' },
            take: 2000,
          },
        },
      })
      if (!run) return NextResponse.json({ error: 'Backtest run not found' }, { status: 404 })
      return NextResponse.json({ run })
    }

    const runs = await prisma.backtestRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { trades: true } } as any,
      },
    })
    return NextResponse.json({ runs })
  } catch (error: any) {
    console.error('Backtest GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch backtests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const symbol = (body.symbol || process.env.DEFAULT_SYMBOL || 'SPX').toString()
    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate/endDate' }, { status: 400 })
    }

    const backtester = new Backtester()
    const { runId } = await backtester.run({
      name: body.name,
      symbol,
      startDate,
      endDate,
      timeframe: body.timeframe,
      stopLossPercent: body.stopLossPercent,
      takeProfitPercent: body.takeProfitPercent,
      maxHoldBars: body.maxHoldBars,
      positionSize: body.positionSize,
      contractMultiplier: body.contractMultiplier,
    })

    const run = await prisma.backtestRun.findUnique({
      where: { id: runId },
      include: {
        trades: { orderBy: { exitTime: 'asc' }, take: 2000 },
      },
    })

    return NextResponse.json({ success: true, run })
  } catch (error: any) {
    console.error('Backtest POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run backtest' },
      { status: 500 }
    )
  }
}


