import { prisma } from '@/lib/prisma'
import { TradierClient } from '@/providers/tradierClient'
import { AlpacaClient } from '@/providers/alpacaClient'

export type ExitReason = 'stop_loss' | 'take_profit' | 'expiry' | 'manual' | 'signal'

export class PositionManager {
  private tradier: TradierClient | null = null
  private alpaca: AlpacaClient | null = null

  constructor() {
    try {
      this.tradier = new TradierClient()
    } catch (e) {
      console.warn('Tradier client initialization failed:', e)
    }
    try {
      this.alpaca = new AlpacaClient()
    } catch (e) {
      console.warn('Alpaca client initialization failed:', e)
    }
  }

  /**
   * Monitor all open positions and check exit conditions
   */
  async monitorPositions(): Promise<{ checked: number; closed: number }> {
    const openPositions = await prisma.position.findMany({
      where: { status: 'OPEN' },
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
    })

    let checked = 0
    let closed = 0

    for (const position of openPositions) {
      checked++
      const shouldClose = await this.checkExitConditions(position)
      if (shouldClose) {
        await this.closePosition(position.id, shouldClose.reason, shouldClose.exitPrice)
        closed++
      }
    }

    return { checked, closed }
  }

  /**
   * Check if position should be closed based on exit conditions
   */
  async checkExitConditions(position: any): Promise<{ shouldClose: boolean; reason?: ExitReason; exitPrice?: number }> {
    // Check expiry first (highest priority)
    if (position.expiry && new Date(position.expiry) <= new Date()) {
      return {
        shouldClose: true,
        reason: 'expiry',
        exitPrice: position.currentPrice || position.entryPrice * 0.01, // Options expire worthless
      }
    }

    // Check if price is available
    if (!position.currentPrice) {
      return { shouldClose: false }
    }

    // Calculate P&L percentage
    const pnlPercent = position.direction === 'LONG'
      ? ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - position.currentPrice) / position.entryPrice) * 100

    // Check stop loss
    if (position.stopLoss) {
      if (position.direction === 'LONG' && position.currentPrice <= position.stopLoss) {
        return {
          shouldClose: true,
          reason: 'stop_loss',
          exitPrice: position.currentPrice,
        }
      }
      if (position.direction === 'SHORT' && position.currentPrice >= position.stopLoss) {
        return {
          shouldClose: true,
          reason: 'stop_loss',
          exitPrice: position.currentPrice,
        }
      }
    } else if (position.stopLossPercent) {
      // Use percentage-based stop loss
      const stopLossPrice = position.direction === 'LONG'
        ? position.entryPrice * (1 - position.stopLossPercent / 100)
        : position.entryPrice * (1 + position.stopLossPercent / 100)

      if (position.direction === 'LONG' && position.currentPrice <= stopLossPrice) {
        return {
          shouldClose: true,
          reason: 'stop_loss',
          exitPrice: position.currentPrice,
        }
      }
      if (position.direction === 'SHORT' && position.currentPrice >= stopLossPrice) {
        return {
          shouldClose: true,
          reason: 'stop_loss',
          exitPrice: position.currentPrice,
        }
      }
    }

    // Check take profit
    if (position.takeProfit) {
      if (position.direction === 'LONG' && position.currentPrice >= position.takeProfit) {
        return {
          shouldClose: true,
          reason: 'take_profit',
          exitPrice: position.currentPrice,
        }
      }
      if (position.direction === 'SHORT' && position.currentPrice <= position.takeProfit) {
        return {
          shouldClose: true,
          reason: 'take_profit',
          exitPrice: position.currentPrice,
        }
      }
    } else if (position.takeProfitPercent) {
      // Use percentage-based take profit
      const takeProfitPrice = position.direction === 'LONG'
        ? position.entryPrice * (1 + position.takeProfitPercent / 100)
        : position.entryPrice * (1 - position.takeProfitPercent / 100)

      if (position.direction === 'LONG' && position.currentPrice >= takeProfitPrice) {
        return {
          shouldClose: true,
          reason: 'take_profit',
          exitPrice: position.currentPrice,
        }
      }
      if (position.direction === 'SHORT' && position.currentPrice <= takeProfitPrice) {
        return {
          shouldClose: true,
          reason: 'take_profit',
          exitPrice: position.currentPrice,
        }
      }
    }

    return { shouldClose: false }
  }

  /**
   * Close a position and create trade outcome
   */
  async closePosition(positionId: string, reason: ExitReason, exitPrice?: number): Promise<void> {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        decision: {
          include: {
            signal: true,
          },
        },
      },
    })

    if (!position || position.status === 'CLOSED') {
      return
    }

    // Use provided exit price or current price
    const finalExitPrice = exitPrice || position.currentPrice || position.entryPrice

    // Calculate final P&L
    const pnl = position.direction === 'LONG'
      ? (finalExitPrice - position.entryPrice) * position.quantity * 100 // Options multiplier
      : (position.entryPrice - finalExitPrice) * position.quantity * 100

    const pnlPercent = position.direction === 'LONG'
      ? ((finalExitPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - finalExitPrice) / position.entryPrice) * 100

    // Calculate hold time in minutes
    const holdTime = Math.floor((Date.now() - position.openedAt.getTime()) / (1000 * 60))

    // Close position in database
    await prisma.position.update({
      where: { id: positionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        currentPrice: finalExitPrice,
        pnl,
        pnlPercent,
        exitReason: reason,
      },
    })

    // Create trade outcome for learning loop
    if (position.decisionId) {
      await prisma.tradeOutcome.create({
        data: {
          positionId,
          decisionId: position.decisionId,
          signalId: position.decision?.signalId || null,
          entryPrice: position.entryPrice,
          exitPrice: finalExitPrice,
          pnl,
          pnlPercent,
          holdTime,
          exitReason: reason,
        },
      })
    }

    // If execution is enabled, close position with broker
    if (process.env.EXECUTION_ENABLED === 'true') {
      try {
        await this.closePositionWithBroker(position, finalExitPrice)
      } catch (error: any) {
        console.error(`Failed to close position ${positionId} with broker:`, error.message)
        // Position is already closed in DB, so we continue
      }
    }

    // Update risk state
    await this.updateRiskState(pnl)

    console.log(`✅ Position ${positionId} closed: ${reason}, P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)
  }

  /**
   * Close position with broker (place opposite order)
   */
  private async closePositionWithBroker(position: any, exitPrice: number): Promise<void> {
    const broker = position.broker === 'tradier' ? this.tradier : this.alpaca
    if (!broker) {
      throw new Error(`${position.broker} client not available`)
    }

    // Construct option symbol (simplified - same as executor)
    const optionSymbol = this.constructOptionSymbol(
      position.symbol,
      position.strike!,
      position.direction === 'LONG' ? 'call' : 'put'
    )

    // Place opposite order to close
    const closeSide = position.direction === 'LONG' ? 'sell' : 'buy'

    await broker.placeOrder({
      symbol: optionSymbol,
      side: closeSide,
      quantity: position.quantity,
      orderType: 'market',
      instrumentType: position.instrumentType.toLowerCase() as 'option' | 'stock',
      strike: position.strike,
    })
  }

  /**
   * Construct option symbol (same logic as executor)
   */
  private constructOptionSymbol(underlying: string, strike: number, type: 'call' | 'put'): string {
    const strikeStr = strike.toFixed(0).padStart(8, '0')
    const typeCode = type === 'call' ? 'C' : 'P'
    return `${underlying}${strikeStr}${typeCode}`
  }

  /**
   * Update risk state with closed position P&L
   */
  private async updateRiskState(pnl: number): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.riskState.upsert({
      where: { date: today },
      create: {
        date: today,
        dailyPnL: pnl,
        dailyTrades: 1,
        openPositions: 0,
        totalRisk: 0,
      },
      update: {
        dailyPnL: { increment: pnl },
        dailyTrades: { increment: 1 },
        openPositions: await prisma.position.count({ where: { status: 'OPEN' } }),
      },
    })
  }
}

