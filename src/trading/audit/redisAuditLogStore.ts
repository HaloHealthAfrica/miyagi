import type { Redis } from '@upstash/redis'
import type { AuditLogStore } from '@/trading/audit/auditLogStore'
import type { AuditDecisionRecord, AuditEventRecord } from '@/trading/audit/types'

/**
 * Redis-backed audit log using capped lists + TTL.
 * Notes:
 * - We use a single list for events and decisions; each item is a JSON string.
 * - We set TTL on the list keys; retention is coarse but deterministic.
 */
export class RedisAuditLogStore implements AuditLogStore {
  private eventsKey = 'audit:events'
  private decisionsKey = 'audit:decisions'

  constructor(private redis: Redis) {}

  async appendEvent(record: AuditEventRecord, ttlSeconds: number): Promise<void> {
    await this.redis.lpush(this.eventsKey, JSON.stringify(record))
    await this.redis.ltrim(this.eventsKey, 0, 999)
    await this.redis.expire(this.eventsKey, ttlSeconds)
  }

  async appendDecision(record: AuditDecisionRecord, ttlSeconds: number): Promise<void> {
    await this.redis.lpush(this.decisionsKey, JSON.stringify(record))
    await this.redis.ltrim(this.decisionsKey, 0, 999)
    await this.redis.expire(this.decisionsKey, ttlSeconds)
  }

  async listEvents(limit: number): Promise<AuditEventRecord[]> {
    const items = await this.redis.lrange<string>(this.eventsKey, 0, Math.max(0, limit - 1))
    return items.map((s) => JSON.parse(s) as AuditEventRecord)
  }

  async listDecisions(limit: number): Promise<AuditDecisionRecord[]> {
    const items = await this.redis.lrange<string>(this.decisionsKey, 0, Math.max(0, limit - 1))
    return items.map((s) => JSON.parse(s) as AuditDecisionRecord)
  }
}


