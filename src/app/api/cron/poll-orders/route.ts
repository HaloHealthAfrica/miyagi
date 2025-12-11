import { NextRequest, NextResponse } from 'next/server'
import { OrderPoller } from '@/services/orderPoller'

// This endpoint polls pending orders and updates their status
// Recommended: Call every 30 seconds - 2 minutes during market hours
export async function GET(request: NextRequest) {
  // Optional: Add authentication header check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orderPoller = new OrderPoller()
    const result = await orderPoller.pollPendingOrders()

    return NextResponse.json({
      success: true,
      message: 'Order polling completed',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Order polling error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request)
}

