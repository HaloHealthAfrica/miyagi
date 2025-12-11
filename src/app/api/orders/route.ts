import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

