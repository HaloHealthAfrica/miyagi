import { NextResponse } from 'next/server'
import { validateKnownTradingViewEvent } from '@/trading/webhook/validateKnownTradingViewEvent'
import { normalizeTradingViewWebhook } from '@/trading/webhook/normalizeTradingViewWebhook'
import { normalizeEpochSeconds } from '@/trading/webhook/normalizeEpoch'
import { buildTradingViewDedupeKey } from '@/trading/webhook/webhookDedupeKey'
import { uuidv7 } from '@/lib/ids'
import { prisma } from '@/lib/prisma'
import { JobQueue } from '@/services/jobQueue'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const receivedAtMs = Date.now()

  // Non-negotiable: always ACK 200. Any errors are recorded in DB and visible via Admin Error Queue.
  const traceId = req.headers.get('x-request-id') || req.headers.get('x-vercel-id') || uuidv7(receivedAtMs)
  const eventId = uuidv7(receivedAtMs)

  // We need the raw body even if JSON parsing fails.
  const rawText = await req.text().catch(() => '')

  let rawPayload: any = null
  let parsedJson: any = null

  try {
    parsedJson = rawText ? JSON.parse(rawText) : null
    rawPayload = parsedJson
  } catch (e: any) {
    rawPayload = {
      _parseError: String(e?.message ?? e),
      _rawText: rawText,
    }

    await prisma.webhookEvent.create({
      data: {
        eventId,
        traceId,
        dedupeKey: `ERROR|JSON_PARSE|${eventId}`,
        rawPayload,
        normalizedPayload: Prisma.JsonNull,
        strategyId: null,
        event: null,
        symbol: null,
        timeframe: null,
        timestamp: null,
        status: 'ERROR',
        errorCode: 'JSON_PARSE',
        errorMessage: String(e?.message ?? e),
        errorFields: [],
        createdAt: new Date(receivedAtMs),
      },
    }).catch(() => {
      // Never fail the ACK due to a logging/persistence issue.
    })

    return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'ERROR' })
  }

  // Optional shared secret (header preferred; TradingView sometimes can’t set custom headers).
  const expectedSecret = process.env.TV_WEBHOOK_SECRET
  const headerSecret = req.headers.get('x-tv-secret') || req.headers.get('x-webhook-secret')
  const bodySecret = parsedJson?.secret
  if (expectedSecret) {
    const provided = headerSecret || bodySecret
    if (!provided || provided !== expectedSecret) {
      await prisma.webhookEvent
        .create({
          data: {
            eventId,
            traceId,
            dedupeKey: `REJECTED|UNAUTHORIZED|${eventId}`,
            rawPayload,
            normalizedPayload: Prisma.JsonNull,
            strategyId: null,
            event: null,
            symbol: null,
            timeframe: null,
            timestamp: null,
            status: 'REJECTED',
            errorCode: 'UNAUTHORIZED',
            errorMessage: 'Missing or invalid TV webhook secret',
            errorFields: ['secret'],
            createdAt: new Date(receivedAtMs),
          },
        })
        .catch(() => {})

      return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'REJECTED' })
    }
  }

  // Base envelope validation (treat webhooks as data, not commands).
  const errorFields: string[] = []
  const source = parsedJson?.source
  const version = parsedJson?.version
  const strategyIdRaw = parsedJson?.strategy_id ?? parsedJson?.strategyId
  const eventName = parsedJson?.event
  const symbol = parsedJson?.symbol
  const timeframe = parsedJson?.timeframe
  const timestampInput = parsedJson?.timestamp

  if (source !== 'tradingview') errorFields.push('source')
  if (typeof version !== 'string' || version.trim() === '') errorFields.push('version')
  if (typeof strategyIdRaw !== 'string' || strategyIdRaw.trim() === '') errorFields.push('strategy_id')
  if (typeof eventName !== 'string' || eventName.trim() === '') errorFields.push('event')
  if (typeof symbol !== 'string' || symbol.trim() === '') errorFields.push('symbol')
  if (typeof timeframe !== 'string' || timeframe.trim() === '') errorFields.push('timeframe')

  const tsRes = normalizeEpochSeconds(timestampInput)
  if (!tsRes.ok) errorFields.push('timestamp')

  const knownStrategyId =
    strategyIdRaw === 'MIYAGI' || strategyIdRaw === 'SPX' || strategyIdRaw === 'StratFailed2ChainSwing' || strategyIdRaw === 'FAILED2CHAIN'
      ? (strategyIdRaw === 'FAILED2CHAIN' ? 'StratFailed2ChainSwing' : strategyIdRaw)
      : null

  if (!knownStrategyId) errorFields.push('strategy_id')

  // If base validation fails, persist as REJECTED and return 200.
  if (errorFields.length > 0 || !tsRes.ok) {
    await prisma.webhookEvent
      .create({
        data: {
          eventId,
          traceId,
          dedupeKey: `REJECTED|BASE_VALIDATION|${eventId}`,
          rawPayload,
          normalizedPayload: Prisma.JsonNull,
          strategyId: knownStrategyId,
          event: typeof eventName === 'string' ? eventName : null,
          symbol: typeof symbol === 'string' ? symbol : null,
          timeframe: typeof timeframe === 'string' ? timeframe : null,
          timestamp: tsRes.ok ? tsRes.seconds : null,
          status: 'REJECTED',
          errorCode: 'BASE_VALIDATION',
          errorMessage: 'Missing/invalid required TradingView fields',
          errorFields,
          createdAt: new Date(receivedAtMs),
        },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'REJECTED' })
  }

  // Strategy-agnostic normalization (still no execution / business logic here).
  let normalizedPayload: any = null
  let normalizedEvent: any = null
  try {
    const parsed = normalizeTradingViewWebhook(parsedJson)
    normalizedPayload = parsed.normalized
    normalizedEvent = parsed.normalized
  } catch (e: any) {
    await prisma.webhookEvent
      .create({
        data: {
          eventId,
          traceId,
          dedupeKey: `REJECTED|SCHEMA_VALIDATION|${eventId}`,
          rawPayload,
          normalizedPayload: Prisma.JsonNull,
          strategyId: knownStrategyId,
          event: String(eventName),
          symbol: String(symbol),
          timeframe: String(timeframe),
          timestamp: tsRes.seconds,
          status: 'REJECTED',
          errorCode: 'SCHEMA_VALIDATION',
          errorMessage: String(e?.message ?? e),
          errorFields: [],
          createdAt: new Date(receivedAtMs),
        },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'REJECTED' })
  }

  // Known event validation (reject unknown events, but never drop the webhook).
  const known = validateKnownTradingViewEvent(knownStrategyId as any, normalizedEvent)
  if (!known.ok) {
    await prisma.webhookEvent
      .create({
        data: {
          eventId,
          traceId,
          dedupeKey: `REJECTED|UNKNOWN_EVENT|${eventId}`,
          rawPayload,
          normalizedPayload,
          strategyId: knownStrategyId,
          event: normalizedEvent.event,
          symbol: normalizedEvent.symbol,
          timeframe: normalizedEvent.timeframe,
          timestamp: tsRes.seconds,
          status: 'REJECTED',
          errorCode: 'UNKNOWN_EVENT',
          errorMessage: known.reason,
          errorFields: ['event'],
          createdAt: new Date(receivedAtMs),
        },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'REJECTED' })
  }

  const dedupeKey = buildTradingViewDedupeKey({
    strategyId: knownStrategyId,
    event: normalizedEvent,
    normalizedTimestampSeconds: tsRes.seconds,
  })

  // Persist BEFORE dispatch. Dedupe is implemented via a separate table so duplicates are still stored.
  let finalStatus: 'ACCEPTED' | 'DUPLICATE' = 'ACCEPTED'
  let duplicateOf: string | null = null
  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          eventId,
          traceId,
          dedupeKey,
          rawPayload,
          normalizedPayload,
          strategyId: knownStrategyId,
          event: normalizedEvent.event,
          symbol: normalizedEvent.symbol,
          timeframe: normalizedEvent.timeframe,
          timestamp: tsRes.seconds,
          status: 'ACCEPTED',
          errorCode: null,
          errorMessage: null,
          errorFields: [],
          createdAt: new Date(receivedAtMs),
        },
      })

      try {
        await tx.webhookDedupe.create({
          data: {
            dedupeKey,
            firstEventId: eventId,
            createdAt: new Date(receivedAtMs),
          },
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          finalStatus = 'DUPLICATE'
          const existing = await tx.webhookDedupe.findUnique({ where: { dedupeKey } })
          duplicateOf = existing?.firstEventId ?? null

          await tx.webhookEvent.update({
            where: { eventId },
            data: {
              status: 'DUPLICATE',
              errorCode: 'DUPLICATE',
              errorMessage: duplicateOf ? `Duplicate of ${duplicateOf}` : 'Duplicate webhook (dedupeKey already seen)',
            },
          })
        } else {
          throw e
        }
      }

      return { eventId }
    })

    void created
  } catch (e: any) {
    await prisma.webhookEvent
      .create({
        data: {
          eventId,
          traceId,
          dedupeKey: `ERROR|PERSISTENCE|${eventId}`,
          rawPayload,
          normalizedPayload,
          strategyId: knownStrategyId,
          event: normalizedEvent.event,
          symbol: normalizedEvent.symbol,
          timeframe: normalizedEvent.timeframe,
          timestamp: tsRes.seconds,
          status: 'ERROR',
          errorCode: 'PERSISTENCE',
          errorMessage: String(e?.message ?? e),
          errorFields: [],
          createdAt: new Date(receivedAtMs),
        },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true, event_id: eventId, trace_id: traceId, status: 'ERROR' })
  }

  // Dispatch async (non-blocking) AFTER persistence. Only ACCEPTED events are dispatched.
  let jobId: string | null = null
  if (finalStatus === 'ACCEPTED') {
    try {
      const queue = new JobQueue()
      const job = await queue.enqueue({
        type: 'PROCESS_WEBHOOK_EVENT',
        payload: { eventId },
        priority: 0,
        dedupeKey: `process-webhook:${eventId}`,
        maxAttempts: 10,
      })
      jobId = job.id
    } catch {
      // Enqueue failures should not break ingestion; event remains persisted and can be replayed from DB.
    }
  }

  return NextResponse.json({
    ok: true,
    event_id: eventId,
    trace_id: traceId,
    dedupe_key: dedupeKey,
    status: finalStatus,
    duplicate_of: duplicateOf,
    queued: finalStatus === 'ACCEPTED' ? Boolean(jobId) : false,
    job_id: jobId,
  })
}




