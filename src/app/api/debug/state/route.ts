import { NextResponse } from 'next/server'
import { getTradingRuntime } from '@/trading/runtime/getTradingRuntime'
import { makeStateKey } from '@/trading/state/types'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 25)))

  const strategyId = url.searchParams.get('strategyId')?.toUpperCase()
  const symbol = url.searchParams.get('symbol')
  const timeframe = url.searchParams.get('timeframe')

  const { stateStore, stateIndex } = getTradingRuntime()

  // If a specific key is requested, return just that state.
  if ((strategyId === 'SPX' || strategyId === 'MIYAGI') && symbol && timeframe) {
    const key = makeStateKey(strategyId, symbol, timeframe)
    const state = await stateStore.get(key)
    return NextResponse.json({ ok: true, key, state })
  }

  // Otherwise, return a list of recently touched states (best-effort).
  const prefix = strategyId === 'SPX' || strategyId === 'MIYAGI' ? `${strategyId}:` : undefined
  const keys = await stateIndex.listRecent({ prefix, limit })

  const states = await Promise.all(
    keys.map(async (k) => {
      const s = await stateStore.get(k)
      return { key: k, state: s }
    }),
  )

  return NextResponse.json({ ok: true, count: states.length, states })
}




