import { prisma } from '@/lib/prisma'
import { DecisionEngine } from '@/engine/decisionEngine'
import { ExecutionEngine } from '@/execution/executor'

export type JobType = 'PROCESS_SIGNAL'
export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'

export interface EnqueueJobInput {
  type: JobType
  payload: any
  priority?: number
  maxAttempts?: number
  nextRunAt?: Date
}

export class JobQueue {
  async enqueue(input: EnqueueJobInput) {
    return prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload as any,
        priority: input.priority ?? 0,
        maxAttempts: input.maxAttempts ?? 5,
        nextRunAt: input.nextRunAt ?? new Date(),
        status: 'PENDING',
      },
    })
  }

  /**
   * Claim up to `limit` jobs atomically (Postgres).
   * Uses a single UPDATE..WHERE id IN (SELECT .. FOR UPDATE SKIP LOCKED) RETURNING * pattern.
   */
  async claim(limit: number, workerId: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      UPDATE "Job"
      SET "status" = 'RUNNING',
          "lockedAt" = NOW(),
          "lockedBy" = $2,
          "updatedAt" = NOW()
      WHERE "id" IN (
        SELECT "id"
        FROM "Job"
        WHERE "status" = 'PENDING'
          AND "nextRunAt" <= NOW()
          AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '5 minutes')
        ORDER BY "priority" DESC, "createdAt" ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
      `,
      limit,
      workerId
    )
    return rows || []
  }

  async succeed(jobId: string, result?: any) {
    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        result: (result ?? null) as any,
        error: null,
        lockedAt: null,
        lockedBy: null,
      },
    })
  }

  async fail(jobId: string, error: string, attempts: number, maxAttempts: number) {
    const willRetry = attempts + 1 < maxAttempts
    const backoffSeconds = Math.min(60 * 30, Math.pow(2, attempts) * 10) // 10s,20s,40s... capped
    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: willRetry ? 'PENDING' : 'FAILED',
        attempts: { increment: 1 },
        error,
        lockedAt: null,
        lockedBy: null,
        nextRunAt: willRetry ? new Date(Date.now() + backoffSeconds * 1000) : new Date(),
      },
    })
  }
}

export class JobProcessor {
  private queue = new JobQueue()

  async processBatch(limit: number, workerId: string) {
    const claimed = await this.queue.claim(limit, workerId)
    let succeeded = 0
    let failed = 0

    for (const job of claimed) {
      try {
        const res = await this.processOne(job)
        await this.queue.succeed(job.id, res)
        succeeded++
      } catch (e: any) {
        await this.queue.fail(job.id, e?.message || 'Job failed', job.attempts || 0, job.maxAttempts || 5)
        failed++
      }
    }

    return { claimed: claimed.length, succeeded, failed }
  }

  private async processOne(job: any) {
    if (job.type === 'PROCESS_SIGNAL') {
      const { signalId, execute } = job.payload || {}
      if (!signalId) throw new Error('Missing payload.signalId')

      const signal = await prisma.signal.findUnique({ where: { id: signalId } })
      if (!signal) throw new Error(`Signal ${signalId} not found`)

      const decisionEngine = new DecisionEngine()
      const decision = await decisionEngine.processSignal(signal.rawPayload as any, signal.strategyId || undefined, signal.id)

      let execution: any = null
      if (execute && decision.action !== 'IGNORE') {
        const storedDecision = await prisma.decision.findFirst({
          where: { signalId: signal.id, action: decision.action },
          orderBy: { createdAt: 'desc' },
          take: 1,
        })
        if (storedDecision) {
          const executor = new ExecutionEngine()
          await executor.executeDecision(decision as any, storedDecision.id)
          execution = { executed: true, decisionId: storedDecision.id }
        }
      }

      return { decision, execution }
    }

    throw new Error(`Unknown job type: ${job.type}`)
  }
}


