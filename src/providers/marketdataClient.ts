import axios, { AxiosInstance } from 'axios'
import { OptionsChain, OptionsChainParams, OptionContract } from './base'

export class MarketDataClient {
  private client: AxiosInstance
  private apiKey: string

  constructor() {
    const apiKey = process.env.MARKETDATA_API_KEY
    if (!apiKey) {
      console.warn('MARKETDATA_API_KEY not set - MarketData client will not function')
      this.apiKey = ''
      this.client = axios.create({
        baseURL: 'https://api.marketdata.app/v1',
      })
      return
    }

    this.apiKey = apiKey
    this.client = axios.create({
      baseURL: 'https://api.marketdata.app/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
  }

  async getOptionsChain(params: OptionsChainParams): Promise<OptionsChain> {
    if (!this.apiKey) {
      console.warn('MarketData API key not configured, returning empty chain')
      return {
        symbol: params.symbol,
        contracts: [],
        timestamp: new Date(),
      }
    }
    try {
      // MarketData.app API structure - adjust based on actual API docs
      const response = await this.client.get(`/options/chain/${params.symbol}`)

      const contracts = (response.data.options || []).map((opt: any) => ({
        symbol: opt.symbol,
        strike: parseFloat(opt.strike),
        expiry: new Date(opt.expiration),
        type: opt.type as 'call' | 'put',
        bid: parseFloat(opt.bid) || 0,
        ask: parseFloat(opt.ask) || 0,
        last: parseFloat(opt.last) || 0,
        volume: parseInt(opt.volume) || 0,
        openInterest: parseInt(opt.openInterest) || 0,
        iv: opt.iv ? parseFloat(opt.iv) : undefined,
        delta: opt.greeks?.delta ? parseFloat(opt.greeks.delta) : undefined,
        gamma: opt.greeks?.gamma ? parseFloat(opt.greeks.gamma) : undefined,
        theta: opt.greeks?.theta ? parseFloat(opt.greeks.theta) : undefined,
        vega: opt.greeks?.vega ? parseFloat(opt.greeks.vega) : undefined,
      }))

      // Apply filters
      let filteredContracts = contracts

      if (params.expiryFilters) {
        const now = new Date()
        filteredContracts = filteredContracts.filter((c: OptionContract) => {
          const dte = Math.ceil((c.expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (params.expiryFilters!.minDTE && dte < params.expiryFilters!.minDTE) return false
          if (params.expiryFilters!.maxDTE && dte > params.expiryFilters!.maxDTE) return false
          return true
        })
      }

      if (params.side) {
        filteredContracts = filteredContracts.filter((c: OptionContract) => c.type === params.side)
      }

      return {
        symbol: params.symbol,
        contracts: filteredContracts,
        timestamp: new Date(),
      }
    } catch (error: any) {
      console.error(`MarketData getOptionsChain error for ${params.symbol}:`, error.message)
      return {
        symbol: params.symbol,
        contracts: [],
        timestamp: new Date(),
      }
    }
  }
}

