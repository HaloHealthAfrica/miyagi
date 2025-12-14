import { Redis } from '@upstash/redis'
import { InMemoryAuditLogStore } from '@/trading/audit/inMemoryAuditLogStore'
import { RedisAuditLogStore } from '@/trading/audit/redisAuditLogStore'
import type { AuditLogStore } from '@/trading/audit/auditLogStore'
import { InMemoryIdempotencyStore } from '@/trading/idempotency/inMemoryIdempotencyStore'
import { RedisIdempotencyStore } from '@/trading/idempotency/redisIdempotencyStore'
import type { IdempotencyStore } from '@/trading/idempotency/idempotencyStore'
import { InMemoryStateStore } from '@/trading/state/inMemoryStateStore'
import { RedisStateStore } from '@/trading/state/redisStateStore'
import type { StateStore } from '@/trading/state/stateStore'
import { InMemoryStateIndexStore } from '@/trading/state/inMemoryStateIndexStore'
import { RedisStateIndexStore } from '@/trading/state/redisStateIndexStore'
import type { StateIndexStore } from '@/trading/state/stateIndexStore'
import { InMemorySetupStore } from '@/trading/setups/inMemorySetupStore'
import { RedisSetupStore } from '@/trading/setups/redisSetupStore'
import type { SetupStore } from '@/trading/setups/setupStore'

export type TradingRuntime = {
  stateStore: StateStore
  stateIndex: StateIndexStore
  auditLog: AuditLogStore
  idempotency: IdempotencyStore
  setupStore: SetupStore
}

declare global {
  // eslint-disable-next-line no-var
  var __tradingRuntime: TradingRuntime | undefined
}

function canUseRedisFromEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function getTradingRuntime(): TradingRuntime {
  if (globalThis.__tradingRuntime) return globalThis.__tradingRuntime

  const useRedis = canUseRedisFromEnv()

  if (useRedis) {
    const redis = Redis.fromEnv()
    globalThis.__tradingRuntime = {
      stateStore: new RedisStateStore(redis),
      stateIndex: new RedisStateIndexStore(redis),
      auditLog: new RedisAuditLogStore(redis),
      idempotency: new RedisIdempotencyStore(redis),
      setupStore: new RedisSetupStore(redis),
    }
  } else {
    globalThis.__tradingRuntime = {
      stateStore: new InMemoryStateStore(),
      stateIndex: new InMemoryStateIndexStore(),
      auditLog: new InMemoryAuditLogStore(),
      idempotency: new InMemoryIdempotencyStore(),
      setupStore: new InMemorySetupStore(),
    }
  }

  return globalThis.__tradingRuntime
}




