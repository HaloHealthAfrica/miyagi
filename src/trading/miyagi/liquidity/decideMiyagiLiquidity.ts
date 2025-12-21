import type { StrategyConfig } from '@/trading/config'
import type { DecisionRecord, GateResult, TradePlan } from '@/trading/decision/types'
import type { TradingState } from '@/trading/state/types'
import type { MarketEvent } from '@/trading/types'
import { TwelveDataClient } from '@/providers/twelvedataClient'
import { TradierClient } from '@/providers/tradierClient'
import type { OptionContract } from '@/providers/base'
import { parseMiyagiLiquiditySignal } from './parseLiquiditySignal'
import type { MarketContextSnapshot, RejectionReasonCode, SelectedOptionSnapshot } from './types'

function gate(gateName: string, pass: boolean, detail?: string): GateResult {
  return { gate: gateName, pass, detail }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function timeframeToMinutes(tf: string): number | null {
  const s = String(tf).trim()
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) return n
  if (s === '15') return 15
  if (s === '5') return 5
  if (s === '1') return 1
  return null
}

function toIso(d: Date) {
  return d.toISOString()
}

function ohlcToSnapshot(ohlc: Array<{ timestamp: Date; open: number; high: number; low: number; close: number }>) {
  return ohlc.map((c) => ({ t: toIso(c.timestamp), o: c.open, h: c.high, l: c.low, c: c.close }))
}

function atr(ohlc: Array<{ high: number; low: number; close: number }>, period = 14): number | null {
  if (ohlc.length < period + 1) return null
  const trs: number[] = []
  for (let i = 1; i < ohlc.length; i++) {
    const prevClose = ohlc[i - 1]!.close
    const high = ohlc[i]!.high
    const low = ohlc[i]!.low
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trs.push(tr)
  }
  const slice = trs.slice(-period)
  const sum = slice.reduce((a, b) => a + b, 0)
  return sum / slice.length
}

function computeLiquidityPenalty(input: {
  side: 'LONG' | 'SHORT'
  sellSideSwept: boolean
  buySideSwept: boolean
  displacement: boolean
}) {
  let penalty = 0
  if (input.side === 'LONG' && !input.sellSideSwept) penalty += 10
  if (input.side === 'SHORT' && !input.buySideSwept) penalty += 10
  if (!input.displacement) penalty += 5
  return penalty
}

function computeMarketAlignmentBonus(input: { pattern: string; displacement: boolean; sweepSourcesCount: number }) {
  let bonus = 0
  if (input.pattern === '2-1-2' || input.pattern === '3-1-2') bonus += 5
  if (input.pattern === 'FAILED_2') bonus += 2
  if (input.displacement) bonus += 3
  if (input.sweepSourcesCount >= 2) bonus += 2
  return bonus
}

function computeVolatilityPenalty(selectedIv?: number) {
  // We don't have IV rank in this build; use IV as a conservative proxy.
  if (typeof selectedIv !== 'number' || !Number.isFinite(selectedIv)) return 0
  if (selectedIv >= 0.8) return 10
  if (selectedIv >= 0.6) return 5
  return 0
}

