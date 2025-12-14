import type { Failed2ChainNormalized } from '@/trading/failed2chain/normalizeFailed2ChainPayload'

export type GovernorResult = {
  allowed: boolean
  sizeMultiplier: number
  reasonCodes: string[]
}

export function evaluateFailed2ChainGovernor(input: {
  payload: Failed2ChainNormalized
  nowNyMinutes: number
  lossesToday: number
  attemptsAtLevel: number
  vix?: number
}): GovernorResult {
  const { payload, nowNyMinutes, lossesToday, attemptsAtLevel } = input
  const vix = input.vix

  const reasonCodes: string[] = []
  let allowed = true
  let sizeMultiplier = 1

  // Lunch chop window block (11:30–13:30 ET) for intraday events
  if (nowNyMinutes >= 11 * 60 + 30 && nowNyMinutes <= 13 * 60 + 30) {
    allowed = false
    reasonCodes.push('BLOCK_LUNCH_CHOP')
  }

  // Prefer chain signals during 10:00–11:30 ET (not a block; boosts confidence via size)
  if (payload.event === 'chain_2u_f2u_2d') {
    if (nowNyMinutes >= 10 * 60 && nowNyMinutes <= 11 * 60 + 30) {
      reasonCodes.push('PREFERRED_CHAIN_WINDOW')
    }
  }

  // Max attempts at level per symbol
  if (attemptsAtLevel >= 2) {
    allowed = false
    reasonCodes.push('BLOCK_MAX_ATTEMPTS_AT_LEVEL')
  }

  // Loss streak throttling
  if (lossesToday >= 3) {
    allowed = false
    reasonCodes.push('BLOCK_LOSS_STREAK')
  } else if (lossesToday >= 2) {
    sizeMultiplier *= 0.5
    reasonCodes.push('THROTTLE_LOSS_STREAK_HALF_SIZE')
  }

  // Volatility guard: if VIX > 25, block failed_2* events, allow chain with reduced size
  if (typeof vix === 'number' && Number.isFinite(vix) && vix > 25) {
    if (payload.event === 'failed_2u' || payload.event === 'failed_2d') {
      allowed = false
      reasonCodes.push('BLOCK_VIX_GT_25')
    } else {
      sizeMultiplier *= 0.5
      reasonCodes.push('THROTTLE_CHAIN_VIX_GT_25')
    }
  } else if (vix == null) {
    reasonCodes.push('VIX_UNAVAILABLE')
  }

  return { allowed, sizeMultiplier, reasonCodes }
}


