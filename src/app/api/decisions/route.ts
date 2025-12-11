import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