function selectOptionContract(input: {
  contracts: OptionContract[]
  underlying: number
  side: 'LONG' | 'SHORT'
  minOi: number
  minVol: number
}):
  | { ok: true; selected: SelectedOptionSnapshot; reasons: RejectionReasonCode[] }
  | { ok: false; reasons: RejectionReasonCode[] } {
  const desiredType = input.side === 'LONG' ? 'call' : 'put'
  const candidates = input.contracts.filter((c) => c.type === desiredType && c.bid > 0 && c.ask > 0)
  if (candidates.length === 0) return { ok: false, reasons: ['OPTIONS_NOT_AVAILABLE'] }

  // Prefer ATM / slightly ITM.
  const ranked = candidates
    .map((c) => {
      const mid = (c.bid + c.ask) / 2
      const spreadPct = mid > 0 ? (c.ask - c.bid) / mid : 1
      const dist = Math.abs(c.strike - input.underlying)
      const isItm = desiredType === 'call' ? c.strike <= input.underlying : c.strike >= input.underlying
      const itmPenalty = isItm ? 0 : 5 // light preference
      return { c, mid, spreadPct, dist, score: dist + itmPenalty + spreadPct * 100 }
    })
    .sort((a, b) => a.score - b.score)

  const best = ranked[0]!
  const selected = {
    symbol: best.c.symbol,
    strike: best.c.strike,
    type: best.c.type,
    bid: best.c.bid,
    ask: best.c.ask,
    mid: best.mid,
    spreadPct: best.spreadPct,
    volume: best.c.volume,
    openInterest: best.c.openInterest,
    delta: best.c.delta,
    iv: best.c.iv,
  } satisfies SelectedOptionSnapshot

  const reasons: RejectionReasonCode[] = []
  if (!(selected.spreadPct <= 0.25)) reasons.push('OPTIONS_ILLQUID')
  const volOk = selected.volume >= input.minVol
  const oiOk = selected.openInterest >= input.minOi
  if (!(volOk || oiOk)) reasons.push('OPTIONS_ILLQUID')

  return { ok: true, selected, reasons }
}

