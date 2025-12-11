type Bucket = { count: number; resetAt: number }

// Very small in-memory limiter (per serverless instance).
// In production you’ll want Upstash/Redis-based limiting, but this still blocks accidental floods.
const buckets = new Map<string, Bucket>()

let upstashReady: boolean | null = null
let upstashRedis: any = null

async function initUpstash() {
  if (upstashReady !== null) return
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    upstashReady = false
    return
  }
  try {
    const { Redis } = await import('@upstash/redis')
    upstashRedis = new Redis({ url, token })
    upstashReady = true
  } catch {
    upstashReady = false
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  await initUpstash()

  // Prefer Upstash Redis (distributed) when configured.
  if (upstashReady && upstashRedis) {
    const now = Date.now()
    const windowSec = Math.max(1, Math.round(windowMs / 1000))
    const bucket = Math.floor(now / windowMs)
    const bucketedKey = `miyagi_rl:${key}:${bucket}`
    try {
      const count = await upstashRedis.incr(bucketedKey)
      if (count === 1) {
        await upstashRedis.expire(bucketedKey, windowSec)
      }
      const allowed = count <= limit
      return {
        allowed,
        remaining: Math.max(0, limit - count),
        resetAt: (bucket + 1) * windowMs,
      }
    } catch {
      // fall through to in-memory
    }
  }

  // Fallback to in-memory
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { allowed: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt }
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}


