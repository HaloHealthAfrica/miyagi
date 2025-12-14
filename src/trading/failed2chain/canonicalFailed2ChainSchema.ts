import { z } from 'zod'

export const canonicalFailed2ChainSchema = z
  .object({
    source: z.literal('tradingview'),
    version: z.string().min(1),
    event: z.enum(['FAILED_2U', 'FAILED_2D', 'CHAIN_2U_F2U_2D', 'SWING_ARMED', 'SWING_PRE_CLOSE', 'SWING_CONFIRMED']),
    symbol: z.string().min(1),
    assetType: z.enum(['EQUITY', 'ETF', 'INDEX']).optional(),
    timeframe: z.string().min(1),
    timestamp: z.number().finite(),

    price: z
      .object({
        last: z.number().finite(),
        open: z.number().finite().optional(),
        high: z.number().finite().optional(),
        low: z.number().finite().optional(),
        close: z.number().finite().optional(),
      })
      .passthrough()
      .optional(),

    session: z
      .object({
        rth: z.boolean().optional(),
        orbQualified: z.boolean().optional(),
      })
      .passthrough()
      .optional(),

    structure: z
      .object({
        barType: z.string().min(1).optional(),
        signal: z.string().min(1).optional(),
        direction: z.enum(['LONG', 'SHORT']).optional(),
        refs: z
          .object({
            priorHigh: z.number().finite().optional(),
            priorLow: z.number().finite().optional(),
            signalHigh: z.number().finite().optional(),
            signalLow: z.number().finite().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),

    htf: z.any().optional(),

    orb: z
      .object({
        required: z.boolean().optional(),
        qualified: z.boolean().optional(),
        high: z.number().finite().optional(),
        low: z.number().finite().optional(),
        session: z.string().optional(),
      })
      .passthrough()
      .optional(),

    optionsHint: z
      .object({
        type: z.enum(['CALL', 'PUT']).optional(),
        expiryHint: z.enum(['0DTE', '1DTE', 'WEEKLY', 'AUTO']).optional(),
        dteDays: z.number().int().nonnegative().optional(),
        strikes: z
          .object({
            atm: z.number().finite().optional(),
            itm: z.number().finite().optional(),
            otm: z.number().finite().optional(),
            extraLow: z.number().finite().optional(),
            extraHigh: z.number().finite().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),

    diagnostics: z.any().optional(),
    vix: z.number().finite().optional(),
    confidence: z.number().finite().min(0).max(1).optional(),
  })
  .passthrough()

export type CanonicalFailed2ChainPayload = z.infer<typeof canonicalFailed2ChainSchema>


