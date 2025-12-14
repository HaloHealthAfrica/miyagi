import { NextResponse } from 'next/server'
import { getTradingRuntime } from '@/trading/runtime/getTradingRuntime'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') ?? 100)))
  const strategyId = url.searchParams.get('strategyId')?.toUpperCase()

  const { auditLog } = getTradingRuntime()
  const decisions = await auditLog.listDecisions(limit)

  const filtered =
    strategyId === 'SPX' || strategyId === 'MIYAGI'
      ? decisions.filter((d) => d.strategyId === strategyId)
      : decisions

  return NextResponse.json({ ok: true, count: filtered.length, decisions: filtered })
}




