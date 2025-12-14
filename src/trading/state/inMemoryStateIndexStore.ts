import type { StateIndexStore } from '@/trading/state/stateIndexStore'

type Entry = { key: string; touchedAt: number; expiresAt: number }

/**
 * In-memory state index: keeps a small list of recently touched state keys.
 * Only intended for debug endpoints in dev.
 */
export class InMemoryStateIndexStore implements StateIndexStore {
  private entries: Entry[] = []
  private maxItems: number

  constructor(opts?: { maxItems?: number }) {
    this.maxItems = opts?.maxItems ?? 2000
  }

  async record(key: string, ttlSeconds: number): Promise<void> {
    this.compact()
    const now = Date.now()
    // Remove existing instance of key so newest touch wins.
    this.entries = this.entries.filter((e) => e.key !== key)
    this.entries.unshift({ key, touchedAt: now, expiresAt: now + ttlSeconds * 1000 })
    if (this.entries.length > this.maxItems) this.entries.length = this.maxItems
  }

  async listRecent(opts: { prefix?: string; limit: number }): Promise<string[]> {
    this.compact()
    const out: string[] = []
    for (const e of this.entries) {
      if (opts.prefix && !e.key.startsWith(opts.prefix)) continue
      out.push(e.key)
      if (out.length >= opts.limit) break
    }
    return out
  }

  private compact() {
    const now = Date.now()
    this.entries = this.entries.filter((e) => e.expiresAt > now)
  }
}




