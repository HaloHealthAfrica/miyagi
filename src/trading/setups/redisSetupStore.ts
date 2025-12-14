import type { Redis } from '@upstash/redis'
import type { SetupStore } from '@/trading/setups/setupStore'
import type { StrategySetupRecord } from '@/trading/setups/types'

/**
 * Redis setup store:
 * - per (strategyId,symbol) we keep a capped list of JSON records
 * - also keep a "latest" key for fast reads
 */
export class RedisSetupStore implements SetupStore {
  constructor(private redis: Redis) {}

  async upsertSetup(record: StrategySetupRecord, ttlSeconds: number): Promise<void> {
    const listKey = listKeyFor(record.symbol, record.strategyId)
    const latestKey = latestKeyFor(record.symbol, record.strategyId)

    await this.redis.set(latestKey, record, { ex: ttlSeconds })
    await this.redis.lpush(listKey, JSON.stringify(record))
    await this.redis.ltrim(listKey, 0, 199)
    await this.redis.expire(listKey, ttlSeconds)
  }

  async getLatest(symbol: string, strategyId: string): Promise<StrategySetupRecord | null> {
    const v = await this.redis.get<StrategySetupRecord>(latestKeyFor(symbol, strategyId))
    return v ?? null
  }

  async list(symbol: string, strategyId: string, limit: number): Promise<StrategySetupRecord[]> {
    const n = Math.max(1, Math.min(200, limit))
    const items = await this.redis.lrange<string>(listKeyFor(symbol, strategyId), 0, n - 1)
    return items.map((s) => JSON.parse(s) as StrategySetupRecord)
  }
}

function listKeyFor(symbol: string, strategyId: string) {
  return `setups:${String(strategyId).toUpperCase()}:${String(symbol).toUpperCase()}`
}

function latestKeyFor(symbol: string, strategyId: string) {
  return `setups:latest:${String(strategyId).toUpperCase()}:${String(symbol).toUpperCase()}`
}


