import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = process.env.OPS_TOKEN
  if (token) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${token}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const status = request.nextUrl.searchParams.get('status') || undefined
    const type = request.nextUrl.searchParams.get('type') || undefined
    const take = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)))

    const jobs = await prisma.job.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      } as any,
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }, { createdAt: 'desc' }],
      take,
    })

    const counts = await prisma.job.groupBy({
      by: ['status'],
      _count: { _all: true },
    })

    return NextResponse.json({ jobs, counts })
  } catch (error: any) {
    console.error('jobs GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.OPS_TOKEN
  if (token) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${token}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action = body.action

    if (action === 'retry') {
      const jobId = body.jobId
      if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
      const job = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'PENDING',
          nextRunAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          error: null,
        },
      })
      return NextResponse.json({ success: true, job })
    }

    if (action === 'cancel') {
      const jobId = body.jobId
      if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
      const job = await prisma.job.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', lockedAt: null, lockedBy: null },
      })
      return NextResponse.json({ success: true, job })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('jobs POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update job' }, { status: 500 })
  }
}


