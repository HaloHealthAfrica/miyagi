import type { Direction, StrategyId } from '@/trading/types'
import type { Session } from '@/trading/common/time'

export type Bias = 'LONG' | 'SHORT' | 'NEUTRAL'

export type RibbonState = {
  state?: string
  lastFlipDirection?: Direction
  lastFlipAt?: number
}

export type DailyRiskState = {
  /** NY date key YYYY-MM-DD */
  date: string
  tradeCount: number
  riskUsedUsd: number
}

export type OpenPosition = {
  id: string
  strategyId: StrategyId
  symbol: string
  timeframe: string
  direction: Exclude<Direction, 'NONE'>
  qty: number
  entry: number
  stop: number
  targets: number[]
  openedAt: number
  mode: 'paper' | 'live'
  status: 'OPEN' | 'CLOSED'
}

export type TradingState = {
  strategyId: StrategyId
  symbol: string
  timeframe: string
  bias: Bias
  ribbon: RibbonState
  /** Prefer updating via INFO events; may be absent early in lifecycle */
  session?: Session
  /** Last processed timestamp per event type */
  cooldowns: Record<string, number>
  openPositions: OpenPosition[]
  lastActionableSignalAt?: number
  daily: DailyRiskState
  /** last state update time */
  updatedAt: number
  /** for audit/debug */
  notes: string[]
}

export function makeStateKey(strategyId: StrategyId, symbol: string, timeframe: string) {
  return `${strategyId}:${symbol}:${timeframe}`.toUpperCase()
}

export function makeDefaultState(input: {
  strategyId: StrategyId
  symbol: string
  timeframe: string
  nyDateKey: string
  now: number
}): TradingState {
  return {
    strategyId: input.strategyId,
    symbol: input.symbol,
    timeframe: input.timeframe,
    bias: 'NEUTRAL',
    ribbon: {},
    cooldowns: {},
    openPositions: [],
    daily: { date: input.nyDateKey, tradeCount: 0, riskUsedUsd: 0 },
    updatedAt: input.now,
    notes: [],
  }
}


