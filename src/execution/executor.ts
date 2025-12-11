import { prisma } from '@/lib/prisma'
import { Decision } from '@/types/decision'
import { TradierClient } from '@/providers/tradierClient'
import { AlpacaClient } from '@/providers/alpacaClient'

export class ExecutionEngine {
  private tradier: TradierClient
  private alpaca: AlpacaClient
  private executionEnabled: boolean

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
    this.executionEnabled = process.env.EXECUTION_ENABLED === 'true'
  }

  async executeDecision(decision: Decision, decisionId: string): Promise<void> {
    if (decision.action === 'IGNORE') {
      return // No execution needed
    }

    if (!this.executionEnabled) {
      console.log(`[SIMULATION] Would execute: ${JSON.stringify(decision)}`)
      return
    }

    try {
      const broker = decision.broker === 'tradier' ? this.tradier : this.alpaca
      if (!broker) {
        throw new Error(`${decision.broker} client not available`)
      }

      // Construct order parameters
      // Note: For options, we need to construct the option symbol
      // This is simplified - in production, you'd need proper option symbol formatting
      const optionSymbol = this.constructOptionSymbol(
        decision.symbol,
        decision.strike!,
        decision.direction === 'LONG' ? 'call' : 'put'
      )

      const orderParams = {
        symbol: optionSymbol,
        side: decision.side.toLowerCase() as 'buy' | 'sell',
        quantity: decision.quantity,
        orderType: 'market' as const,
        instrumentType: decision.instrumentType.toLowerCase() as 'option' | 'stock',
        strike: decision.strike,
      }

      // Place order
      const brokerOrder = await broker.placeOrder(orderParams)

      // Store order in database
      await prisma.order.create({
        data: {
          decisionId,
          broker: decision.broker,
          brokerOrderId: brokerOrder.id,
          symbol: decision.symbol,
          instrumentType: decision.instrumentType,
          side: decision.side,
          quantity: decision.quantity,
          strike: decision.strike,
          orderType: 'MARKET',
          status: this.mapBrokerStatus(brokerOrder.status),
          brokerResponse: brokerOrder as any,
        },
      })

      // If filled immediately, create position
      if (brokerOrder.status === 'filled' && brokerOrder.avgFillPrice) {
        await this.createPosition(decision, decisionId, brokerOrder.avgFillPrice)
      }
    } catch (error: any) {
      console.error('Execution error:', error)

      // Store failed order
      await prisma.order.create({
        data: {
          decisionId,
          broker: decision.broker,
          symbol: decision.symbol,
          instrumentType: decision.instrumentType,
          side: decision.side,
          quantity: decision.quantity,
          strike: decision.strike,
          orderType: 'MARKET',
          status: 'REJECTED',
          error: error.message,
        },
      })
    }
  }

  private async createPosition(
    decision: Decision,
    decisionId: string,
    entryPrice: number
  ): Promise<void> {
    await prisma.position.create({
      data: {
        decisionId,
        broker: decision.broker,
        symbol: decision.symbol,
        instrumentType: decision.instrumentType,
        direction: decision.direction,
        quantity: decision.quantity,
        strike: decision.strike,
        entryPrice,
        status: 'OPEN',
      },
    })

    // Update decision as executed
    await prisma.decision.update({
      where: { id: decisionId },
      data: { executed: true },
    })
  }

  private constructOptionSymbol(
    underlying: string,
    strike: number,
    type: 'call' | 'put'
  ): string {
    // Simplified option symbol construction
    // In production, you'd need proper formatting based on broker requirements
    // This is a placeholder - actual implementation depends on broker API
    const strikeStr = strike.toFixed(0).padStart(8, '0')
    const typeCode = type === 'call' ? 'C' : 'P'
    // This is a simplified format - adjust based on actual broker requirements
    return `${underlying}${strikeStr}${typeCode}`
  }

  private mapBrokerStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      submitted: 'SUBMITTED',
      filled: 'FILLED',
      partial: 'PARTIAL',
      cancelled: 'CANCELLED',
      rejected: 'REJECTED',
    }
    return statusMap[status.toLowerCase()] || 'PENDING'
  }

  async updateOrderStatus(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order || !order.brokerOrderId) {
      return
    }

    try {
      const broker = order.broker === 'tradier' ? this.tradier : this.alpaca
      if (!broker) {
        throw new Error(`${order.broker} client not available`)
      }
      const brokerOrder = await broker.getOrderStatus(order.brokerOrderId)

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: this.mapBrokerStatus(brokerOrder.status),
          brokerResponse: brokerOrder as any,
        },
      })

      // If filled and position doesn't exist, create it
      if (
        brokerOrder.status === 'filled' &&
        brokerOrder.avgFillPrice &&
        order.status !== 'FILLED'
      ) {
        const decision = await prisma.decision.findUnique({
          where: { id: order.decisionId || '' },
        })

        if (decision) {
          await this.createPosition(
            {
              action: decision.action as any,
              symbol: decision.symbol,
              direction: decision.direction as any,
              instrumentType: decision.instrumentType as any,
              broker: decision.broker as any,
              strike: decision.strike || undefined,
              side: decision.side as 'BUY' | 'SELL',
              quantity: decision.quantity,
              meta: (decision.meta as any) || {},
            },
            decision.id,
            brokerOrder.avgFillPrice
          )
        }
      }
    } catch (error: any) {
      console.error(`Error updating order ${orderId}:`, error.message)
    }
  }
}

