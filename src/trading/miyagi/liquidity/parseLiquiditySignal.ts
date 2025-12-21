import { z } from 'zod'
import type { MarketEvent } from '@/trading/types'
import type { MiyagiLiquidityEvent, MiyagiPattern, MiyagiSide, MiyagiSignal } from './types'

const allowedEventSchema = z.enum(['LIQUIDITY_DEMAND_STRAT_LONG', 'LIQUIDITY_SUPPLY_STRAT_SHORT'])
const sideSchema = z.enum(['LONG', 'SHORT'])
const zoneTypeSchema = z.enum(['demand', 'supply'])

const payloadSchema = z
  .object({
    source: z.literal('tradingview'),
    version: z.string().min(1),
    strategy_id: z.literal('MIYAGI'),
    event: allowedEventSchema,
    side: sideSchema,
    symbol: z.string().min(1),
    timeframe: z.string().min(1),
    timestamp: z.number().finite(),
    confidence_score: z.number().finite(),
    liquidity: z.object({
      sell_side_swept: z.boolean(),
      buy_side_swept: z.boolean(),
      sweep_sources: z.string().optional().default(''),
    }),
    zone: z.object({
      type: zoneTypeSchema,
      htf_tf: z.string().min(1),
    }),
    intent: z.object({
      displacement: z.boolean(),
    }),
    strat: z.object({
      pattern: z.string().optional(),
    }),
  })
  .passthrough()

function normalizePattern(raw: unknown): MiyagiPattern {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '2-1-2') return '2-1-2'
  if (s === '3-1-2') return '3-1-2'
  if (s === 'FAILED_2' || s === 'FAILED2' || s === 'FAILED-2') return 'FAILED_2'
  return 'UNKNOWN'
}

function splitSweepSources(csv: string): string[] {
  const raw = (csv ?? '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function parseMiyagiLiquiditySignal(input: {
  event: MarketEvent
  eventId: string
  receivedAt: number
}): { ok: true; signal: MiyagiSignal } | { ok: false; error: string; errorFields?: string[] } {
  const res = payloadSchema.safeParse(input.event.payload)
  if (!res.success) {
    return {
      ok: false,
      error: res.error.message,
      errorFields: res.error.issues.map((i) => i.path.join('.')).filter(Boolean),
    }
  }

  const p = res.data
  const side = p.side as MiyagiSide
  const eventName = p.event as MiyagiLiquidityEvent

  // Invariants / sanity: event <-> side <-> zone.type
  const sideMatchesEvent =
    (eventName === 'LIQUIDITY_DEMAND_STRAT_LONG' && side === 'LONG') ||
    (eventName === 'LIQUIDITY_SUPPLY_STRAT_SHORT' && side === 'SHORT')
  if (!sideMatchesEvent) {
    return { ok: false, error: `side/event mismatch: side=${side} event=${eventName}`, errorFields: ['side', 'event'] }
  }

  const zoneType = p.zone.type
  const zoneMatchesSide = (side === 'LONG' && zoneType === 'demand') || (side === 'SHORT' && zoneType === 'supply')
  if (!zoneMatchesSide) {
    return { ok: false, error: `zone/side mismatch: side=${side} zone.type=${zoneType}`, errorFields: ['zone.type', 'side'] }
  }

  const tvConfidence = Number(p.confidence_score)
  if (!Number.isFinite(tvConfidence)) {
    return { ok: false, error: 'Invalid confidence_score', errorFields: ['confidence_score'] }
  }

  return {
    ok: true,
    signal: {
      signalId: input.eventId,
      receivedAt: input.receivedAt,
      symbol: String(p.symbol),
      timeframe: String(p.timeframe),
      side,
      event: eventName,
      tvConfidence,
      liquidity: {
        sellSideSwept: Boolean(p.liquidity.sell_side_swept),
        buySideSwept: Boolean(p.liquidity.buy_side_swept),
        sweepSources: splitSweepSources(String(p.liquidity.sweep_sources ?? '')),
      },
      zone: { type: zoneType, htfTf: String(p.zone.htf_tf) },
      intent: { displacement: Boolean(p.intent.displacement) },
      strat: { pattern: normalizePattern(p.strat?.pattern) },
    },
  }
}


