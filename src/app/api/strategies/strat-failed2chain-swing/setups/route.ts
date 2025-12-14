import { NextResponse } from 'next/server'
import { getTradingRuntime } from '@/trading/runtime/getTradingRuntime'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbol = url.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 })

  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 50)))
  const { setupStore } = getTradingRuntime()
  const setups = await setupStore.list(symbol, 'StratFailed2ChainSwing', limit)
  return NextResponse.json({ ok: true, symbol, strategyId: 'StratFailed2ChainSwing', count: setups.length, setups })
}


