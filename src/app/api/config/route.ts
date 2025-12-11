import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

