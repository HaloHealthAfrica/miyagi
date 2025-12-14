import type { StrategyId } from '@/trading/types'
import type { MarketEvent } from '@/trading/types'
import type { TradingState } from '@/trading/state/types'
import type { DecisionRecord } from '@/trading/decision/types'

export type AuditEventRecord = {
  id: string
  strategyId: StrategyId
  receivedAt: number
  raw: Record<string, any>
  normalized: MarketEvent
}

export type AuditDecisionRecord = {
  id: string
  strategyId: StrategyId
  decidedAt: number
  eventId: string
  decision: DecisionRecord
  stateAfter?: TradingState
}


