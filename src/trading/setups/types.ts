import type { StrategyId } from '@/trading/types'
import type { GateResult } from '@/trading/decision/types'

export type SetupStatus = 'WAITING' | 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'STOPPED' | 'INVALID'

export type StrategySetupRecord = {
  id: string
  symbol: string
  strategyId: StrategyId
  eventType: string
  direction: 'LONG' | 'SHORT'
  timeframe: string
  status: SetupStatus
  entry: number
  stop: number
  tp1: number
  tp2: number
  confidence?: number
  expiryHint?: string
  optionSuggested?: string
  reasonCodes: string[]
  gates: GateResult[]
  createdAt: number
  updatedAt: number
}


