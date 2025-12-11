import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get latest scanner state for each symbol
    const symbols = ['SPY', 'QQQ', 'ES1!', 'NQ1!', 'BTC']

    const scannerState = await Promise.all(
      symbols.map(async (symbol) => {
        const latest = await prisma.scannerEvent.findFirst({
          where: { symbol },
          orderBy: { timestamp: 'desc' },
        })

        return {
          symbol,
          bias: latest?.newBias || 'NEUTRAL',
          timestamp: latest?.timestamp || null,
        }
      })
    )

    return NextResponse.json({ scanner: scannerState })
  } catch (error: any) {
    console.error('Error fetching scanner state:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

