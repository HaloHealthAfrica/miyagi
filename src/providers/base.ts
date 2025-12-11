// Base interfaces for data providers

export interface Quote {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  timestamp: Date
}

export interface OHLC {
  symbol: string
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OHLCParams {
  symbol: string
  timeframe: string // e.g. "1min", "5min", "1day"
  lookback?: number // number of periods
}

export interface OptionsChainParams {
  symbol: string
  expiryFilters?: {
    minDTE?: number
    maxDTE?: number
  }
  moneynessFilters?: {
    minMoneyness?: number // e.g. 0.95 for 5% OTM
    maxMoneyness?: number // e.g. 1.05 for 5% ITM
  }
  side?: 'call' | 'put'
}

export interface OptionContract {
  symbol: string
  strike: number
  expiry: Date
  type: 'call' | 'put'
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  iv?: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
}

export interface OptionsChain {
  symbol: string
  contracts: OptionContract[]
  timestamp: Date
}

export interface OrderParams {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  orderType: 'market' | 'limit' | 'stop'
  limitPrice?: number
  strike?: number
  expiry?: Date
  instrumentType?: 'option' | 'stock'
}

export interface BrokerOrder {
  id: string
  status: 'pending' | 'submitted' | 'filled' | 'partial' | 'cancelled' | 'rejected'
  filledQuantity?: number
  avgFillPrice?: number
  error?: string
}

