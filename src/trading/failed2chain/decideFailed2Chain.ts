import type { StrategyConfig } from '@/trading/config'
import type { DecisionRecord, GateResult, TradePlan } from '@/trading/decision/types'
import type { TradingState } from '@/trading/state/types'
import type { MarketEvent } from '@/trading/types'
import { buildRiskBox, suggestOption } from '@/trading/failed2chain/buildFailed2ChainSetup'
import { evaluateFailed2ChainGovernor } from '@/trading/failed2chain/failed2ChainGovernor'
import { sha256Hex } from '@/trading/common/hash'
import { stableStringify } from '@/trading/common/stableStringify'
import type { StrategySetupRecord } from '@/trading/setups/types'
import { normalizeFailed2ChainPayload } from '@/trading/failed2chain/normalizeFailed2ChainPayload'

function gate(gateName: string, pass: boolean, detail?: string): GateResult {
  return { gate: gateName, pass, detail }
}

function getNyMinutes(timestampMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(new Date(timestampMs))
  const byType: Record<string, string> = {}
  for (const p of parts) if (p.type !== 'literal') byType[p.type] = p.value
  return Number(byType.hour) * 60 + Number(byType.minute)
}

function attemptKey(symbol: string, direction: 'LONG' | 'SHORT', level: number) {
  // Deterministic coarse bucketing for "attempts at level".
  const rounded = Math.round(level)
  return `${symbol.toUpperCase()}:${direction}:${rounded}`
}

export function decideFailed2Chain(input: {
  config: StrategyConfig
  state: TradingState
  event: MarketEvent
  now: number
  attemptCounts: Record<string, number>
}): { decision: DecisionRecord; setup?: StrategySetupRecord } {
  const { config, state, event, now } = input
  const gates: GateResult[] = []

  const isKnown =
    event.event === 'failed_2u' ||
    event.event === 'failed_2d' ||
    event.event === 'chain_2u_f2u_2d' ||
    event.event === 'FAILED_2U' ||
    event.event === 'FAILED_2D' ||
    event.event === 'CHAIN_2U_F2U_2D' ||
    event.event === 'SWING_ARMED' ||
    event.event === 'SWING_PRE_CLOSE' ||
    event.event === 'SWING_CONFIRMED'
  gates.push(gate('event_known_failed2chain', isKnown, `event=${event.event}`))
  if (!isKnown) {
    return {
      decision: {
        strategyId: 'FAILED2CHAIN',
        event,
        executionMode: config.executionMode,
        outcome: 'REJECT',
        gates,
        reason: 'Not a Failed2Chain event',
      },
    }
  }

  // Parse/validate strategy-specific payload fields (legacy OR canonical).
  let payload: ReturnType<typeof normalizeFailed2ChainPayload>
  try {
    payload = normalizeFailed2ChainPayload(event.payload)
    gates.push(gate('payload_schema_valid', true))
  } catch (err: any) {
    gates.push(gate('payload_schema_valid', false, String(err?.message ?? err)))
    return {
      decision: {
        strategyId: 'FAILED2CHAIN',
        event,
        executionMode: config.executionMode,
        outcome: 'REJECT',
        gates,
        reason: 'Invalid Failed2Chain payload',
      },
    }
  }
  const nowNyMinutes = getNyMinutes(event.timestamp)

  // Confidence gate: chain defaults ENTER; failed_* defaults SETUP_ONLY unless >= threshold
  const confidence = payload.confidence ?? event.confidence
  const hasConfidence = typeof confidence === 'number' && Number.isFinite(confidence)
  gates.push(gate('confidence_present', hasConfidence, `confidence=${String(confidence)}`))

  const isChain = payload.event === 'chain_2u_f2u_2d'
  const confPassForEnter = isChain ? true : hasConfidence && confidence! >= config.minConfidence
  gates.push(gate('confidence_enter_threshold', confPassForEnter, `min=${config.minConfidence} chain=${isChain}`))

  // Attempts at level (best-effort; computed from recent setups)
  const aKey = attemptKey(payload.symbol, payload.side, payload.price)
  const attempts = input.attemptCounts[aKey] ?? 0
  gates.push(gate('attempts_at_level_lt_2', attempts < 2, `attempts=${attempts}`))

  // Loss streak (MVP: state.daily.tradeCount is not losses; use optional injected in state notes later)
  const lossesToday = Number(event.payload?.lossesToday ?? 0)
  gates.push(gate('losses_today_known', Number.isFinite(lossesToday), `lossesToday=${String(event.payload?.lossesToday)}`))

  const vix = typeof payload.vix === 'number' ? payload.vix : typeof event.payload?.vix === 'number' ? event.payload.vix : undefined

  const gov = evaluateFailed2ChainGovernor({
    payload,
    nowNyMinutes,
    lossesToday: Number.isFinite(lossesToday) ? lossesToday : 0,
    attemptsAtLevel: attempts,
    vix,
  })
  gates.push(gate('governor_allowed', gov.allowed, gov.reasonCodes.join(',')))

  // Build setup (always, as long as payload is valid).
  const box = buildRiskBox(payload)
  const opt = suggestOption(payload, nowNyMinutes)

  const setupId = sha256Hex(
    stableStringify({
      strategyId: 'FAILED2CHAIN',
      symbol: payload.symbol,
      tf: event.timeframe,
      ts: event.timestamp,
      event: payload.event,
      side: payload.side,
      entry: box.entry,
      stop: box.stop,
    }),
  ).slice(0, 16)

  const setup: StrategySetupRecord = {
    id: setupId,
    symbol: payload.symbol,
    strategyId: 'FAILED2CHAIN',
    eventType: payload.event,
    direction: payload.side,
    timeframe: event.timeframe,
    status: 'WAITING',
    entry: box.entry,
    stop: box.stop,
    tp1: box.tp1,
    tp2: box.tp2,
    confidence: hasConfidence ? confidence : undefined,
    expiryHint: opt.expiryHint,
    optionSuggested: opt.optionSuggested,
    reasonCodes: [...gov.reasonCodes],
    gates,
    createdAt: now,
    updatedAt: now,
  }

  const canEnter = gov.allowed && confPassForEnter && gates.every((g) => g.pass)
  const outcome = canEnter ? (config.executionMode === 'live' ? 'EXECUTE_LIVE' : 'EXECUTE_PAPER') : 'REJECT'

  // If we "enter", create a TradePlan for the unified executor (paper stub in this repo).
  let tradePlan: TradePlan | undefined
  if (canEnter) {
    const riskPerContractUsd = Math.abs(box.entry - box.stop) * config.pointValueUsd
    const qty = Math.max(1, Math.min(config.maxPositionQty, Math.floor(config.riskPerTradeUsd / riskPerContractUsd)))
    tradePlan = {
      symbol: payload.symbol,
      timeframe: event.timeframe,
      direction: payload.side,
      qty,
      entry: box.entry,
      stop: box.stop,
      targets: [box.tp1, box.tp2],
      riskPerContractUsd,
      estimatedRiskUsd: qty * riskPerContractUsd,
    }
  }

  const reason = canEnter
    ? 'ENTER'
    : isChain
      ? 'SETUP_ONLY (governor/confidence/gates)'
      : 'SETUP_ONLY (confidence below threshold or vetoed)'

  return {
    decision: {
      strategyId: 'FAILED2CHAIN',
      event,
      executionMode: config.executionMode,
      outcome,
      gates,
      reason,
      tradePlan,
    },
    setup,
  }
}


