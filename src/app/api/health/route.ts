import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    
    // Check if tables exist
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Signal', 'Decision', 'Position', 'Order')
      LIMIT 1
    `.catch(() => null)
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      tablesExist: tableCheck !== null,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

