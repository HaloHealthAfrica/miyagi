import { z } from 'zod'

const sideSchema = z.enum(['LONG', 'SHORT'])
const optionTypeSchema = z.enum(['CALL', 'PUT'])

const strikesSchema = z.object({
  atm: z.number().finite().optional(),
  itm: z.number().finite().optional(),
  otm: z.number().finite().optional(),
  extraLow: z.number().finite().optional(),
  extraHigh: z.number().finite().optional(),
})

const htfSchema = z
  .object({
    mode: z.enum(['either', 'both']).optional(),
    '4h': z
      .object({
        bull: z.boolean().optional(),
        bear: z.boolean().optional(),
      })
      .optional(),
    d1: z
      .object({
        bull: z.boolean().optional(),
        bear: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough()
  .optional()

const orbSchema = z
  .object({
    required: z.boolean().optional(),
    qualified: z.boolean().optional(),
    high: z.number().finite().optional(),
    low: z.number().finite().optional(),
  })
  .passthrough()
  .optional()

/**
 * Strategy-specific adapter for Failed2ChainSwing events.
 * This validates the extra fields used by the strategy while preserving unknown keys.
 */
export const failed2ChainPayloadSchema = z
  .object({
    event: z.enum(['failed_2u', 'failed_2d', 'chain_2u_f2u_2d']),
    symbol: z.string().min(1),
    // accept platform variations, but do not rely on them elsewhere
    tf: z.string().min(1).optional(),
    ts: z.number().finite().optional(),
    price: z.number().finite(),
    side: sideSchema,
    optionType: optionTypeSchema.optional(),
    dteDays: z.number().int().nonnegative().optional(),
    strikes: strikesSchema.optional(),
    htf: htfSchema,
    orb: orbSchema,
    // optional context inputs
    confidence: z.number().finite().min(0).max(1).optional(),
    vix: z.number().finite().optional(),
  })
  .passthrough()

export type Failed2ChainPayload = z.infer<typeof failed2ChainPayloadSchema>


