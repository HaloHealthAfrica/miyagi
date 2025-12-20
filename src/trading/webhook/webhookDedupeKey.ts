import type { MarketEvent } from '@/trading/types'

/**
 * Deterministic dedupe key for eligible (ACCEPTED) events.
 *
 * Per spec:
 * strategy_id|event|symbol|timeframe|normalized_timestamp|(direction?)|(source_context?)
 */
export function buildTradingViewDedupeKey(input: {
  strategyId: string
  event: MarketEvent
  normalizedTimestampSeconds: number
}): string {
  const { strategyId, event, normalizedTimestampSeconds } = input

  const direction = event.direction && event.direction !== 'NONE' ? event.direction : undefined
  const raw = (event.payload ?? {}) as any
  const sourceContext = typeof raw.source_context === 'string' ? raw.source_context : typeof raw.sourceContext === 'string' ? raw.sourceContext : undefined

  return [
    strategyId,
    event.event,
    event.symbol,
    event.timeframe,
    String(normalizedTimestampSeconds),
    ...(direction ? [direction] : []),
    ...(sourceContext ? [sourceContext] : []),
  ].join('|')
}


