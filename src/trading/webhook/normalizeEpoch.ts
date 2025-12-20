/**
 * TradingView sends timestamp as epoch milliseconds; we normalize to epoch seconds.
 */
export function normalizeEpochSeconds(input: unknown): { ok: true; seconds: number } | { ok: false; error: string } {
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(n)) return { ok: false, error: 'timestamp_not_a_number' }
  if (n <= 0) return { ok: false, error: 'timestamp_non_positive' }

  // Heuristic:
  // - >= 1e12 → milliseconds
  // - otherwise assume seconds
  const seconds = n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n)
  if (!Number.isFinite(seconds) || seconds <= 0) return { ok: false, error: 'timestamp_invalid_after_normalize' }
  return { ok: true, seconds }
}


