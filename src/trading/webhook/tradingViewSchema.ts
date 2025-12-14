import { z } from 'zod'

/**
 * Raw TradingView webhook payload schema.
 * - Required fields enforced
 * - Unknown fields preserved via `.passthrough()`
 */
const legacySchema = z
  .object({
    event: z.string().min(1),
    signal_type: z.enum(['INFO', 'ACTIONABLE']),
    symbol: z.string().min(1),
    timeframe: z.string().min(1),
    timestamp: z.number().finite(),
  })
  .passthrough()

/**
 * Canonical TradingView -> Webapp envelope (v1.0).
 * Note: does NOT require `signal_type`; we infer it deterministically from `event` when absent.
 */
const canonicalSchema = z
  .object({
    source: z.literal('tradingview'),
    version: z.string().min(1),
    event: z.string().min(1),
    symbol: z.string().min(1),
    assetType: z.enum(['EQUITY', 'ETF', 'INDEX']).optional(),
    timeframe: z.string().min(1),
    timestamp: z.number().finite(),
  })
  .passthrough()

// Note: `passthrough()` must be applied to the object schemas (above).
// Zod unions do not support `.passthrough()`.
export const tradingViewWebhookSchema = z.union([legacySchema, canonicalSchema])

export type TradingViewWebhookPayload = z.infer<typeof tradingViewWebhookSchema>


