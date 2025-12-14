import type { StrategyConfig } from '@/trading/config'
import { FAILED2CHAIN_CONFIG, SPX_CONFIG } from '@/trading/config'
import type { AuditLogStore } from '@/trading/audit/auditLogStore'
import type { AuditDecisionRecord, AuditEventRecord } from '@/trading/audit/types'
import type { IdempotencyStore } from '@/trading/idempotency/idempotencyStore'
import type { DecisionRecord, GateResult } from '@/trading/decision/types'
import type { StateIndexStore } from '@/trading/state/stateIndexStore'
import type { StateStore } from '@/trading/state/stateStore'
import { makeDefaultState, makeStateKey, type TradingState } from '@/trading/state/types'
import type { MarketEvent, StrategyId } from '@/trading/types'
import { sha256Hex } from '@/trading/common/hash'
import { stableStringify } from '@/trading/common/stableStringify'
import { getNyDateKey } from '@/trading/common/time'
import { routeExecution } from '@/trading/execution/executionRouter'
import { decideSpxTradeSignal } from '@/trading/spx/decision/decideSpxTradeSignal'
import { applySpxInfoEvent } from '@/trading/spx/state/applySpxInfoEvent'
import { decideFailed2Chain } from '@/trading/failed2chain/decideFailed2Chain'

export type ProcessWebhookInput = {
  strategyId: StrategyId
  raw: Record<string, any>
  normalized: MarketEvent
  receivedAt: number
  stores: {
    stateStore: StateStore
    stateIndex: StateIndexStore
    auditLog: AuditLogStore
    idempotency: IdempotencyStore
    setupStore: import('@/trading/setups/setupStore').SetupStore
  }
}

export type ProcessWebhookResult = {
  eventId: string
  duplicate: boolean
  decision: DecisionRecord
  stateAfter?: TradingState
}

function gate(gateName: string, pass: boolean, detail?: string): GateResult {
  return { gate: gateName, pass, detail }
}

function strategyConfig(strategyId: StrategyId): StrategyConfig {
  // For this task we implement SPX end-to-end. MIYAGI can be added similarly.
  if (strategyId === 'SPX') return SPX_CONFIG
  if (strategyId === 'FAILED2CHAIN') return FAILED2CHAIN_CONFIG
  return { ...SPX_CONFIG, strategyId: 'MIYAGI' }
}

export async function processTradingViewWebhook(input: ProcessWebhookInput): Promise<ProcessWebhookResult> {
  const { stores, strategyId, raw, normalized, receivedAt } = input
  const config = strategyConfig(strategyId)

  // Deterministic idempotency key derived from strategy + full raw payload.
  const idempotencyKey = sha256Hex(stableStringify({ strategyId, raw }))
  const eventId = idempotencyKey

  const claimed = await stores.idempotency.claim(`idempotency:${eventId}`, config.idempotencyTtlSeconds)
  const duplicate = !claimed

  // Always write raw + normalized event for audit/debug visibility.
  const eventRecord: AuditEventRecord = {
    id: `${eventId}:${receivedAt}`, // unique per receipt; eventId is stable for idempotency
    strategyId,
    receivedAt,
    raw,
    normalized,
  }
  await stores.auditLog.appendEvent(eventRecord, config.auditRetentionSeconds)

  // If duplicate, do not mutate state or re-run decision/execution.
  if (duplicate) {
    const decision: DecisionRecord = {
      strategyId,
      event: normalized,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [gate('idempotency_first_claim', false, `eventId=${eventId}`)],
      reason: 'Duplicate webhook (idempotency)',
    }

    const decisionRecord: AuditDecisionRecord = {
      id: `${eventId}:${receivedAt}:duplicate`,
      strategyId,
      decidedAt: receivedAt,
      eventId,
      decision,
    }
    await stores.auditLog.appendDecision(decisionRecord, config.auditRetentionSeconds)

    return { eventId, duplicate: true, decision }
  }

  const stateKey = makeStateKey(strategyId, normalized.symbol, normalized.timeframe)
  const now = receivedAt
  const nyDateKey = getNyDateKey(now)

  const existing = await stores.stateStore.get(stateKey)
  let state: TradingState =
    existing ??
    makeDefaultState({
      strategyId,
      symbol: normalized.symbol,
      timeframe: normalized.timeframe,
      nyDateKey,
      now,
    })

  // Deterministic daily reset (NY date boundary).
  if (state.daily.date !== nyDateKey) {
    const prev = state.daily.date
    state.daily = { date: nyDateKey, tradeCount: 0, riskUsedUsd: 0 }
    state.notes.unshift(`Daily reset: ${prev} -> ${nyDateKey}`)
  }

  let decision: DecisionRecord
  let stateAfter: TradingState | undefined

  if (normalized.signalType === 'INFO') {
    stateAfter = strategyId === 'SPX' ? applySpxInfoEvent({ state, event: normalized, now }) : state
    await stores.stateStore.set(stateKey, stateAfter, config.stateTtlSeconds)
    await stores.stateIndex.record(stateKey, config.stateTtlSeconds)

    decision = {
      strategyId,
      event: normalized,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [gate('signal_type_info_updates_state', true)],
      reason: 'INFO event processed (state updated only)',
    }
  } else {
    if (strategyId === 'FAILED2CHAIN') {
      // Attempt counts are derived from recent setups (no implicit state mutations).
      const recent = await stores.setupStore.list(normalized.symbol, 'FAILED2CHAIN', 50)
      const attemptCounts: Record<string, number> = {}
      for (const s of recent) {
        const key = `${s.symbol.toUpperCase()}:${s.direction}:${Math.round(s.entry)}`
        attemptCounts[key] = (attemptCounts[key] ?? 0) + 1
      }

      const res = decideFailed2Chain({ config, state, event: normalized, now, attemptCounts })
      decision = res.decision
      if (res.setup) {
        await stores.setupStore.upsertSetup(res.setup, config.auditRetentionSeconds)
      }
    } else {
      decision =
        strategyId === 'SPX'
          ? decideSpxTradeSignal({ config, state, event: normalized, now })
          : decideSpxTradeSignal({ config, state, event: normalized, now })
    }

    if (decision.outcome === 'EXECUTE_PAPER' || decision.outcome === 'EXECUTE_LIVE') {
      const exec = await routeExecution({ config, state, decision, now })
      if (exec.ok) {
        stateAfter = exec.stateAfter
        await stores.stateStore.set(stateKey, stateAfter, config.stateTtlSeconds)
        await stores.stateIndex.record(stateKey, config.stateTtlSeconds)
      } else {
        // Execution errors are recorded deterministically and do not silently succeed.
        decision = {
          ...decision,
          outcome: 'REJECT',
          gates: [...decision.gates, gate('execution_succeeded', false, exec.error)],
          reason: `Execution failed: ${exec.error}`,
        }
      }
    } else {
      // ACTIONABLE events "request permission" only. If rejected, do NOT mutate state.
      // This preserves the rule: INFO updates state; execution updates positions/risk.
      stateAfter = state
    }
  }

  const auditDecision: AuditDecisionRecord = {
    id: `${eventId}:${receivedAt}:decision`,
    strategyId,
    decidedAt: receivedAt,
    eventId,
    decision,
    stateAfter,
  }
  await stores.auditLog.appendDecision(auditDecision, config.auditRetentionSeconds)

  return { eventId, duplicate: false, decision, stateAfter }
}


