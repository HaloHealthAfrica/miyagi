// TradingView webhook payload types

export interface CoreSignal {
  type: 'core'
  direction: 'long' | 'short'
  signal: string // e.g. "core_long", "core_short"
  tf: string // timeframe
  strike_hint: number
  risk_mult: number
  miyagi: 'BULL' | 'BEAR' | 'NEUTRAL'
  daily: 'BULL' | 'BEAR' | 'NEUTRAL'
  timestamp: string
}

export interface RunnerSignal {
  type: 'runner'
  direction: 'long' | 'short'
  signal: string // e.g. "runner_322_long"
  tf: string
  strike_hint: number
  risk_mult: number
  miyagi: 'BULL' | 'BEAR' | 'NEUTRAL'
  daily: 'BULL' | 'BEAR' | 'NEUTRAL'
  timestamp: string
}

export interface ScannerSignal {
  type: 'scanner'
  symbol: string
  new_bias: 'BULL' | 'BEAR' | 'NEUTRAL'
  timestamp: string
}

export type TradingViewSignal = CoreSignal | RunnerSignal | ScannerSignal

