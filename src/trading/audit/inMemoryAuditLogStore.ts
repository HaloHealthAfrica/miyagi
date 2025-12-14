import type { AuditLogStore } from '@/trading/audit/auditLogStore'
import type { AuditDecisionRecord, AuditEventRecord } from '@/trading/audit/types'

type Timed<T> = { value: T; expiresAt: number }

/**
 * MVP audit store: in-memory ring buffer with TTL.
 * Works in single-instance dev; use Redis store for real persistence.
 */
export class InMemoryAuditLogStore implements AuditLogStore {
  private events: Timed<AuditEventRecord>[] = []
  private decisions: Timed<AuditDecisionRecord>[] = []
  private maxItems: number

  constructor(opts?: { maxItems?: number }) {
    this.maxItems = opts?.maxItems ?? 2000
  }

  async appendEvent(record: AuditEventRecord, ttlSeconds: number): Promise<void> {
    this.compact()
    this.events.unshift({ value: structuredClone(record), expiresAt: Date.now() + ttlSeconds * 1000 })
    if (this.events.length > this.maxItems) this.events.length = this.maxItems
  }

  async appendDecision(record: AuditDecisionRecord, ttlSeconds: number): Promise<void> {
    this.compact()
    this.decisions.unshift({ value: structuredClone(record), expiresAt: Date.now() + ttlSeconds * 1000 })
    if (this.decisions.length > this.maxItems) this.decisions.length = this.maxItems
  }

  async listEvents(limit: number): Promise<AuditEventRecord[]> {
    this.compact()
    return this.events.slice(0, limit).map((e) => structuredClone(e.value))
  }

  async listDecisions(limit: number): Promise<AuditDecisionRecord[]> {
    this.compact()
    return this.decisions.slice(0, limit).map((d) => structuredClone(d.value))
  }

  private compact() {
    const now = Date.now()
    this.events = this.events.filter((e) => e.expiresAt > now)
    this.decisions = this.decisions.filter((d) => d.expiresAt > now)
  }
}


