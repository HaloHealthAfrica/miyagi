import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check database connection first
    await prisma.$connect().catch(() => {
      // Connection might already be established
    })

    const riskLimit = await prisma.riskLimit.findFirst({
      where: { enabled: true },
    })

    const riskState = await prisma.riskState.findFirst({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      riskLimit: riskLimit || null,
      riskState: riskState || null,
      executionEnabled: process.env.EXECUTION_ENABLED === 'true',
      primaryBroker: process.env.PRIMARY_BROKER || 'tradier',
      basePositionSize: parseInt(process.env.BASE_POSITION_SIZE || '2'),
    })
  } catch (error: any) {
    console.error('Error fetching config:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch config',
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

