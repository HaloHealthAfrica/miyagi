export type ExecutionMode = 'disabled' | 'paper' | 'live'

export type StrategyConfig = {
  strategyId: 'MIYAGI' | 'SPX' | 'StratFailed2ChainSwing'
  executionMode: ExecutionMode
  /** ACTIONABLE gates */
  minConfidence: number
  minConfluence: number
  /** Cooldowns */
  tradeSignalCooldownMs: number
  /** Session gates */
  allowRTH: boolean
  allowETH: boolean
  /** Risk */
  riskPerTradeUsd: number
  maxDailyRiskUsd: number
  maxDailyTrades: number
  /** Instrument economics (e.g. SPX options/points) */
  pointValueUsd: number
  maxPositionQty: number
  /** State TTL */
  stateTtlSeconds: number
  /** Idempotency window */
  idempotencyTtlSeconds: number
  /** Audit retention */
  auditRetentionSeconds: number
}

function envNumber(name: string, fallback: number) {
  const v = process.env[name]
  if (v == null || v.trim() === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function envBool(name: string, fallback: boolean) {
  const v = process.env[name]
  if (v == null || v.trim() === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function envExecutionMode(name: string, fallback: ExecutionMode): ExecutionMode {
  const v = process.env[name]
  if (!v) return fallback
  if (v === 'disabled' || v === 'paper' || v === 'live') return v
  return fallback
}

/**
 * Default SPX strategy config.
 * Override with env vars (e.g. SPX_MIN_CONFIDENCE, SPX_EXECUTION_MODE).
 */
export const SPX_CONFIG: StrategyConfig = {
  strategyId: 'SPX',
  executionMode: envExecutionMode('SPX_EXECUTION_MODE', 'paper'),
  minConfidence: envNumber('SPX_MIN_CONFIDENCE', 0.7),
  minConfluence: envNumber('SPX_MIN_CONFLUENCE', 0.7),
  tradeSignalCooldownMs: envNumber('SPX_TRADE_SIGNAL_COOLDOWN_MS', 5 * 60_000),
  allowRTH: envBool('SPX_ALLOW_RTH', true),
  allowETH: envBool('SPX_ALLOW_ETH', false),
  riskPerTradeUsd: envNumber('SPX_RISK_PER_TRADE_USD', 150),
  maxDailyRiskUsd: envNumber('SPX_MAX_DAILY_RISK_USD', 600),
  maxDailyTrades: envNumber('SPX_MAX_DAILY_TRADES', 3),
  pointValueUsd: envNumber('SPX_POINT_VALUE_USD', 1),
  maxPositionQty: envNumber('SPX_MAX_POSITION_QTY', 100),
  stateTtlSeconds: envNumber('SPX_STATE_TTL_SECONDS', 36 * 3600),
  idempotencyTtlSeconds: envNumber('SPX_IDEMPOTENCY_TTL_SECONDS', 6 * 3600),
  auditRetentionSeconds: envNumber('SPX_AUDIT_RETENTION_SECONDS', 24 * 3600),
}

/**
 * Default StratFailed2ChainSwing strategy config.
 * Override with env vars (e.g. STRAT_FAILED2CHAIN_SWING_EXECUTION_MODE).
 */
function envFirst(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v != null && v.trim() !== '') return v
  }
  return undefined
}

function envNumberFirst(names: string[], fallback: number) {
  const v = envFirst(names)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function envBoolFirst(names: string[], fallback: boolean) {
  const v = envFirst(names)
  if (v == null) return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function envExecutionModeFirst(names: string[], fallback: ExecutionMode): ExecutionMode {
  const v = envFirst(names)
  if (!v) return fallback
  if (v === 'disabled' || v === 'paper' || v === 'live') return v
  return fallback
}

export const STRAT_FAILED2CHAIN_SWING_CONFIG: StrategyConfig = {
  strategyId: 'StratFailed2ChainSwing',
  // Prefer new env var names, but accept legacy FAILED2CHAIN_* as alias.
  executionMode: envExecutionModeFirst(['STRAT_FAILED2CHAIN_SWING_EXECUTION_MODE', 'FAILED2CHAIN_EXECUTION_MODE'], 'paper'),
  // used for "failed_*" vs "chain_*" confidence gating; see strategy module.
  minConfidence: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_MIN_CONFIDENCE', 'FAILED2CHAIN_MIN_CONFIDENCE'], 0.7),
  // not used by default (strategy uses its own gates), but kept for consistency.
  minConfluence: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_MIN_CONFLUENCE', 'FAILED2CHAIN_MIN_CONFLUENCE'], 0.0),
  tradeSignalCooldownMs: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_COOLDOWN_MS', 'FAILED2CHAIN_COOLDOWN_MS'], 60_000),
  allowRTH: envBoolFirst(['STRAT_FAILED2CHAIN_SWING_ALLOW_RTH', 'FAILED2CHAIN_ALLOW_RTH'], true),
  allowETH: envBoolFirst(['STRAT_FAILED2CHAIN_SWING_ALLOW_ETH', 'FAILED2CHAIN_ALLOW_ETH'], false),
  riskPerTradeUsd: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_RISK_PER_TRADE_USD', 'FAILED2CHAIN_RISK_PER_TRADE_USD'], 200),
  maxDailyRiskUsd: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_MAX_DAILY_RISK_USD', 'FAILED2CHAIN_MAX_DAILY_RISK_USD'], 800),
  maxDailyTrades: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_MAX_DAILY_TRADES', 'FAILED2CHAIN_MAX_DAILY_TRADES'], 5),
  pointValueUsd: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_POINT_VALUE_USD', 'FAILED2CHAIN_POINT_VALUE_USD'], 1),
  maxPositionQty: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_MAX_POSITION_QTY', 'FAILED2CHAIN_MAX_POSITION_QTY'], 100),
  stateTtlSeconds: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_STATE_TTL_SECONDS', 'FAILED2CHAIN_STATE_TTL_SECONDS'], 36 * 3600),
  idempotencyTtlSeconds: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_IDEMPOTENCY_TTL_SECONDS', 'FAILED2CHAIN_IDEMPOTENCY_TTL_SECONDS'], 6 * 3600),
  auditRetentionSeconds: envNumberFirst(['STRAT_FAILED2CHAIN_SWING_AUDIT_RETENTION_SECONDS', 'FAILED2CHAIN_AUDIT_RETENTION_SECONDS'], 24 * 3600),
}


