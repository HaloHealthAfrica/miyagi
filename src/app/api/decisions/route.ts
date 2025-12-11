import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check database connection first
    await prisma.$connect().catch(() => {
      // Connection might already be established
    })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')

    const where: any = {}
    if (action) {
      where.action = action
    }

    const decisions = await prisma.decision.findMany({
      where,
      include: {
        signal: true,
        orders: true,
        positions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ decisions })
  } catch (error: any) {
    console.error('Error fetching decisions:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch decisions',
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

