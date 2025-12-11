import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    const positions = await prisma.position.findMany({
      where,
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    // Calculate current PnL (simplified - would need real-time price updates)
    const positionsWithPnL = positions.map((pos) => ({
      ...pos,
      // PnL calculation would require current market price
      // For now, return stored values
    }))

    return NextResponse.json({ positions: positionsWithPnL })
  } catch (error: any) {
    console.error('Error fetching positions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

