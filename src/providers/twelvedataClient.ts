import axios, { AxiosInstance } from 'axios'
import { Quote, OHLC, OHLCParams } from './base'

export class TwelveDataClient {
  private client: AxiosInstance
  private apiKey: string

  constructor() {
    const apiKey = process.env.TWELVEDATA_API_KEY
    if (!apiKey) {
      console.warn('TWELVEDATA_API_KEY not set - TwelveData client will not function')
      this.apiKey = ''
      this.client = axios.create({
        baseURL: 'https://api.twelvedata.com',
      })
      return
    }

    this.apiKey = apiKey
    this.client = axios.create({
      baseURL: 'https://api.twelvedata.com',
    })
  }

  async getQuote(symbol: string): Promise<Quote> {
    if (!this.apiKey) {
      throw new Error('TwelveData API key not configured')
    }
    try {
      const response = await this.client.get('/quote', {
        params: {
          symbol,
          apikey: this.apiKey,
        },
      })

      const data = response.data
      return {
        symbol: data.symbol,
        bid: parseFloat(data.bid_price) || 0,
        ask: parseFloat(data.ask_price) || 0,
        last: parseFloat(data.close) || 0,
        volume: parseInt(data.volume) || 0,
        timestamp: new Date(data.timestamp || Date.now()),
      }
    } catch (error: any) {
      console.error(`TwelveData getQuote error for ${symbol}:`, error.message)
      throw error
    }
  }

  async getOHLC(params: OHLCParams): Promise<OHLC[]> {
    try {
      const intervalMap: Record<string, string> = {
        '1min': '1min',
        '5min': '5min',
        '15min': '15min',
        '1day': '1day',
      }

      const interval = intervalMap[params.timeframe] || '1min'
      const outputsize = params.lookback || 100

      const response = await this.client.get('/time_series', {
        params: {
          symbol: params.symbol,
          interval,
          outputsize,
          apikey: this.apiKey,
          format: 'JSON',
        },
      })

      const values = response.data.values || []
      return values
        .reverse() // TwelveData returns newest first, reverse for chronological order
        .map((bar: any) => ({
          symbol: params.symbol,
          timestamp: new Date(bar.datetime),
          open: parseFloat(bar.open),
          high: parseFloat(bar.high),
          low: parseFloat(bar.low),
          close: parseFloat(bar.close),
          volume: parseInt(bar.volume) || 0,
        }))
    } catch (error: any) {
      console.error(`TwelveData getOHLC error for ${params.symbol}:`, error.message)
      return []
    }
  }
}

