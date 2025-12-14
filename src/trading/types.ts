export type SignalType = 'INFO' | 'ACTIONABLE'

export type Direction = 'LONG' | 'SHORT' | 'NONE'

export type Session = 'RTH' | 'ETH'

export type OrbInfo = {
  high?: number
  low?: number
  /** Which side broke, if provided by TradingView indicator */
  broke?: 'HIGH' | 'LOW'
}

export type FvgInfo = {
  high?: number
  low?: number
}

export type StructureInfo = {
  kind: 'MSS' | 'BOS'
  price?: number
  swing?: 'HIGH' | 'LOW'
}

export type MarketEvent = {
  /** Original TradingView "event" field. Ex: "EMA_RIBBON_FLIP", "TRADE_SIGNAL" */
  event: string
  signalType: SignalType
  symbol: string
  timeframe: string
  direction?: Direction
  confidence?: number
  confluence?: number
  /**
   * INFO-only typed fields (best-effort parsed).
   * These do NOT replace payload; they exist to make state updates + debugging safer and easier.
   */
  session?: Session
  ribbonState?: string
  phase?: string
  orb?: OrbInfo
  fvg?: FvgInfo
  structure?: StructureInfo
  /**
   * Full TradingView payload preserved verbatim. We never strip unknown fields.
   * This enables audit/debug and future feature extraction.
   */
  payload: Record<string, any>
  /** Epoch milliseconds */
  timestamp: number
}

export type StrategyId = 'MIYAGI' | 'SPX' | 'FAILED2CHAIN'


