import { z } from 'zod'
import type { Direction, MarketEvent, Session, SignalType, StructureInfo } from '@/trading/types'
import { tradingViewWebhookSchema, type TradingViewWebhookPayload } from '@/trading/webhook/tradingViewSchema'
import { normalizeEpochSeconds } from '@/trading/webhook/normalizeEpoch'

const directionSchema = z.enum(['LONG', 'SHORT', 'NONE'])
const sessionSchema = z.enum(['RTH', 'ETH'])
const swingSchema = z.enum(['HIGH', 'LOW'])
const brokeSchema = z.enum(['HIGH', 'LOW'])
const structureDirectionSchema = z.enum(['LONG', 'SHORT'])

/**
 * Validation + normalization only. No decision logic here.
 */
export function normalizeTradingViewWebhook(raw: unknown): {
  raw: TradingViewWebhookPayload
  normalized: MarketEvent
} {
  const parsed = tradingViewWebhookSchema.parse(raw)

  const signalType = normalizeSignalType(parsed)

  const direction = normalizeOptionalDirection(parsed)
  // Some strategies (e.g. Liquidity Strat) send `confidence_score` instead of `confidence`
  const confidence = normalizeOptionalNumber(parsed, 'confidence') ?? normalizeOptionalNumber(parsed, 'confidence_score')
  const confluence = normalizeOptionalNumber(parsed, 'confluence')
  const session = normalizeOptionalSession(parsed)
  const ribbonState = normalizeOptionalString(parsed, ['ribbon_state', 'ribbonState', 'state'])
  const phase = normalizeOptionalString(parsed, ['phase', 'to_phase', 'next_phase', 'phase_state'])
  const orb = normalizeOptionalOrb(parsed)
  const fvg = normalizeOptionalFvg(parsed)
  const structure = normalizeOptionalStructure(parsed)

  // Canonical Failed2/Chain structure direction lives at payload.structure.direction
  const canonicalDir = normalizeOptionalCanonicalStructureDirection(parsed)

  const tsRes = normalizeEpochSeconds((parsed as any).timestamp)
  if (!tsRes.ok) {
    throw new Error(`Invalid timestamp: ${tsRes.error}`)
  }

  return {
    raw: parsed,
    normalized: {
      event: parsed.event,
      signalType,
      symbol: parsed.symbol,
      timeframe: parsed.timeframe,
      direction: direction ?? canonicalDir,
      confidence,
      confluence,
      session,
      ribbonState,
      phase,
      orb,
      fvg,
      structure,
      payload: parsed,
      timestamp: tsRes.seconds,
    },
  }
}

function normalizeOptionalDirection(payload: Record<string, any>): Direction | undefined {
  // Primary: explicit TradingView direction field (legacy/canonical)
  const candidate = payload.direction
  if (candidate != null) {
    const res = directionSchema.safeParse(candidate)
    if (res.success) return res.data as Direction
  }

  // Secondary: Liquidity Strat uses `side` instead of `direction`
  const side = payload.side
  if (side === 'LONG' || side === 'SHORT' || side === 'NONE') return side as Direction

  return undefined
}

function normalizeOptionalCanonicalStructureDirection(payload: Record<string, any>): Direction | undefined {
  const candidate = payload?.structure?.direction
  if (candidate == null) return undefined
  const res = structureDirectionSchema.safeParse(candidate)
  return res.success ? (res.data as Exclude<Direction, 'NONE'>) : undefined
}

function normalizeOptionalNumber(payload: Record<string, any>, field: string): number | undefined {
  const v = payload[field]
  if (v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function normalizeOptionalString(payload: Record<string, any>, fields: string[]): string | undefined {
  for (const f of fields) {
    const v = payload[f]
    if (typeof v === 'string' && v.trim() !== '') return v
  }
  return undefined
}

function normalizeOptionalSession(payload: Record<string, any>): Session | undefined {
  const candidate = payload.session ?? payload.session_state ?? payload.market_session
  if (candidate == null) return undefined
  const res = sessionSchema.safeParse(candidate)
  return res.success ? (res.data as Session) : undefined
}

function normalizeOptionalOrb(payload: Record<string, any>): MarketEvent['orb'] | undefined {
  const high = normalizeOptionalNumber(payload, 'orb_high') ?? normalizeOptionalNumber(payload, 'orbHigh')
  const low = normalizeOptionalNumber(payload, 'orb_low') ?? normalizeOptionalNumber(payload, 'orbLow')
  const broke = brokeSchema.safeParse(payload.orb_broke ?? payload.orbBroke ?? payload.broke).success
    ? (String(payload.orb_broke ?? payload.orbBroke ?? payload.broke) as 'HIGH' | 'LOW')
    : undefined

  if (high == null && low == null && broke == null) return undefined
  return { high, low, broke }
}

function normalizeOptionalFvg(payload: Record<string, any>): MarketEvent['fvg'] | undefined {
  const high = normalizeOptionalNumber(payload, 'fvg_high') ?? normalizeOptionalNumber(payload, 'fvgHigh')
  const low = normalizeOptionalNumber(payload, 'fvg_low') ?? normalizeOptionalNumber(payload, 'fvgLow')
  if (high == null && low == null) return undefined
  return { high, low }
}

function normalizeOptionalStructure(payload: Record<string, any>): StructureInfo | undefined {
  const kindRaw = payload.structure_kind ?? payload.structureKind ?? payload.structure ?? payload.structure_type
  const kind = kindRaw === 'MSS' || kindRaw === 'BOS' ? (kindRaw as StructureInfo['kind']) : undefined
  if (!kind) return undefined

  const price = normalizeOptionalNumber(payload, 'structure_price') ?? normalizeOptionalNumber(payload, 'structurePrice')
  const swingCandidate = payload.structure_swing ?? payload.structureSwing ?? payload.swing
  const swing = swingSchema.safeParse(swingCandidate).success ? (String(swingCandidate) as StructureInfo['swing']) : undefined

  return { kind, price, swing }
}

function normalizeSignalType(payload: Record<string, any>): SignalType {
  // Backward-compatible: honor explicit `signal_type` if present.
  const st = payload.signal_type
  if (st === 'INFO' || st === 'ACTIONABLE') return st

  // Canonical contract: infer deterministically from event name.
  const evt = String(payload.event ?? '')
  const actionable = new Set([
    'TRADE_SIGNAL',
    'FAILED_2U',
    'FAILED_2D',
    'CHAIN_2U_F2U_2D',
    // MIYAGI Liquidity Strat (webhook-driven)
    'LIQUIDITY_DEMAND_STRAT_LONG',
    'LIQUIDITY_SUPPLY_STRAT_SHORT',
  ])
  const info = new Set(['SWING_ARMED', 'SWING_PRE_CLOSE', 'SWING_CONFIRMED', 'ORB_LOCKED', 'HTF_PERMISSION_CHANGE'])

  if (actionable.has(evt)) return 'ACTIONABLE'
  if (info.has(evt)) return 'INFO'

  // Safe default: treat unknown as INFO so it cannot trigger execution.
  return 'INFO'
}


