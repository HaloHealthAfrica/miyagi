export type ExecutionMode = 'disabled' | 'paper' | 'live'

export type StrategyConfig = {
  strategyId: 'MIYAGI' | 'SPX' | 'FAILED2CHAIN'
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
 * Default Failed2ChainSwing strategy config.
 * Override with env vars (e.g. FAILED2CHAIN_EXECUTION_MODE).
 */
export const FAILED2CHAIN_CONFIG: StrategyConfig = {
  strategyId: 'FAILED2CHAIN',
  executionMode: envExecutionMode('FAILED2CHAIN_EXECUTION_MODE', 'paper'),
  // used for "failed_*" vs "chain_*" confidence gating; see strategy module.
  minConfidence: envNumber('FAILED2CHAIN_MIN_CONFIDENCE', 0.7),
  // not used by default (strategy uses its own gates), but kept for consistency.
  minConfluence: envNumber('FAILED2CHAIN_MIN_CONFLUENCE', 0.0),
  tradeSignalCooldownMs: envNumber('FAILED2CHAIN_COOLDOWN_MS', 60_000),
  allowRTH: envBool('FAILED2CHAIN_ALLOW_RTH', true),
  allowETH: envBool('FAILED2CHAIN_ALLOW_ETH', false),
  riskPerTradeUsd: envNumber('FAILED2CHAIN_RISK_PER_TRADE_USD', 200),
  maxDailyRiskUsd: envNumber('FAILED2CHAIN_MAX_DAILY_RISK_USD', 800),
  maxDailyTrades: envNumber('FAILED2CHAIN_MAX_DAILY_TRADES', 5),
  pointValueUsd: envNumber('FAILED2CHAIN_POINT_VALUE_USD', 1),
  maxPositionQty: envNumber('FAILED2CHAIN_MAX_POSITION_QTY', 100),
  stateTtlSeconds: envNumber('FAILED2CHAIN_STATE_TTL_SECONDS', 36 * 3600),
  idempotencyTtlSeconds: envNumber('FAILED2CHAIN_IDEMPOTENCY_TTL_SECONDS', 6 * 3600),
  auditRetentionSeconds: envNumber('FAILED2CHAIN_AUDIT_RETENTION_SECONDS', 24 * 3600),
}


