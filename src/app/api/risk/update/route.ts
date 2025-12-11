import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { maxPositions, maxDailyLoss, maxRiskPerTrade, maxRunnersPerCore } = body

    const riskLimit = await prisma.riskLimit.findFirst({
      where: { enabled: true },
    })

    if (riskLimit) {
      await prisma.riskLimit.update({
        where: { id: riskLimit.id },
        data: {
          maxPositions: maxPositions || riskLimit.maxPositions,
          maxDailyLoss: maxDailyLoss || riskLimit.maxDailyLoss,
          maxRiskPerTrade: maxRiskPerTrade || riskLimit.maxRiskPerTrade,
          maxRunnersPerCore: maxRunnersPerCore || riskLimit.maxRunnersPerCore,
        },
      })
    } else {
      await prisma.riskLimit.create({
        data: {
          name: 'default',
          maxPositions: maxPositions || 5,
          maxDailyLoss: maxDailyLoss || 1000,
          maxRiskPerTrade: maxRiskPerTrade || 500,
          maxRunnersPerCore: maxRunnersPerCore || 2,
          enabled: true,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating risk settings:', error)
    return NextResponse.json(
      { error: 'Failed to update risk settings', message: error.message },
      { status: 500 }
    )
  }
}

