import { failed2ChainPayloadSchema, type Failed2ChainPayload } from '@/trading/failed2chain/failed2ChainSchema'
import { canonicalFailed2ChainSchema, type CanonicalFailed2ChainPayload } from '@/trading/failed2chain/canonicalFailed2ChainSchema'

export type Failed2ChainNormalized = {
  event: 'failed_2u' | 'failed_2d' | 'chain_2u_f2u_2d' | 'SWING_ARMED' | 'SWING_PRE_CLOSE' | 'SWING_CONFIRMED'
  symbol: string
  price: number
  side: 'LONG' | 'SHORT'
  optionType?: 'CALL' | 'PUT'
  dteDays?: number
  strikes?: Failed2ChainPayload['strikes']
  htf?: any
  orb?: Failed2ChainPayload['orb']
  confidence?: number
  vix?: number
  refs?: {
    priorHigh?: number
    priorLow?: number
    signalHigh?: number
    signalLow?: number
  }
}

/**
 * Accepts either the legacy payload (failed_2u/failed_2d/chain_2u_f2u_2d)
 * OR the canonical envelope payload (FAILED_2U/FAILED_2D/CHAIN_2U_F2U_2D + nested blocks).
 *
 * Returns a deterministic normalized shape that the strategy logic consumes.
 */
export function normalizeFailed2ChainPayload(payload: Record<string, any>): Failed2ChainNormalized {
  const canonical = canonicalFailed2ChainSchema.safeParse(payload)
  if (canonical.success) return fromCanonical(canonical.data)

  const legacy = failed2ChainPayloadSchema.parse(payload)
  return fromLegacy(legacy)
}

function fromLegacy(p: Failed2ChainPayload): Failed2ChainNormalized {
  return {
    event: p.event,
    symbol: p.symbol,
    price: p.price,
    side: p.side,
    optionType: p.optionType,
    dteDays: p.dteDays,
    strikes: p.strikes,
    htf: p.htf,
    orb: p.orb,
    confidence: p.confidence,
    vix: p.vix,
  }
}

function fromCanonical(p: CanonicalFailed2ChainPayload): Failed2ChainNormalized {
  const mapEvent = (evt: CanonicalFailed2ChainPayload['event']): Failed2ChainNormalized['event'] => {
    if (evt === 'FAILED_2U') return 'failed_2u'
    if (evt === 'FAILED_2D') return 'failed_2d'
    if (evt === 'CHAIN_2U_F2U_2D') return 'chain_2u_f2u_2d'
    return evt
  }

  const price = p.price?.last
  const direction = p.structure?.direction

  // For canonical state-only swing alerts, we still normalize (but these are INFO at ingestion layer).
  // If direction is absent, default to LONG for a stable shape (it will be ignored downstream for swing alerts).
  const side = direction === 'SHORT' ? 'SHORT' : 'LONG'

  return {
    event: mapEvent(p.event),
    symbol: p.symbol,
    price: typeof price === 'number' ? price : Number.NaN,
    side,
    optionType: p.optionsHint?.type,
    dteDays: p.optionsHint?.dteDays,
    strikes: p.optionsHint?.strikes,
    htf: p.htf,
    orb: p.orb,
    confidence: p.confidence,
    vix: p.vix,
    refs: p.structure?.refs
      ? {
          priorHigh: p.structure.refs.priorHigh,
          priorLow: p.structure.refs.priorLow,
          signalHigh: p.structure.refs.signalHigh,
          signalLow: p.structure.refs.signalLow,
        }
      : undefined,
  }
}


