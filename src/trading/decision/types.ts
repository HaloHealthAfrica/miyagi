import type { ExecutionMode } from '@/trading/config'
import type { MarketEvent } from '@/trading/types'
import type { StrategyId } from '@/trading/types'

export type DecisionOutcome = 'EXECUTE_PAPER' | 'EXECUTE_LIVE' | 'REJECT'

export type GateResult = {
  gate: string
  pass: boolean
  detail?: string
}

export type TradePlan = {
  symbol: string
  timeframe: string
  direction: 'LONG' | 'SHORT'
  qty: number
  entry: number
  stop: number
  targets: number[]
  riskPerContractUsd: number
  estimatedRiskUsd: number
}

export type DecisionRecord = {
  strategyId: StrategyId
  event: MarketEvent
  outcome: DecisionOutcome
  executionMode: ExecutionMode
  /** deterministic breakdown for trust/debug */
  gates: GateResult[]
  /** top-level reason summary (also deterministic) */
  reason: string
  tradePlan?: TradePlan
}


