import { NextRequest, NextResponse } from 'next/server'
import { LearningService } from '@/services/learning'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const signalId = searchParams.get('signalId')
    const signalPattern = searchParams.get('signal') // Signal pattern (e.g., "core_long")

    if (signalId) {
      const quality = await prisma.signalQuality.findUnique({
        where: { signalId },
        include: {
          signal: true,
        },
      })

      if (!quality) {
        return NextResponse.json({ quality: null, message: 'No quality data for this signal' })
      }

      return NextResponse.json({ quality })
    }

    if (signalPattern) {
      // Get quality for all signals with this pattern
      const qualities = await prisma.signalQuality.findMany({
        where: {
          signal: {
            signal: signalPattern,
          },
        },
        include: {
          signal: true,
        },
        orderBy: { successRate: 'desc' },
        take: 100,
      })

      return NextResponse.json({ qualities })
    }

    // Get all signal qualities
    const allQualities = await prisma.signalQuality.findMany({
      include: {
        signal: true,
      },
      orderBy: { successRate: 'desc' },
      take: 100,
    })

    return NextResponse.json({ qualities: allQualities })
  } catch (error: any) {
    console.error('Signal quality error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch signal quality',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

