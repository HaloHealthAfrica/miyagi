/**
 * Deterministic JSON serialization for hashing/idempotency.
 * - Sorts object keys lexicographically (recursively)
 * - Leaves arrays in-order
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value))
}

function stableNormalize(value: unknown): unknown {
  if (value === null) return null
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) return value.map(stableNormalize)

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = stableNormalize(obj[k])
  return out
}


