import type { Redis } from '@upstash/redis'
import type { IdempotencyStore } from '@/trading/idempotency/idempotencyStore'

/**
 * Redis idempotency store using SET NX + TTL.
 * Deterministic behavior:
 * - first claim within TTL returns true
 * - subsequent claims within TTL return false
 */
export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private redis: Redis) {}

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.redis.set(key, '1', { nx: true, ex: ttlSeconds })
    // Upstash returns "OK" when set, null when NX fails.
    return res === 'OK'
  }
}




