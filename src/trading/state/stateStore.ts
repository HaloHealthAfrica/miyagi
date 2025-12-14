import type { TradingState } from '@/trading/state/types'

export type StoredState<T> = {
  value: T
  updatedAt: number
}

export interface StateStore {
  get(key: string): Promise<TradingState | null>
  set(key: string, state: TradingState, ttlSeconds: number): Promise<void>
}