export async function decideMiyagiLiquidity(input: {
  config: StrategyConfig
  state: TradingState
  event: MarketEvent
  now: number
  eventId: string
  receivedAt: number
}): Promise<DecisionRecord> {
  const { config, state, event, now } = input
  const gates: GateResult[] = []
  const rejectionReasons: RejectionReasonCode[] = []
  const snapshot: MarketContextSnapshot = { now }

  // Parse + strict validation (payload-level).
  const parsed = parseMiyagiLiquiditySignal({ event, eventId: input.eventId, receivedAt: input.receivedAt })
  gates.push(gate('miyagi_payload_schema_valid', parsed.ok, parsed.ok ? undefined : parsed.error))
  if (!parsed.ok) {
    rejectionReasons.push('INVALID_PAYLOAD')
    const payload = {
      signalId: input.eventId,
      strategyId: 'MIYAGI',
      action: 'REJECT',
      tvConfidence: null,
      finalScore: null,
      rejectionReasons,
      snapshot: { marketContext: snapshot },
    }
    return {
      strategyId: 'MIYAGI',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [...gates, gate('miyagi_rejection_payload', true, JSON.stringify(payload))],
      reason: 'INVALID_PAYLOAD',
    }
  }

  const signal = parsed.signal

  // Step 4 — Direction & Zone sanity check
  const zoneSideOk = (signal.side === 'LONG' && signal.zone.type === 'demand') || (signal.side === 'SHORT' && signal.zone.type === 'supply')
  gates.push(gate('zone_side_match', zoneSideOk, `side=${signal.side} zone.type=${signal.zone.type}`))
  if (!zoneSideOk) rejectionReasons.push('ZONE_SIDE_MISMATCH')

  // Step 5 — Initial confidence gate
  const tvConfidenceOk = signal.tvConfidence >= 65
  gates.push(gate('tv_confidence_min_65', tvConfidenceOk, `tv=${signal.tvConfidence}`))
  if (!tvConfidenceOk) rejectionReasons.push('TV_CONFIDENCE_TOO_LOW')

  // Market data enrichment (TwelveData).
  const twelvedata = new TwelveDataClient()
  let quoteLast: number | null = null
  let ltf: any[] = []
  let htf: any[] = []

  const tfMin = timeframeToMinutes(signal.timeframe)
  gates.push(gate('timeframe_minutes_parsed', tfMin != null, `timeframe=${signal.timeframe}`))
  if (tfMin == null) rejectionReasons.push('DATA_UNAVAILABLE')

  try {
    const quote = await twelvedata.getQuote(signal.symbol)
    quoteLast = quote.last
    snapshot.quote = { last: quote.last, bid: quote.bid, ask: quote.ask }
    gates.push(gate('twelvedata_quote_ok', Number.isFinite(quoteLast) && quoteLast! > 0, `last=${String(quoteLast)}`))
  } catch (e: any) {
    gates.push(gate('twelvedata_quote_ok', false, String(e?.message ?? e)))
    rejectionReasons.push('DATA_UNAVAILABLE')
  }

  try {
    // LTF: use the signal timeframe when supported (1/5/15), else fall back to 15min.
    const ltfTf = signal.timeframe === '1' || signal.timeframe === '5' || signal.timeframe === '15' ? `${signal.timeframe}min` : '15min'
    ltf = await twelvedata.getOHLC({ symbol: signal.symbol, timeframe: ltfTf as any, lookback: 80 })
    snapshot.ltf = { timeframe: ltfTf, candles: ohlcToSnapshot(ltf) }
    gates.push(gate('twelvedata_ltf_ok', Array.isArray(ltf) && ltf.length >= 20, `ltfBars=${ltf.length}`))
  } catch (e: any) {
    gates.push(gate('twelvedata_ltf_ok', false, String(e?.message ?? e)))
    rejectionReasons.push('DATA_UNAVAILABLE')
  }

  try {
    const htfTf = signal.zone.htfTf === 'D' ? '1day' : '1day'
    htf = await twelvedata.getOHLC({ symbol: signal.symbol, timeframe: htfTf as any, lookback: 10 })
    snapshot.htf = { timeframe: htfTf, candles: ohlcToSnapshot(htf) }
    gates.push(gate('twelvedata_htf_ok', Array.isArray(htf) && htf.length >= 2, `htfBars=${htf.length}`))
  } catch (e: any) {
    gates.push(gate('twelvedata_htf_ok', false, String(e?.message ?? e)))
    rejectionReasons.push('DATA_UNAVAILABLE')
  }

  // Step 6.1 — lateness gate (time-based + price-move-based if possible)
  const nowSeconds = Math.floor(now / 1000)
  const ageSeconds = Math.max(0, nowSeconds - event.timestamp)
  const lateByTime = tfMin != null ? ageSeconds > tfMin * 60 * 1.5 : true
  gates.push(gate('late_entry_time', !lateByTime, `ageSeconds=${ageSeconds} tfMin=${String(tfMin)}`))
  if (lateByTime) rejectionReasons.push('LATE_ENTRY')

  const ltfAtr = Array.isArray(ltf) ? atr(ltf, 14) : null
  const lastClose = Array.isArray(ltf) && ltf.length > 0 ? Number(ltf[ltf.length - 1]!.close) : null
  const movedTooFar =
    quoteLast != null && lastClose != null && ltfAtr != null ? Math.abs(quoteLast - lastClose) > ltfAtr * 0.75 : false
  gates.push(
    gate(
      'late_entry_price_move',
      !movedTooFar,
      `last=${String(quoteLast)} lastClose=${String(lastClose)} atr14=${String(ltfAtr)}`,
    ),
  )
  if (movedTooFar) rejectionReasons.push('LATE_ENTRY')

  // Step 6.1 — HTF zone invalidation / structure proxy checks
  const htfLast = Array.isArray(htf) && htf.length > 0 ? htf[htf.length - 1] : null
  const htfPrev = Array.isArray(htf) && htf.length > 1 ? htf[htf.length - 2] : null
  const zoneInvalidated =
    quoteLast != null && htfLast
      ? signal.side === 'LONG'
        ? quoteLast < Number(htfLast.low)
        : quoteLast > Number(htfLast.high)
      : true
  gates.push(gate('zone_not_invalidated_htf_range', !zoneInvalidated, `last=${String(quoteLast)} htfLast=${String(htfLast?.timestamp)}`))
  if (zoneInvalidated) rejectionReasons.push('ZONE_INVALIDATED')

  const structureBroken =
    htfLast && htfPrev
      ? signal.side === 'LONG'
        ? Number(htfLast.close) < Number(htfPrev.low)
        : Number(htfLast.close) > Number(htfPrev.high)
      : true
  gates.push(gate('htf_structure_intact_proxy', !structureBroken))
  if (structureBroken) rejectionReasons.push('HTF_STRUCTURE_BROKEN')

  // Step 6.2 — Tradier options feasibility
  const tradier = new TradierClient()
  const minOi = Number(process.env.MIYAGI_MIN_OPTION_OI ?? 50)
  const minVol = Number(process.env.MIYAGI_MIN_OPTION_VOLUME ?? 5)
  let selectedIv: number | undefined
  let selectedDelta: number | undefined

  try {
    if (quoteLast == null || !Number.isFinite(quoteLast)) throw new Error('Missing underlying price for options selection')
    const chain = await tradier.getOptionsChain({
      symbol: signal.symbol,
      expiryFilters: { minDTE: 0, maxDTE: 45 },
      side: signal.side === 'LONG' ? 'call' : 'put',
    })
    snapshot.options = { provider: 'tradier', checkedCount: chain.contracts.length }
    const sel = selectOptionContract({
      contracts: chain.contracts,
      underlying: quoteLast,
      side: signal.side,
      minOi: Number.isFinite(minOi) ? minOi : 50,
      minVol: Number.isFinite(minVol) ? minVol : 5,
    })
    gates.push(gate('options_chain_nonempty', chain.contracts.length > 0, `count=${chain.contracts.length}`))

    if (!sel.ok) {
      rejectionReasons.push(...sel.reasons)
    } else {
      snapshot.options.selected = sel.selected
      selectedIv = sel.selected.iv
      selectedDelta = sel.selected.delta
      if (sel.reasons.length) rejectionReasons.push(...sel.reasons)
    }
  } catch (e: any) {
    gates.push(gate('options_feasibility_checked', false, String(e?.message ?? e)))
    rejectionReasons.push('OPTIONS_NOT_AVAILABLE')
  }

  const deltaOk = typeof selectedDelta === 'number' ? Math.abs(selectedDelta) >= 0.35 || signal.tvConfidence >= 85 : signal.tvConfidence >= 85
  gates.push(gate('delta_threshold_or_high_tv_conf', deltaOk, `delta=${String(selectedDelta)} tv=${signal.tvConfidence}`))
  if (!deltaOk) rejectionReasons.push('DELTA_TOO_LOW')

  // Step 6.3 — MarketData.app adjustments (not available in this build); use IV proxy only.
  const marketAlignmentBonus = computeMarketAlignmentBonus({
    pattern: signal.strat.pattern,
    displacement: signal.intent.displacement,
    sweepSourcesCount: signal.liquidity.sweepSources.length,
  })
  const liquidityPenalty = computeLiquidityPenalty({
    side: signal.side,
    sellSideSwept: signal.liquidity.sellSideSwept,
    buySideSwept: signal.liquidity.buySideSwept,
    displacement: signal.intent.displacement,
  })
  const volatilityPenalty = computeVolatilityPenalty(selectedIv)

  const finalScore = Math.round(clamp(signal.tvConfidence + marketAlignmentBonus - volatilityPenalty - liquidityPenalty, 0, 100))
  snapshot.scoring = {
    tvConfidence: signal.tvConfidence,
    marketAlignmentBonus,
    volatilityPenalty,
    liquidityPenalty,
    finalScore,
  }

  // Step 8 — final decision thresholds
  let desiredTier: 'FULL' | 'REDUCED' | 'REJECT' = 'REJECT'
  if (finalScore >= 80) desiredTier = 'FULL'
  else if (finalScore >= 65) desiredTier = 'REDUCED'
  gates.push(gate('final_score_tier', desiredTier !== 'REJECT', `finalScore=${finalScore} tier=${desiredTier}`))

  // If we already have any hard rejection reasons, force reject.
  const hasHardReject = rejectionReasons.length > 0 || desiredTier === 'REJECT'
  gates.push(gate('no_rejection_reasons', !hasHardReject, `reasons=${JSON.stringify(rejectionReasons)}`))

  // Build a deterministic trade plan (required by Mirage execution router).
  // Note: Liquidity Strat does not provide explicit entry/stop/targets in the webhook payload, so we use
  // a conservative ATR-derived plan to remain deterministic and capital-preserving.
  let tradePlan: TradePlan | undefined
  if (quoteLast != null && ltfAtr != null && ltfAtr > 0) {
    const entry = quoteLast
    const stopDist = ltfAtr * 1.25
    const stop = signal.side === 'LONG' ? entry - stopDist : entry + stopDist
    const t1 = signal.side === 'LONG' ? entry + stopDist : entry - stopDist
    const t2 = signal.side === 'LONG' ? entry + stopDist * 2 : entry - stopDist * 2
    const riskPerContractUsd = Math.abs(entry - stop) * config.pointValueUsd
    const qtyBase = Math.max(1, Math.min(config.maxPositionQty, Math.floor(config.riskPerTradeUsd / Math.max(1e-9, riskPerContractUsd))))
    const tierMult = desiredTier === 'FULL' ? 1 : 0.5
    const qty = Math.max(1, Math.floor(qtyBase * tierMult))
    tradePlan = {
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      direction: signal.side,
      qty,
      entry,
      stop,
      targets: [t1, t2],
      riskPerContractUsd,
      estimatedRiskUsd: qty * riskPerContractUsd,
    }
    gates.push(gate('trade_plan_built', true, `qty=${qty} riskUsd=${tradePlan.estimatedRiskUsd.toFixed(2)} finalScore=${finalScore}`))
  } else {
    gates.push(gate('trade_plan_built', false, `last=${String(quoteLast)} atr14=${String(ltfAtr)}`))
    rejectionReasons.push('DATA_UNAVAILABLE')
  }

  // Mandatory rejection record (stored in audit log via gates).
  const rejectionPayload = {
    signalId: signal.signalId,
    strategyId: 'MIYAGI',
    action: 'REJECT',
    tvConfidence: signal.tvConfidence,
    finalScore,
    rejectionReasons: Array.from(new Set(rejectionReasons)),
    snapshot: {
      liquidity: signal.liquidity,
      zone: signal.zone,
      strat: signal.strat,
      marketContext: snapshot,
    },
  }

  if (hasHardReject) {
    return {
      strategyId: 'MIYAGI',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [...gates, gate('miyagi_rejection_payload', true, JSON.stringify(rejectionPayload))],
      reason: `REJECT:${rejectionPayload.rejectionReasons.join(',')}`,
      tradePlan,
    }
  }

  if (config.executionMode === 'disabled') {
    return {
      strategyId: 'MIYAGI',
      event,
      executionMode: config.executionMode,
      outcome: 'REJECT',
      gates: [
        ...gates,
        gate('execution_mode_enabled', false, 'executionMode=disabled'),
        gate('miyagi_tags', true, JSON.stringify({ signalId: signal.signalId, finalScore, pattern: signal.strat.pattern, sweepSources: signal.liquidity.sweepSources })),
      ],
      reason: 'Execution disabled',
      tradePlan,
    }
  }

  const outcome = config.executionMode === 'live' ? 'EXECUTE_LIVE' : 'EXECUTE_PAPER'
  return {
    strategyId: 'MIYAGI',
    event,
    executionMode: config.executionMode,
    outcome,
    gates: [
      ...gates,
      gate('execution_mode_enabled', true, `executionMode=${config.executionMode}`),
      gate(
        'miyagi_tags',
        true,
        JSON.stringify({
          strategy_id: 'MIYAGI',
          signal_id: signal.signalId,
          final_score: finalScore,
          strat_pattern: signal.strat.pattern,
          sweepSources: signal.liquidity.sweepSources,
        }),
      ),
    ],
    reason: `Approved:${desiredTier} finalScore=${finalScore}`,
    tradePlan,
  }
}


