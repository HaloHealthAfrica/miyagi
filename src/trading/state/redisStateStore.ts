import type { Redis } from '@upstash/redis'
import type { StateStore } from '@/trading/state/stateStore'
import type { TradingState } from '@/trading/state/types'

export class RedisStateStore implements StateStore {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<TradingState | null> {
    const v = await this.redis.get<TradingState>(key)
    return v ?? null
  }

  async set(key: string, state: TradingState, ttlSeconds: number): Promise<void> {
    // Upstash supports EX via `ex` option.
    await this.redis.set(key, state, { ex: ttlSeconds })
  }
}


