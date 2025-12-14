import type { StrategyConfig } from '@/trading/config'
import type { DecisionRecord } from '@/trading/decision/types'
import type { TradingState } from '@/trading/state/types'
import { sha256Hex } from '@/trading/common/hash'
import { stableStringify } from '@/trading/common/stableStringify'

export type ExecutionResult =
  | { ok: true; stateAfter: TradingState }
  | { ok: false; error: string; stateAfter?: TradingState }

/**
 * Execution is intentionally decoupled from decision-making:
 * - Decision engine emits EXECUTE_PAPER / EXECUTE_LIVE / REJECT
 * - Router applies the appropriate executor (paper/live/disabled)
 *
 * Safety: live execution is disabled by default unless explicitly enabled.
 */
export async function routeExecution(input: {
  config: StrategyConfig
  state: TradingState
  decision: DecisionRecord
  now: number
}): Promise<ExecutionResult> {
  const { config, decision } = input

  if (!decision.tradePlan) return { ok: false, error: 'Missing tradePlan for execution' }

  if (decision.outcome === 'REJECT') return { ok: true, stateAfter: input.state }

  if (decision.outcome === 'EXECUTE_LIVE') {
    const liveEnabled = process.env.LIVE_EXECUTION_ENABLED === '1' || process.env.LIVE_EXECUTION_ENABLED === 'true'
    if (!liveEnabled) return { ok: false, error: 'Live execution not enabled (set LIVE_EXECUTION_ENABLED=true)' }
    // Live executor integration would go here (broker API, order router, etc).
    // For now, fail safe.
    return { ok: false, error: 'Live execution is not implemented in this build' }
  }

  // Paper execution: mutate state deterministically to reflect the simulated position.
  const next: TradingState = structuredClone(input.state)
  const plan = decision.tradePlan

  const posId = sha256Hex(
    stableStringify({
      strategyId: decision.strategyId,
      symbol: plan.symbol,
      timeframe: plan.timeframe,
      direction: plan.direction,
      entry: plan.entry,
      stop: plan.stop,
      targets: plan.targets,
      decidedAt: input.now,
    }),
  ).slice(0, 16)

  next.openPositions.unshift({
    id: posId,
    strategyId: decision.strategyId,
    symbol: plan.symbol,
    timeframe: plan.timeframe,
    direction: plan.direction,
    qty: plan.qty,
    entry: plan.entry,
    stop: plan.stop,
    targets: plan.targets,
    openedAt: input.now,
    mode: 'paper',
    status: 'OPEN',
  })

  next.daily.tradeCount += 1
  next.daily.riskUsedUsd += plan.estimatedRiskUsd

  next.cooldowns['TRADE_SIGNAL'] = decision.event.timestamp
  next.lastActionableSignalAt = decision.event.timestamp

  next.updatedAt = input.now
  next.notes.unshift(`PAPER EXEC: ${plan.direction} qty=${plan.qty} entry=${plan.entry} stop=${plan.stop}`)
  if (next.notes.length > 50) next.notes.length = 50

  return { ok: true, stateAfter: next }
}




