import { NextResponse } from 'next/server'
import { getTradingRuntime } from '@/trading/runtime/getTradingRuntime'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbol = url.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 })

  const { setupStore } = getTradingRuntime()
  const setup = await setupStore.getLatest(symbol, 'StratFailed2ChainSwing')
  return NextResponse.json({ ok: true, symbol, strategyId: 'StratFailed2ChainSwing', setup })
}


