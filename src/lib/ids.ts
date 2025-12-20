import { randomBytes } from 'crypto'

/**
 * UUIDv7 (time-ordered) generator.
 * - 48-bit unix epoch milliseconds
 * - 74 bits of randomness
 * - RFC 4122 variant
 *
 * Good enough for durable event identity & ordering; deterministic replay uses persisted records.
 */
export function uuidv7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(16)

  // timestamp (48-bit, big-endian)
  const ts = BigInt(nowMs)
  bytes[0] = Number((ts >> 40n) & 0xffn)
  bytes[1] = Number((ts >> 32n) & 0xffn)
  bytes[2] = Number((ts >> 24n) & 0xffn)
  bytes[3] = Number((ts >> 16n) & 0xffn)
  bytes[4] = Number((ts >> 8n) & 0xffn)
  bytes[5] = Number(ts & 0xffn)

  // version 7
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  // variant RFC 4122 (10xxxxxx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}


