import { prisma } from '@/lib/prisma'
import { TradierClient } from '@/providers/tradierClient'
import { AlpacaClient } from '@/providers/alpacaClient'
import { TwelveDataClient } from '@/providers/twelvedataClient'
import { MarketDataClient } from '@/providers/marketdataClient'

export class PriceUpdater {
  private tradier: TradierClient | null = null
  private alpaca: AlpacaClient | null = null
  private twelvedata: TwelveDataClient | null = null
  private marketdata: MarketDataClient | null = null

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
    try {
      this.twelvedata = new TwelveDataClient()
    } catch (e) {
      console.warn('TwelveData client initialization failed:', e)
    }
    try {
      this.marketdata = new MarketDataClient()
    } catch (e) {
      console.warn('MarketData client initialization failed:', e)
    }
  }

  /**
   * Update prices for all open positions
   */
  async updateAllPositions(): Promise<{ updated: number; failed: number }> {
    const openPositions = await prisma.position.findMany({
      where: { status: 'OPEN' },
    })

    let updated = 0
    let failed = 0

    for (const position of openPositions) {
      try {
        await this.updatePositionPrice(position.id)
        updated++
      } catch (error: any) {
        console.error(`Failed to update price for position ${position.id}:`, error.message)
        failed++
      }
    }

    return { updated, failed }
  }

  /**
   * Update price for a single position
   */
  async updatePositionPrice(positionId: string): Promise<void> {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    })

    if (!position || position.status !== 'OPEN') {
      return
    }

    let currentPrice: number | null = null

    try {
      if (position.instrumentType === 'OPTION') {
        // For options, try to get option price from broker or market data
        currentPrice = await this.getOptionPrice(position)
      } else {
        // For stocks, get quote
        currentPrice = await this.getStockPrice(position.symbol)
      }

      if (currentPrice && currentPrice > 0) {
        // Recalculate P&L
        const { pnl, pnlPercent } = this.recalculatePnL(position, currentPrice)

        // Update position
        await prisma.position.update({
          where: { id: positionId },
          data: {
            currentPrice,
            pnl,
            pnlPercent,
            lastPriceUpdate: new Date(),
          },
        })
      }
    } catch (error: any) {
      console.error(`Error updating price for position ${positionId}:`, error.message)
      throw error
    }
  }

  /**
   * Get option price from broker or market data
   */
  private async getOptionPrice(position: any): Promise<number | null> {
    // Try broker first
    if (position.broker === 'tradier' && this.tradier) {
      try {
        // Construct option symbol
        const optionSymbol = this.constructOptionSymbol(
          position.symbol,
          position.strike!,
          position.direction === 'LONG' ? 'call' : 'put'
        )
        const quote = await this.tradier.getQuote(optionSymbol)
        if (quote && quote.last > 0) {
          return quote.last
        }
      } catch (e) {
        // Fall through to market data
      }
    }

    // Try market data provider
    if (this.marketdata && position.strike) {
      try {
        const chain = await this.marketdata.getOptionsChain({
          symbol: position.symbol,
          side: position.direction === 'LONG' ? 'call' : 'put',
        })

        // Find matching contract
        const contract = chain.contracts.find(
          (c: any) => c.strike === position.strike && c.expiry >= new Date()
        )

        if (contract && contract.lastPrice) {
          return contract.lastPrice
        }
      } catch (e) {
        // Fall through
      }
    }

    // Fallback: estimate from underlying price (rough approximation)
    if (this.twelvedata) {
      try {
        const underlyingQuote = await this.twelvedata.getQuote(position.symbol)
        if (underlyingQuote && underlyingQuote.last > 0) {
          // Very rough estimate: intrinsic value only
          const intrinsicValue = position.direction === 'LONG'
            ? Math.max(0, underlyingQuote.last - position.strike!)
            : Math.max(0, position.strike! - underlyingQuote.last)
          return intrinsicValue * 0.5 // Rough estimate with time value
        }
      } catch (e) {
        // Return null if all fail
      }
    }

    return null
  }

  /**
   * Get stock price
   */
  private async getStockPrice(symbol: string): Promise<number | null> {
    // Try TwelveData first
    if (this.twelvedata) {
      try {
        const quote = await this.twelvedata.getQuote(symbol)
        if (quote && quote.last > 0) {
          return quote.last
        }
      } catch (e) {
        // Fall through
      }
    }

    // Try Tradier
    if (this.tradier) {
      try {
        const quote = await this.tradier.getQuote(symbol)
        if (quote && quote.last > 0) {
          return quote.last
        }
      } catch (e) {
        // Fall through
      }
    }

    // Try Alpaca
    if (this.alpaca) {
      try {
        const quote = await this.alpaca.getQuote(symbol)
        if (quote && quote.last > 0) {
          return quote.last
        }
      } catch (e) {
        // Return null if all fail
      }
    }

    return null
  }

  /**
   * Recalculate P&L based on current price
   */
  recalculatePnL(position: any, currentPrice: number): { pnl: number; pnlPercent: number } {
    const pnl = position.direction === 'LONG'
      ? (currentPrice - position.entryPrice) * position.quantity * 100 // Options multiplier
      : (position.entryPrice - currentPrice) * position.quantity * 100

    const pnlPercent = position.direction === 'LONG'
      ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - currentPrice) / position.entryPrice) * 100

    return { pnl, pnlPercent }
  }

  /**
   * Construct option symbol
   */
  private constructOptionSymbol(underlying: string, strike: number, type: 'call' | 'put'): string {
    const strikeStr = strike.toFixed(0).padStart(8, '0')
    const typeCode = type === 'call' ? 'C' : 'P'
    return `${underlying}${strikeStr}${typeCode}`
  }
}

