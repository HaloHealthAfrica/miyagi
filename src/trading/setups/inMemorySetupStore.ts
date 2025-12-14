import type { SetupStore } from '@/trading/setups/setupStore'
import type { StrategySetupRecord } from '@/trading/setups/types'

type Timed<T> = { value: T; expiresAt: number }

export class InMemorySetupStore implements SetupStore {
  private byKey = new Map<string, Timed<StrategySetupRecord[]>>()

  async upsertSetup(record: StrategySetupRecord, ttlSeconds: number): Promise<void> {
    const key = makeKey(record.symbol, record.strategyId)
    const now = Date.now()
    const expiresAt = now + ttlSeconds * 1000
    const existing = this.byKey.get(key)?.value ?? []
    const next = [structuredClone(record), ...existing.filter((r) => r.id !== record.id)].slice(0, 500)
    this.byKey.set(key, { value: next, expiresAt })
  }

  async getLatest(symbol: string, strategyId: string): Promise<StrategySetupRecord | null> {
    this.compact()
    const key = makeKey(symbol, strategyId)
    const list = this.byKey.get(key)?.value ?? []
    return list[0] ? structuredClone(list[0]) : null
  }

  async list(symbol: string, strategyId: string, limit: number): Promise<StrategySetupRecord[]> {
    this.compact()
    const key = makeKey(symbol, strategyId)
    const list = this.byKey.get(key)?.value ?? []
    return list.slice(0, Math.max(1, Math.min(500, limit))).map((r) => structuredClone(r))
  }

  private compact() {
    const now = Date.now()
    for (const [k, v] of this.byKey.entries()) {
      if (v.expiresAt <= now) this.byKey.delete(k)
    }
  }
}

function makeKey(symbol: string, strategyId: string) {
  return `${String(strategyId).toUpperCase()}:${String(symbol).toUpperCase()}`
}


