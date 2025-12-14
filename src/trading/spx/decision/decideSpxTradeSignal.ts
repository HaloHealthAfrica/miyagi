import type { StrategyConfig } from '@/trading/config'
import type { DecisionRecord, GateResult, TradePlan } from '@/trading/decision/types'
import type { TradingState } from '@/trading/state/types'
import type { MarketEvent } from '@/trading/types'
import { getNyDateKey } from '@/trading/common/time'

function gate(gateName: string, pass: boolean, detail?: string): GateResult {
  return { gate: gateName, pass, detail }
}

export function decideSpxTradeSignal(input: {
  config: StrategyConfig
  state: TradingState
  event: MarketEvent
  now: number
}): DecisionRecord {
  const { config, state, event } = input

  const gates: GateResult[] = []

  const isTradeSignal = event.event === 'TRADE_SIGNAL' && event.signalType === 'ACTIONABLE'
  gates.push(gate('event_is_trade_signal', isTradeSignal, `event=${event.event} signalType=${event.signalType}`))
  if (!isTradeSignal) {
    return {
      strategyId: 'SPX',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates,
      reason: 'Not an actionable TRADE_SIGNAL',
    }
  }

  const directionOk = event.direction === 'LONG' || event.direction === 'SHORT'
  gates.push(gate('direction_present', directionOk, `direction=${String(event.direction)}`))

  const biasOk = state.bias !== 'NEUTRAL'
  gates.push(gate('state_bias_set', biasOk, `bias=${state.bias}`))

  const directionMatchesBias = directionOk && biasOk && event.direction === state.bias
  gates.push(gate('direction_matches_bias', directionMatchesBias))

  const last = state.cooldowns['TRADE_SIGNAL'] ?? 0
  const elapsed = event.timestamp - last
  const cooldownOk = elapsed >= config.tradeSignalCooldownMs
  gates.push(gate('cooldown_passed', cooldownOk, `elapsedMs=${elapsed} requiredMs=${config.tradeSignalCooldownMs}`))

  const sessionPresent = state.session === 'RTH' || state.session === 'ETH'
  gates.push(gate('session_present', sessionPresent, `session=${String(state.session)}`))
  const sessionOk =
    sessionPresent && ((state.session === 'RTH' && config.allowRTH) || (state.session === 'ETH' && config.allowETH))
  gates.push(
    gate(
      'session_allowed',
      sessionOk,
      `session=${String(state.session)} allowRTH=${config.allowRTH} allowETH=${config.allowETH}`,
    ),
  )

  const confOk = typeof event.confidence === 'number' && event.confidence >= config.minConfidence
  gates.push(
    gate(
      'confidence_threshold',
      confOk,
      `confidence=${String(event.confidence)} min=${config.minConfidence}`,
    ),
  )

  const conflOk = typeof event.confluence === 'number' && event.confluence >= config.minConfluence
  gates.push(
    gate(
      'confluence_threshold',
      conflOk,
      `confluence=${String(event.confluence)} min=${config.minConfluence}`,
    ),
  )

  const noOpenPos = state.openPositions.filter((p) => p.status === 'OPEN').length === 0
  gates.push(gate('no_open_position', noOpenPos, `openCount=${state.openPositions.length}`))

  const nyDate = getNyDateKey(event.timestamp)
  const tradeCountOk = state.daily.date === nyDate ? state.daily.tradeCount < config.maxDailyTrades : false
  gates.push(gate('max_daily_trades', tradeCountOk, `tradeCount=${state.daily.tradeCount} max=${config.maxDailyTrades}`))

  const entry = numberField(event.payload, 'entry')
  const stop = numberField(event.payload, 'stop')
  const targets = numberArrayField(event.payload, 'targets')

  const hasPrices = Number.isFinite(entry) && Number.isFinite(stop) && Array.isArray(targets) && targets.length > 0
  gates.push(gate('has_entry_stop_targets', hasPrices, `entry=${String(entry)} stop=${String(stop)} targets=${targets?.length ?? 0}`))

  let tradePlan: TradePlan | undefined
  let priceValidationOk = false

  if (hasPrices && directionOk) {
    const tradeDirection = event.direction as 'LONG' | 'SHORT'
    priceValidationOk = validateStopsAndTargets({
      direction: tradeDirection,
      entry: entry!,
      stop: stop!,
      targets: targets!,
    })
    gates.push(gate('stop_target_valid', priceValidationOk))

    if (priceValidationOk) {
      const riskPerContractUsd = Math.abs(entry! - stop!) * config.pointValueUsd
      const riskPositive = riskPerContractUsd > 0
      gates.push(gate('risk_per_contract_positive', riskPositive, `riskPerContractUsd=${riskPerContractUsd}`))

      if (riskPositive) {
        const rawQty = Math.floor(config.riskPerTradeUsd / riskPerContractUsd)
        const qty = Math.max(1, Math.min(config.maxPositionQty, rawQty))
        const estimatedRiskUsd = qty * riskPerContractUsd
        tradePlan = {
          symbol: event.symbol,
          timeframe: event.timeframe,
          direction: tradeDirection,
          qty,
          entry: entry!,
          stop: stop!,
          targets: targets!,
          riskPerContractUsd,
          estimatedRiskUsd,
        }
      }
    }
  } else {
    // Still include the gate for determinism.
    gates.push(gate('stop_target_valid', false, 'Missing/invalid entry/stop/targets'))
    gates.push(gate('risk_per_contract_positive', false, 'No trade plan'))
  }

  const estimatedRisk = tradePlan?.estimatedRiskUsd
  const riskOk =
    state.daily.date === nyDate && typeof estimatedRisk === 'number'
      ? state.daily.riskUsedUsd + estimatedRisk <= config.maxDailyRiskUsd
      : false
  gates.push(
    gate(
      'max_daily_risk',
      riskOk,
      `riskUsed=${state.daily.riskUsedUsd} + estimatedRisk=${String(estimatedRisk)} max=${config.maxDailyRiskUsd}`,
    ),
  )

  const allPass = gates.every((g) => g.pass)
  if (!allPass) {
    return {
      strategyId: 'SPX',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates,
      reason: 'One or more gates failed',
      tradePlan,
    }
  }

  if (config.executionMode === 'disabled') {
    return {
      strategyId: 'SPX',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [...gates, gate('execution_mode_enabled', false, 'executionMode=disabled')],
      reason: 'Execution disabled',
      tradePlan,
    }
  }

  return {
    strategyId: 'SPX',
    event,
    executionMode: config.executionMode,
    outcome: config.executionMode === 'live' ? 'EXECUTE_LIVE' : 'EXECUTE_PAPER',
    gates: [...gates, gate('execution_mode_enabled', true, `executionMode=${config.executionMode}`)],
    reason: 'Approved',
    tradePlan,
  }
}

function numberField(payload: Record<string, any>, field: string): number | undefined {
  const v = payload?.[field]
  if (v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function numberArrayField(payload: Record<string, any>, field: string): number[] | undefined {
  const v = payload?.[field]
  if (!Array.isArray(v)) return undefined
  const out: number[] = []
  for (const x of v) {
    const n = Number(x)
    if (!Number.isFinite(n)) return undefined
    out.push(n)
  }
  return out
}

function validateStopsAndTargets(input: { direction: 'LONG' | 'SHORT'; entry: number; stop: number; targets: number[] }) {
  const { direction, entry, stop, targets } = input
  if (direction === 'LONG') {
    if (!(stop < entry)) return false
    for (const t of targets) if (!(t > entry)) return false
    return true
  }
  if (!(stop > entry)) return false
  for (const t of targets) if (!(t < entry)) return false
  return true
}


