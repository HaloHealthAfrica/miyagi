import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check database connection first
    await prisma.$connect().catch(() => {
      // Connection might already be established
    })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status.toUpperCase()
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
        executions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ orders })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orders',
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

