import type { StrategySetupRecord } from '@/trading/setups/types'

export interface SetupStore {
  upsertSetup(record: StrategySetupRecord, ttlSeconds: number): Promise<void>
  getLatest(symbol: string, strategyId: string): Promise<StrategySetupRecord | null>
  list(symbol: string, strategyId: string, limit: number): Promise<StrategySetupRecord[]>
}


