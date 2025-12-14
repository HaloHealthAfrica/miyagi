import { NextResponse } from 'next/server'
import { normalizeTradingViewWebhook } from '@/trading/webhook/normalizeTradingViewWebhook'
import { resolveStrategyId } from '@/trading/webhook/resolveStrategyId'
import { validateKnownTradingViewEvent } from '@/trading/webhook/validateKnownTradingViewEvent'
import { getTradingRuntime } from '@/trading/runtime/getTradingRuntime'
import { processTradingViewWebhook } from '@/trading/webhook/processTradingViewWebhook'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const receivedAt = Date.now()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  let parsed: ReturnType<typeof normalizeTradingViewWebhook>
  try {
    parsed = normalizeTradingViewWebhook(body)
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'Webhook schema validation failed', detail: String(err?.message ?? err) },
      { status: 400 },
    )
  }

  const strategyId = resolveStrategyId(parsed.normalized)

  const known = validateKnownTradingViewEvent(strategyId, parsed.normalized)
  if (!known.ok) {
    return NextResponse.json({ ok: false, error: known.reason }, { status: known.status })
  }

  const stores = getTradingRuntime()

  // Process deterministically (state updates, decision, optional execution, audit).
  const result = await processTradingViewWebhook({
    strategyId,
    raw: parsed.raw,
    normalized: parsed.normalized,
    receivedAt,
    stores,
  })

  // Fast ACK: always 200 for valid events, even when rejected (decision outcome contains why).
  return NextResponse.json({
    ok: true,
    strategyId,
    eventId: result.eventId,
    duplicate: result.duplicate,
    outcome: result.decision.outcome,
    reason: result.decision.reason,
  })
}




