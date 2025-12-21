export type MiyagiLiquidityEvent = 'LIQUIDITY_DEMAND_STRAT_LONG' | 'LIQUIDITY_SUPPLY_STRAT_SHORT'

export type MiyagiSide = 'LONG' | 'SHORT'

export type MiyagiPattern = '2-1-2' | '3-1-2' | 'FAILED_2' | 'UNKNOWN'

export type MiyagiSignal = {
  signalId: string
  receivedAt: number

  symbol: string
  timeframe: string
  side: MiyagiSide
  event: MiyagiLiquidityEvent

  tvConfidence: number

  liquidity: {
    sellSideSwept: boolean
    buySideSwept: boolean
    sweepSources: string[]
  }

  zone: {
    type: 'demand' | 'supply'
    htfTf: string
  }

  intent: {
    displacement: boolean
  }

  strat: {
    pattern: MiyagiPattern
  }
}

export type RejectionReasonCode =
  | 'ZONE_SIDE_MISMATCH'
  | 'TV_CONFIDENCE_TOO_LOW'
  | 'ZONE_INVALIDATED'
  | 'LATE_ENTRY'
  | 'HTF_STRUCTURE_BROKEN'
  | 'OPTIONS_NOT_AVAILABLE'
  | 'OPTIONS_ILLQUID'
  | 'DELTA_TOO_LOW'
  | 'DATA_UNAVAILABLE'
  | 'INVALID_PAYLOAD'

export type MarketContextSnapshot = {
  now: number
  quote?: {
    last: number
    bid?: number
    ask?: number
  }
  htf?: {
    timeframe: string
    candles: Array<{ t: string; o: number; h: number; l: number; c: number }>
  }
  ltf?: {
    timeframe: string
    candles: Array<{ t: string; o: number; h: number; l: number; c: number }>
  }
  // Snapshot of the option contract selected/validated for feasibility checks.
  // (Used only for audit/debug; execution/risk logic remains unchanged.)
  options?: {
    provider: 'tradier'
    selected?: SelectedOptionSnapshot
    checkedCount?: number
  }
  scoring?: {
    tvConfidence: number
    marketAlignmentBonus: number
    volatilityPenalty: number
    liquidityPenalty: number
    finalScore: number
  }
}

export type SelectedOptionSnapshot = {
  symbol: string
  strike: number
  type: 'call' | 'put'
  bid: number
  ask: number
  mid: number
  spreadPct: number
  volume: number
  openInterest: number
  delta?: number
  iv?: number
}


