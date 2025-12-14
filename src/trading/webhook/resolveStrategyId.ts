import type { MarketEvent, StrategyId } from '@/trading/types'

/**
 * Strategy resolution is intentionally deterministic and explicit.
 * Priority:
 * 1) payload.strategy_id / payload.strategyId (TradingView-provided)
 * 2) symbol heuristic (fallback)
 *
 * If you want strictness, set `TV_STRATEGY_ID_REQUIRED=true` and always provide strategy_id.
 */
export function resolveStrategyId(event: MarketEvent): StrategyId {
  const raw = event.payload ?? {}
  const candidate = (raw.strategy_id ?? raw.strategyId ?? raw.strategy) as unknown
  if (candidate === 'MIYAGI' || candidate === 'SPX' || candidate === 'StratFailed2ChainSwing') return candidate
  // Backward-compatible alias
  if (candidate === 'FAILED2CHAIN') return 'StratFailed2ChainSwing'

  const strict = process.env.TV_STRATEGY_ID_REQUIRED === '1' || process.env.TV_STRATEGY_ID_REQUIRED === 'true'
  if (strict) return 'MIYAGI'

  // Event-name routing for the Failed2ChainSwing strategy.
  if (
    event.event === 'failed_2u' ||
    event.event === 'failed_2d' ||
    event.event === 'chain_2u_f2u_2d' ||
    event.event === 'FAILED_2U' ||
    event.event === 'FAILED_2D' ||
    event.event === 'CHAIN_2U_F2U_2D' ||
    event.event === 'SWING_ARMED' ||
    event.event === 'SWING_PRE_CLOSE' ||
    event.event === 'SWING_CONFIRMED'
  )
    return 'StratFailed2ChainSwing'

  const symbol = (event.symbol || '').toUpperCase()
  if (symbol.includes('SPX')) return 'SPX'
  return 'MIYAGI'
}




