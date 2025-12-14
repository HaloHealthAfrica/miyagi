import type { Redis } from '@upstash/redis'
import type { StateIndexStore } from '@/trading/state/stateIndexStore'

/**
 * Redis state index using a sorted set:
 * - member: state key (e.g. "SPX:SPX:5")
 * - score: last touched timestamp (ms)
 *
 * We keep a coarse TTL on the ZSET key to bound retention.
 */
export class RedisStateIndexStore implements StateIndexStore {
  private zsetKey = 'state:index'

  constructor(private redis: Redis) {}

  async record(key: string, ttlSeconds: number): Promise<void> {
    const now = Date.now()
    await this.redis.zadd(this.zsetKey, { score: now, member: key })
    await this.redis.expire(this.zsetKey, ttlSeconds)
  }

  async listRecent(opts: { prefix?: string; limit: number }): Promise<string[]> {
    const limit = Math.max(1, Math.min(500, opts.limit))
    const items = await this.redis.zrange<string[]>(this.zsetKey, 0, limit - 1, { rev: true })
    const prefix = opts.prefix
    if (!prefix) return items
    return items.filter((k) => k.startsWith(prefix))
  }
}




