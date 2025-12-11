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
    const type = searchParams.get('type')

    const where: any = {}
    if (type) {
      where.type = type
    }

    const signals = await prisma.signal.findMany({
      where,
      include: {
        decisions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ signals })
  } catch (error: any) {
    console.error('Error fetching signals:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch signals',
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

