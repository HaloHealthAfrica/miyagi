import type { Failed2ChainNormalized } from '@/trading/failed2chain/normalizeFailed2ChainPayload'

export type RiskBox = {
  entry: number
  stop: number
  tp1: number
  tp2: number
  r: number
}

export function buildRiskBox(payload: Failed2ChainNormalized): RiskBox {
  const entry = payload.price
  const direction = payload.side

  const orbQualified = Boolean(payload.orb?.qualified)
  const orbHigh = payload.orb?.high
  const orbLow = payload.orb?.low

  let stop: number | undefined
  if (direction === 'LONG') {
    if (orbQualified && typeof orbLow === 'number') stop = orbLow
    else stop = payload.refs?.priorLow ?? payload.refs?.signalLow ?? payload.strikes?.extraLow
  } else {
    if (orbQualified && typeof orbHigh === 'number') stop = orbHigh
    else stop = payload.refs?.priorHigh ?? payload.refs?.signalHigh ?? payload.strikes?.extraHigh
  }

  // As a last resort, create a deterministic 0.25% stop so we always produce a setup card.
  if (typeof stop !== 'number' || !Number.isFinite(stop) || stop === entry) {
    const pct = 0.0025
    stop = direction === 'LONG' ? entry * (1 - pct) : entry * (1 + pct)
  }

  const r = Math.abs(entry - stop)
  const tp1 = direction === 'LONG' ? entry + r : entry - r
  const tp2 = direction === 'LONG' ? entry + 2 * r : entry - 2 * r

  return { entry, stop, tp1, tp2, r }
}

export function suggestOption(payload: Failed2ChainNormalized, nowNyMinutes: number): { expiryHint?: string; optionSuggested?: string } {
  const isChain = payload.event === 'chain_2u_f2u_2d'

  // Expiry hint rules (deterministic based on input timestamp -> nowNyMinutes chosen by caller)
  let expiryHint: string | undefined
  if (isChain) {
    expiryHint = nowNyMinutes >= 13 * 60 + 30 ? 'WEEKLY_OR_1DTE' : '1DTE'
  } else {
    expiryHint = nowNyMinutes <= 11 * 60 + 30 ? '0DTE_ALLOWED' : 'WEEKLY'
  }

  // Fallback option suggestion uses strike hints only.
  const strikes = payload.strikes
  const strike = payload.side === 'LONG' ? strikes?.itm ?? strikes?.atm : strikes?.itm ?? strikes?.atm
  const type = payload.optionType ?? (payload.side === 'LONG' ? 'CALL' : 'PUT')
  const optionSuggested = strike ? `${payload.symbol.toUpperCase()} ${strike}${type === 'CALL' ? 'C' : 'P'}` : undefined

  return { expiryHint, optionSuggested }
}


