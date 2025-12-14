import type { StateStore } from '@/trading/state/stateStore'
import type { TradingState } from '@/trading/state/types'

type Entry = { state: TradingState; expiresAt: number }

export class InMemoryStateStore implements StateStore {
  private map = new Map<string, Entry>()

  async get(key: string): Promise<TradingState | null> {
    const e = this.map.get(key)
    if (!e) return null
    if (Date.now() > e.expiresAt) {
      this.map.delete(key)
      return null
    }
    // return a defensive copy to avoid accidental mutation outside the store
    return structuredClone(e.state)
  }

  async set(key: string, state: TradingState, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.map.set(key, { state: structuredClone(state), expiresAt })
  }
}


