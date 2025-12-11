import { prisma } from '@/lib/prisma'
import { ExecutionEngine } from '@/execution/executor'

export class OrderPoller {
  private executionEngine: ExecutionEngine

  constructor() {
    this.executionEngine = new ExecutionEngine()
  }

  /**
   * Poll all pending/submitted orders and update their status
   */
  async pollPendingOrders(): Promise<{ checked: number; updated: number; filled: number }> {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'SUBMITTED', 'PARTIAL'],
        },
      },
      include: {
        decision: true,
      },
    })

    let checked = 0
    let updated = 0
    let filled = 0

    for (const order of pendingOrders) {
      checked++
      try {
        const wasFilled = await this.updateOrderStatus(order.id)
        updated++
        if (wasFilled) {
          filled++
        }
      } catch (error: any) {
        console.error(`Error polling order ${order.id}:`, error.message)
      }
    }

    return { checked, updated, filled }
  }

  /**
   * Update order status from broker
   */
  async updateOrderStatus(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        decision: true,
      },
    })

    if (!order || !order.brokerOrderId) {
      return false
    }

    // Use execution engine's update method
    await this.executionEngine.updateOrderStatus(orderId)

    // Check if order was filled
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (updatedOrder?.status === 'FILLED') {
      // Check if position already exists
      const existingPosition = await prisma.position.findFirst({
        where: {
          decisionId: order.decisionId,
          status: 'OPEN',
        },
      })

      if (!existingPosition && updatedOrder.brokerResponse) {
        // Create position from filled order
        const brokerResponse = updatedOrder.brokerResponse as any
        const fillPrice = brokerResponse.avgFillPrice || brokerResponse.avg_fill_price || brokerResponse.price

        if (fillPrice && order.decisionId && order.decision) {
          await this.createPositionFromOrder(order, fillPrice)
          return true
        }
      }
    }

    return updatedOrder?.status === 'FILLED'
  }

  /**
   * Create position from filled order
   */
  private async createPositionFromOrder(order: any, fillPrice: number): Promise<void> {
    if (!order.decision) {
      return
    }

    const decision = order.decision

    // Calculate stop loss and take profit if not set
    const stopLossPercent = 5.0 // Default 5% stop loss
    const takeProfitPercent = 10.0 // Default 10% take profit

    const stopLoss = decision.direction === 'LONG'
      ? fillPrice * (1 - stopLossPercent / 100)
      : fillPrice * (1 + stopLossPercent / 100)

    const takeProfit = decision.direction === 'LONG'
      ? fillPrice * (1 + takeProfitPercent / 100)
      : fillPrice * (1 - takeProfitPercent / 100)

    await prisma.position.create({
      data: {
        decisionId: decision.id,
        strategyId: decision.strategyId,
        broker: decision.broker,
        symbol: decision.symbol,
        instrumentType: decision.instrumentType,
        direction: decision.direction,
        quantity: decision.quantity,
        strike: decision.strike,
        entryPrice: fillPrice,
        currentPrice: fillPrice,
        stopLoss,
        takeProfit,
        stopLossPercent,
        takeProfitPercent,
        status: 'OPEN',
        lastPriceUpdate: new Date(),
      },
    })

    // Update decision as executed
    await prisma.decision.update({
      where: { id: decision.id },
      data: { executed: true },
    })

    console.log(`✅ Position created from filled order ${order.id} at $${fillPrice}`)
  }
}

