import axios, { AxiosInstance } from 'axios'
import {
  Quote,
  OHLC,
  OHLCParams,
  OptionsChain,
  OptionsChainParams,
  OrderParams,
  BrokerOrder,
} from './base'

export class TradierClient {
  private client: AxiosInstance
  private accountId: string

  constructor() {
    const apiKey = process.env.TRADIER_API_KEY
    const accountId = process.env.TRADIER_ACCOUNT_ID
    const baseURL = process.env.TRADIER_BASE_URL || 'https://api.tradier.com/v1'

    if (!apiKey || !accountId) {
      console.warn('TRADIER_API_KEY and TRADIER_ACCOUNT_ID not set - Tradier client will not function')
      this.accountId = ''
      this.client = axios.create({ baseURL })
      return
    }

    this.accountId = accountId
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
  }

  async getQuote(symbol: string): Promise<Quote> {
    try {
      const response = await this.client.get('/markets/quotes', {
        params: { symbols: symbol },
      })

      const quote = response.data.quotes?.quote
      if (!quote) {
        throw new Error(`No quote data for ${symbol}`)
      }

      return {
        symbol: quote.symbol,
        bid: parseFloat(quote.bid) || 0,
        ask: parseFloat(quote.ask) || 0,
        last: parseFloat(quote.last) || 0,
        volume: parseInt(quote.volume) || 0,
        timestamp: new Date(quote.timestamp || Date.now()),
      }
    } catch (error: any) {
      console.error(`Tradier getQuote error for ${symbol}:`, error.message)
      throw error
    }
  }

  async getOHLC(params: OHLCParams): Promise<OHLC[]> {
    try {
      const interval = params.timeframe === '1day' ? 'daily' : '1min'
      const response = await this.client.get('/markets/history', {
        params: {
          symbol: params.symbol,
          interval,
        },
      })

      const history = response.data.history?.day || response.data.history?.day
      if (!history || !Array.isArray(history)) {
        return []
      }

      return history.slice(-(params.lookback || 100)).map((bar: any) => ({
        symbol: params.symbol,
        timestamp: new Date(bar.date),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseInt(bar.volume) || 0,
      }))
    } catch (error: any) {
      console.error(`Tradier getOHLC error for ${params.symbol}:`, error.message)
      return []
    }
  }

  async getOptionsChain(params: OptionsChainParams): Promise<OptionsChain> {
    try {
      const response = await this.client.get('/markets/options/chains', {
        params: {
          symbol: params.symbol,
        },
      })

      const options = response.data.options?.option || []
      const contracts = options
        .map((opt: any) => {
          const expiry = new Date(opt.expiration_date)
          const now = new Date()
          const dte = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          // Apply filters
          if (params.expiryFilters) {
            if (params.expiryFilters.minDTE && dte < params.expiryFilters.minDTE) return null
            if (params.expiryFilters.maxDTE && dte > params.expiryFilters.maxDTE) return null
          }

          return {
            symbol: opt.symbol,
            strike: parseFloat(opt.strike),
            expiry,
            type: opt.option_type as 'call' | 'put',
            bid: parseFloat(opt.bid) || 0,
            ask: parseFloat(opt.ask) || 0,
            last: parseFloat(opt.last) || 0,
            volume: parseInt(opt.volume) || 0,
            openInterest: parseInt(opt.open_interest) || 0,
            iv: opt.greeks?.mid_iv ? parseFloat(opt.greeks.mid_iv) : undefined,
            delta: opt.greeks?.delta ? parseFloat(opt.greeks.delta) : undefined,
            gamma: opt.greeks?.gamma ? parseFloat(opt.greeks.gamma) : undefined,
            theta: opt.greeks?.theta ? parseFloat(opt.greeks.theta) : undefined,
            vega: opt.greeks?.vega ? parseFloat(opt.greeks.vega) : undefined,
          }
        })
        .filter((c: any) => c !== null)

      // Apply moneyness filter if provided
      if (params.moneynessFilters && contracts.length > 0) {
        // Would need current underlying price to calculate moneyness
        // For now, just return all contracts
      }

      // Filter by side if provided
      const filteredContracts = params.side
        ? contracts.filter((c: any) => c.type === params.side)
        : contracts

      return {
        symbol: params.symbol,
        contracts: filteredContracts,
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error(`Tradier getOptionsChain error for ${params.symbol}:`, error.message)
      return {
        symbol: params.symbol,
        contracts: [],
        timestamp: new Date(),
      }
    }
  }

  async placeOrder(params: OrderParams): Promise<BrokerOrder> {
    try {
      const orderParams: any = {
        class: params.instrumentType === 'option' ? 'option' : 'equity',
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        type: params.orderType,
      }

      if (params.orderType === 'limit' && params.limitPrice) {
        orderParams.price = params.limitPrice
      }

      if (params.instrumentType === 'option') {
        // For options, symbol should be the option symbol, not underlying
        // This would need to be constructed from strike + expiry
      }

      const response = await this.client.post(`/accounts/${this.accountId}/orders`, orderParams)

      const order = response.data.order
      return {
        id: order.id,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filled_quantity,
        avgFillPrice: order.avg_fill_price,
        error: order.reject_reason,
      }
    } catch (error: any) {
      console.error('Tradier placeOrder error:', error.message)
      throw error
    }
  }

  async getOrderStatus(orderId: string): Promise<BrokerOrder> {
    try {
      const response = await this.client.get(`/accounts/${this.accountId}/orders/${orderId}`)

      const order = response.data.order
      return {
        id: order.id,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filled_quantity,
        avgFillPrice: order.avg_fill_price,
        error: order.reject_reason,
      }
    } catch (error: any) {
      console.error(`Tradier getOrderStatus error for ${orderId}:`, error.message)
      throw error
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.delete(`/accounts/${this.accountId}/orders/${orderId}`)
    } catch (error: any) {
      console.error(`Tradier cancelOrder error for ${orderId}:`, error.message)
      throw error
    }
  }

  private mapOrderStatus(status: string): BrokerOrder['status'] {
    const statusMap: Record<string, BrokerOrder['status']> = {
      pending: 'pending',
      open: 'submitted',
      filled: 'filled',
      partial: 'partial',
      canceled: 'cancelled',
      rejected: 'rejected',
    }
    return statusMap[status.toLowerCase()] || 'pending'
  }
}

