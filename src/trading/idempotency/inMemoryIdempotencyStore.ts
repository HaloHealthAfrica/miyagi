import type { IdempotencyStore } from '@/trading/idempotency/idempotencyStore'

type Entry = { expiresAt: number }

/**
 * MVP idempotency store: in-memory map with TTL.
 * Works for single-instance dev; use Redis for real persistence.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private map = new Map<string, Entry>()

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    this.compact()
    const now = Date.now()
    const existing = this.map.get(key)
    if (existing && existing.expiresAt > now) return false
    this.map.set(key, { expiresAt: now + ttlSeconds * 1000 })
    return true
  }

  private compact() {
    const now = Date.now()
    for (const [k, v] of this.map.entries()) {
      if (v.expiresAt <= now) this.map.delete(k)
    }
  }
}




