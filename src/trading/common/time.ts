export type Session = 'RTH' | 'ETH'

/**
 * Deterministically derive RTH/ETH from a timestamp in America/New_York.
 * RTH: 09:30-16:00 inclusive start, exclusive end.
 */
export function getNySession(timestampMs: number): Session {
  const parts = getNYParts(timestampMs)
  const minutes = parts.hour * 60 + parts.minute
  const rthStart = 9 * 60 + 30
  const rthEnd = 16 * 60
  return minutes >= rthStart && minutes < rthEnd ? 'RTH' : 'ETH'
}

export function getNyDateKey(timestampMs: number): string {
  const parts = getNYParts(timestampMs)
  const y = String(parts.year).padStart(4, '0')
  const m = String(parts.month).padStart(2, '0')
  const d = String(parts.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getNYParts(timestampMs: number): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(new Date(timestampMs))
  const byType: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') byType[p.type] = p.value
  }
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
  }
}


