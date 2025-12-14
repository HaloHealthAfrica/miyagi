import type { AuditDecisionRecord, AuditEventRecord } from '@/trading/audit/types'

export interface AuditLogStore {
  appendEvent(record: AuditEventRecord, ttlSeconds: number): Promise<void>
  appendDecision(record: AuditDecisionRecord, ttlSeconds: number): Promise<void>
  listEvents(limit: number): Promise<AuditEventRecord[]>
  listDecisions(limit: number): Promise<AuditDecisionRecord[]>
}


