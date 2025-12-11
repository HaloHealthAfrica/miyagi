import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { JobQueue } from '@/services/jobQueue'
import { ResearchService } from '@/services/research'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('experimentId')
    if (id) {
      const experiment = await prisma.backtestExperiment.findUnique({
        where: { id },
        include: { runs: { orderBy: { createdAt: 'desc' }, take: 200 } },
      })
      if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
      return NextResponse.json({ experiment })
    }

    const experiments = await prisma.backtestExperiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { runs: { take: 0 } as any },
    })
    return NextResponse.json({ experiments })
  } catch (error: any) {
    console.error('research GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch research' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = body?.config
    if (!config?.kind || !config?.name) {
      return NextResponse.json({ error: 'config.kind and config.name required' }, { status: 400 })
    }

    const svc = new ResearchService()
    const experiment = await svc.createExperiment(config)

    const queue = new JobQueue()
    const job = await queue.enqueue({
      type: 'RUN_EXPERIMENT',
      payload: { experimentId: experiment.id },
      dedupeKey: `run-experiment:${experiment.id}`,
      priority: 1,
      maxAttempts: 3,
    })

    return NextResponse.json({ success: true, experimentId: experiment.id, jobId: job.id })
  } catch (error: any) {
    console.error('research POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create research experiment' }, { status: 500 })
  }
}


