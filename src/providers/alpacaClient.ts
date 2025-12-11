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

export class AlpacaClient {
  private client: AxiosInstance
  private accountId: string
  private isPaper: boolean

  constructor() {
    const apiKey = process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET
    const isPaper = process.env.ALPACA_PAPER === 'true'
    const baseURL = isPaper
      ? 'https://paper-api.alpaca.markets/v2'
      : 'https://api.alpaca.markets/v2'

    if (!apiKey || !apiSecret) {
      console.warn('ALPACA_API_KEY and ALPACA_API_SECRET not set - Alpaca client will not function')
      this.accountId = ''
      this.isPaper = false
      this.client = axios.create({ baseURL })
      return
    }

    this.accountId = ''
    this.isPaper = isPaper
    this.client = axios.create({
      baseURL,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    })
  }

  async getQuote(symbol: string): Promise<Quote> {
    try {
      const response = await this.client.get(`/stocks/${symbol}/quotes/latest`)

      const quote = response.data.quote
      return {
        symbol: quote.S,
        bid: parseFloat(quote.bp) || 0,
        ask: parseFloat(quote.ap) || 0,
        last: parseFloat(quote.p) || 0,
        volume: parseInt(quote.z) || 0,
        timestamp: new Date(quote.t),
      }
    } catch (error: any) {
      // Fallback to snapshot if quotes endpoint fails
      try {
        const snapshot = await this.client.get(`/stocks/${symbol}/snapshot`)
        const data = snapshot.data
        return {
          symbol,
          bid: data.latestQuote?.bp || data.latestTrade?.p || 0,
          ask: data.latestQuote?.ap || data.latestTrade?.p || 0,
          last: data.latestTrade?.p || 0,
          volume: data.latestTrade?.s || 0,
          timestamp: new Date(data.latestTrade?.t || Date.now()),
        }
      } catch (fallbackError: any) {
        console.error(`Alpaca getQuote error for ${symbol}:`, fallbackError.message)
        throw fallbackError
      }
    }
  }

  async getOHLC(params: OHLCParams): Promise<OHLC[]> {
    try {
      const timeframeMap: Record<string, string> = {
        '1min': '1Min',
        '5min': '5Min',
        '15min': '15Min',
        '1day': '1Day',
      }

      const timeframe = timeframeMap[params.timeframe] || '1Min'
      const limit = params.lookback || 100

      const response = await this.client.get(`/stocks/${params.symbol}/bars`, {
        params: {
          timeframe,
          limit,
        },
      })

      const bars = response.data.bars || []
      return bars.map((bar: any) => ({
        symbol: params.symbol,
        timestamp: new Date(bar.t),
        open: parseFloat(bar.o),
        high: parseFloat(bar.h),
        low: parseFloat(bar.l),
        close: parseFloat(bar.c),
        volume: parseInt(bar.v) || 0,
      }))
    } catch (error: any) {
      console.error(`Alpaca getOHLC error for ${params.symbol}:`, error.message)
      return []
    }
  }

  async getOptionsChain(params: OptionsChainParams): Promise<OptionsChain> {
    // Alpaca options API may vary - this is a placeholder structure
    try {
      // Note: Alpaca's options API structure may differ
      // This is a simplified implementation
      const response = await this.client.get(`/options/contracts`, {
        params: {
          underlying_symbol: params.symbol,
        },
      })

      const contracts = (response.data.contracts || []).map((opt: any) => ({
        symbol: opt.symbol,
        strike: parseFloat(opt.strike_price),
        expiry: new Date(opt.expiration_date),
        type: opt.option_type as 'call' | 'put',
        bid: parseFloat(opt.bid) || 0,
        ask: parseFloat(opt.ask) || 0,
        last: parseFloat(opt.last) || 0,
        volume: parseInt(opt.volume) || 0,
        openInterest: parseInt(opt.open_interest) || 0,
      }))

      return {
        symbol: params.symbol,
        contracts,
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error(`Alpaca getOptionsChain error for ${params.symbol}:`, error.message)
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
        symbol: params.symbol,
        side: params.side,
        qty: params.quantity,
        type: params.orderType,
        time_in_force: 'day',
      }

      if (params.orderType === 'limit' && params.limitPrice) {
        orderParams.limit_price = params.limitPrice
      }

      const response = await this.client.post('/orders', orderParams)

      return {
        id: response.data.id,
        status: this.mapOrderStatus(response.data.status),
        filledQuantity: response.data.filled_qty,
        avgFillPrice: response.data.filled_avg_price,
      }
    } catch (error: any) {
      console.error('Alpaca placeOrder error:', error.message)
      throw error
    }
  }

  async getOrderStatus(orderId: string): Promise<BrokerOrder> {
    try {
      const response = await this.client.get(`/orders/${orderId}`)

      return {
        id: response.data.id,
        status: this.mapOrderStatus(response.data.status),
        filledQuantity: response.data.filled_qty,
        avgFillPrice: response.data.filled_avg_price,
        error: response.data.error_message,
      }
    } catch (error: any) {
      console.error(`Alpaca getOrderStatus error for ${orderId}:`, error.message)
      throw error
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.delete(`/orders/${orderId}`)
    } catch (error: any) {
      console.error(`Alpaca cancelOrder error for ${orderId}:`, error.message)
      throw error
    }
  }

  private mapOrderStatus(status: string): BrokerOrder['status'] {
    const statusMap: Record<string, BrokerOrder['status']> = {
      new: 'pending',
      accepted: 'submitted',
      pending_new: 'pending',
      filled: 'filled',
      partially_filled: 'partial',
      canceled: 'cancelled',
      rejected: 'rejected',
    }
    return statusMap[status.toLowerCase()] || 'pending'
  }
}

