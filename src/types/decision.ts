// Decision engine output types

export type DecisionAction = 'OPEN_POSITION' | 'ADD_POSITION' | 'ADJUST_RISK' | 'IGNORE'
export type Direction = 'LONG' | 'SHORT'
export type InstrumentType = 'OPTION' | 'STOCK'
export type Broker = 'tradier' | 'alpaca'

export interface Decision {
  action: DecisionAction
  symbol: string
  direction: Direction
  instrumentType: InstrumentType
  broker: Broker
  strike?: number
  side: 'BUY' | 'SELL'
  quantity: number
  meta: {
    sourceSignal: string
    tf?: string
    riskMult?: number
    scannerBias?: Record<string, 'BULL' | 'BEAR' | 'NEUTRAL'>
    tfcScore?: number
    volScore?: number
    [key: string]: any
  }
  reasoning?: string
}

export type PositionState = 'FLAT' | 'LONG' | 'SHORT'

