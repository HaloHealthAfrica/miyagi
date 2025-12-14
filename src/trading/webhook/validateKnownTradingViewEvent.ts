import type { MarketEvent, StrategyId } from '@/trading/types'

export type KnownEventValidation =
  | { ok: true }
  | {
      ok: false
      status: 400
      reason: string
    }

const COMMON_ACTIONABLE = new Set(['TRADE_SIGNAL'])
const FAILED2CHAIN_ACTIONABLE = new Set(['failed_2u', 'failed_2d', 'chain_2u_f2u_2d', 'FAILED_2U', 'FAILED_2D', 'CHAIN_2U_F2U_2D'])
const FAILED2CHAIN_INFO = new Set(['SWING_ARMED', 'SWING_PRE_CLOSE', 'SWING_CONFIRMED', 'ORB_LOCKED', 'HTF_PERMISSION_CHANGE'])

const SPX_INFO = new Set(['EMA_RIBBON_FLIP', 'PHASE_TRANSITION', 'MSS', 'BOS', 'FVG_CREATED', 'ORB_BREAK', 'SESSION'])

// If/when MIYAGI strategy is fully implemented here, move its known INFO events into this set.
const MIYAGI_INFO = new Set(['EMA_RIBBON_FLIP', 'PHASE_TRANSITION', 'MSS', 'BOS', 'FVG_CREATED', 'ORB_BREAK', 'SESSION'])

export function validateKnownTradingViewEvent(strategyId: StrategyId, evt: MarketEvent): KnownEventValidation {
  if (evt.signalType === 'ACTIONABLE') {
    const actionableOk =
      COMMON_ACTIONABLE.has(evt.event) || (strategyId === 'FAILED2CHAIN' && FAILED2CHAIN_ACTIONABLE.has(evt.event))
    if (!actionableOk) {
      return { ok: false, status: 400, reason: `Unknown ACTIONABLE event: ${evt.event}` }
    }
    return { ok: true }
  }

  if (strategyId === 'FAILED2CHAIN') {
    if (!FAILED2CHAIN_INFO.has(evt.event)) {
      return { ok: false, status: 400, reason: `Unknown INFO event: ${evt.event}` }
    }
    return { ok: true }
  }

  const allowed = strategyId === 'SPX' ? SPX_INFO : MIYAGI_INFO
  if (!allowed.has(evt.event)) {
    return { ok: false, status: 400, reason: `Unknown INFO event: ${evt.event}` }
  }
  return { ok: true }
}




