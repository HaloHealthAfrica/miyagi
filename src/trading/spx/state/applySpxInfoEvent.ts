import type { MarketEvent } from '@/trading/types'
import type { TradingState } from '@/trading/state/types'

/**
 * SPX INFO events update state only. No trade decisions are made here.
 * Deterministic: same input event + prior state => same next state.
 */
export function applySpxInfoEvent(input: { state: TradingState; event: MarketEvent; now: number }): TradingState {
  const { state, event, now } = input
  const next: TradingState = structuredClone(state)

  // Session must be updated only by INFO event content (no time-derived assumptions).
  if (event.session) next.session = event.session

  // Track last seen time for each INFO event type (useful for debug/cooldowns)
  next.cooldowns[event.event] = event.timestamp

  switch (event.event) {
    case 'EMA_RIBBON_FLIP': {
      const prevBias = next.bias
      const dir = event.direction
      if (dir === 'LONG') next.bias = 'LONG'
      else if (dir === 'SHORT') next.bias = 'SHORT'
      else next.bias = 'NEUTRAL'

      if (event.ribbonState) next.ribbon.state = event.ribbonState
      next.ribbon.lastFlipDirection = dir
      next.ribbon.lastFlipAt = event.timestamp

      if (prevBias !== next.bias) next.notes.unshift(`Bias changed: ${prevBias} -> ${next.bias} via EMA_RIBBON_FLIP`)
      break
    }

    case 'PHASE_TRANSITION': {
      if (event.phase) next.notes.unshift(`Phase transition: ${event.phase}`)
      break
    }

    case 'MSS':
    case 'BOS':
    case 'FVG_CREATED':
    case 'ORB_BREAK':
    case 'SESSION': {
      // Keep INFO event notes for audit/debug iteration.
      next.notes.unshift(`INFO: ${event.event}`)
      if (event.event === 'SESSION' && event.session) next.notes.unshift(`Session set: ${event.session}`)
      break
    }

    default: {
      // Known-event validation should prevent this.
      next.notes.unshift(`INFO (unhandled): ${event.event}`)
      break
    }
  }

  next.updatedAt = now
  if (next.notes.length > 50) next.notes.length = 50
  return next
}


