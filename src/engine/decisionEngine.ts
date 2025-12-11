import { prisma } from '@/lib/prisma'
import { TradingViewSignal, CoreSignal, RunnerSignal, ScannerSignal } from '@/types/tradingview'
import { Decision, Direction, Broker } from '@/types/decision'
import { PositionStateMachine } from './stateMachine'
import { TradierClient } from '@/providers/tradierClient'
import { AlpacaClient } from '@/providers/alpacaClient'
import { TwelveDataClient } from '@/providers/twelvedataClient'
import { MarketDataClient } from '@/providers/marketdataClient'
import { OptionContract } from '@/providers/base'

export class DecisionEngine {
  private tradier: TradierClient | null = null
  private alpaca: AlpacaClient | null = null
  private twelvedata: TwelveDataClient | null = null
  private marketdata: MarketDataClient | null = null
  private basePositionSize: number
  private executionEnabled: boolean

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
    this.basePositionSize = parseInt(process.env.BASE_POSITION_SIZE || '2')
    this.executionEnabled = process.env.EXECUTION_ENABLED === 'true'
  }

  async processSignal(signal: TradingViewSignal, strategyId?: string): Promise<Decision> {
    // Store signal first
    const storedSignal = await prisma.signal.create({
      data: {
        type: signal.type,
        direction: 'direction' in signal ? signal.direction : null,
        signal: 'signal' in signal ? signal.signal : 'scanner',
        tf: 'tf' in signal ? signal.tf : null,
        strikeHint: 'strike_hint' in signal ? signal.strike_hint : null,
        riskMult: 'risk_mult' in signal ? signal.risk_mult : null,
        miyagi: 'miyagi' in signal ? signal.miyagi : null,
        daily: 'daily' in signal ? signal.daily : null,
        symbol: 'symbol' in signal ? signal.symbol : null,
        newBias: 'new_bias' in signal ? signal.new_bias : null,
        rawPayload: signal as any,
        timestamp: new Date(signal.timestamp),
        strategyId,
      },
    })

    try {
      let decision: Decision

      switch (signal.type) {
        case 'core':
          decision = await this.processCoreSignal(signal as CoreSignal)
          break
        case 'runner':
          decision = await this.processRunnerSignal(signal as RunnerSignal)
          break
        case 'scanner':
          decision = await this.processScannerSignal(signal as ScannerSignal)
          break
        default:
          decision = {
            action: 'IGNORE',
            symbol: 'UNKNOWN',
            direction: 'LONG',
            instrumentType: 'OPTION',
            broker: 'tradier',
            side: 'BUY',
            quantity: 0,
            meta: { sourceSignal: 'unknown' },
            reasoning: 'Unknown signal type',
          }
      }

      // Store decision
      await prisma.decision.create({
        data: {
          signalId: storedSignal.id,
          strategyId,
          action: decision.action,
          symbol: decision.symbol,
          direction: decision.direction,
          instrumentType: decision.instrumentType,
          broker: decision.broker,
          strike: decision.strike,
          side: decision.side,
          quantity: decision.quantity,
          meta: decision.meta as any,
          reasoning: decision.reasoning,
        },
      })

      // Mark signal as processed
      await prisma.signal.update({
        where: { id: storedSignal.id },
        data: { processed: true },
      })

      return decision
    } catch (error: any) {
      console.error('Error processing signal:', error)
      // Mark signal as processed even on error
      await prisma.signal.update({
        where: { id: storedSignal.id },
        data: { processed: true },
      })

      return {
        action: 'IGNORE',
        symbol: 'UNKNOWN',
        direction: 'LONG',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'BUY',
        quantity: 0,
        meta: { sourceSignal: storedSignal.signal },
        reasoning: `Error: ${error.message}`,
      }
    }
  }

  private async processCoreSignal(signal: CoreSignal): Promise<Decision> {
    const symbol = this.inferSymbol(signal)
    const stateMachine = new PositionStateMachine(symbol)
    await stateMachine.initialize()

    // Check position state constraints
    if (signal.direction === 'long' && !stateMachine.canOpenLong()) {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'LONG',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'BUY',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: `Cannot open LONG: current state is ${stateMachine.getState()}`,
      }
    }

    if (signal.direction === 'short' && !stateMachine.canOpenShort()) {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'SHORT',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: `Cannot open SHORT: current state is ${stateMachine.getState()}`,
      }
    }

    // Validate macro bias
    if (signal.miyagi === 'BEAR' && signal.direction === 'long') {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'LONG',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'BUY',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'Macro bias BEAR conflicts with LONG signal',
      }
    }

    if (signal.miyagi === 'BULL' && signal.direction === 'short') {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'SHORT',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'Macro bias BULL conflicts with SHORT signal',
      }
    }

    // Check scanner state
    const scannerBias = await this.getScannerBias()
    const conflictingBias = this.checkScannerConflict(signal.direction, scannerBias)
    if (conflictingBias) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal, scannerBias },
        reasoning: `Scanner bias conflict: ${conflictingBias}`,
      }
    }

    // Fetch market data for validation
    let quote, ohlc, optionsChain
    try {
      if (!this.twelvedata) {
        throw new Error('TwelveData client not available')
      }
      quote = await this.twelvedata.getQuote(symbol)
      ohlc = await this.twelvedata.getOHLC({ symbol, timeframe: '5min', lookback: 20 })
      
      if (!this.marketdata) {
        throw new Error('MarketData client not available')
      }
      optionsChain = await this.marketdata.getOptionsChain({
        symbol,
        expiryFilters: { minDTE: 0, maxDTE: 45 },
        side: signal.direction === 'long' ? 'call' : 'put',
      })
    } catch (error: any) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: `Failed to fetch market data: ${error.message}`,
      }
    }

    // Validate price data
    if (!quote || quote.last === 0) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'Invalid or stale price data',
      }
    }

    // Select option contract
    const selectedContract = this.selectOptionContract(
      optionsChain.contracts,
      signal.strike_hint,
      signal.direction
    )

    if (!selectedContract) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'No suitable option contract found',
      }
    }

    // Calculate position size
    const quantity = this.calculatePositionSize(signal.risk_mult)

    // Check risk limits
    const riskCheck = await this.checkRiskLimits(quantity, selectedContract)
    if (!riskCheck.allowed) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: riskCheck.reason,
      }
    }

    // Determine broker
    const broker: Broker = (process.env.PRIMARY_BROKER as Broker) || 'tradier'

    return {
      action: 'OPEN_POSITION',
      symbol,
      direction: signal.direction.toUpperCase() as Direction,
      instrumentType: 'OPTION',
      broker,
      strike: selectedContract.strike,
      side: 'BUY',
      quantity,
      meta: {
        sourceSignal: signal.signal,
        tf: signal.tf,
        riskMult: signal.risk_mult,
        scannerBias,
        tfcScore: this.calculateTFCScore(signal, ohlc),
        volScore: this.calculateVolScore(ohlc),
      },
      reasoning: `Core ${signal.direction} signal validated`,
    }
  }

  private async processRunnerSignal(signal: RunnerSignal): Promise<Decision> {
    const symbol = this.inferSymbol(signal)
    const stateMachine = new PositionStateMachine(symbol)
    await stateMachine.initialize()

    // Runners only allowed if position exists in same direction
    if (signal.direction === 'long' && !stateMachine.canAddLong()) {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'LONG',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'BUY',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'No existing LONG position for runner',
      }
    }

    if (signal.direction === 'short' && !stateMachine.canAddShort()) {
      return {
        action: 'IGNORE',
        symbol,
        direction: 'SHORT',
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'No existing SHORT position for runner',
      }
    }

    // Fetch market data
    let optionsChain
    try {
      if (!this.marketdata) {
        throw new Error('MarketData client not available')
      }
      optionsChain = await this.marketdata.getOptionsChain({
        symbol,
        expiryFilters: { minDTE: 0, maxDTE: 45 },
        side: signal.direction === 'long' ? 'call' : 'put',
      })
    } catch (error: any) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: `Failed to fetch options chain: ${error.message}`,
      }
    }

    const selectedContract = this.selectOptionContract(
      optionsChain.contracts,
      signal.strike_hint,
      signal.direction
    )

    if (!selectedContract) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: 'No suitable option contract found for runner',
      }
    }

    // Runner size is typically smaller
    const quantity = Math.max(1, Math.floor(this.basePositionSize * signal.risk_mult))

    // Check max runners per core
    const riskCheck = await this.checkRunnerLimits(symbol, signal.direction)
    if (!riskCheck.allowed) {
      return {
        action: 'IGNORE',
        symbol,
        direction: signal.direction.toUpperCase() as Direction,
        instrumentType: 'OPTION',
        broker: 'tradier',
        side: signal.direction === 'long' ? 'BUY' : 'SELL',
        quantity: 0,
        meta: { sourceSignal: signal.signal },
        reasoning: riskCheck.reason,
      }
    }

    const broker: Broker = (process.env.PRIMARY_BROKER as Broker) || 'tradier'

    return {
      action: 'ADD_POSITION',
      symbol,
      direction: signal.direction.toUpperCase() as Direction,
      instrumentType: 'OPTION',
      broker,
      strike: selectedContract.strike,
      side: 'BUY',
      quantity,
      meta: {
        sourceSignal: signal.signal,
        tf: signal.tf,
        riskMult: signal.risk_mult,
      },
      reasoning: `Runner ${signal.direction} signal validated`,
    }
  }

  private async processScannerSignal(signal: ScannerSignal): Promise<Decision> {
    // Store scanner event
    await prisma.scannerEvent.create({
      data: {
        symbol: signal.symbol,
        newBias: signal.new_bias,
        timestamp: new Date(signal.timestamp),
      },
    })

    // Scanner signals don't generate trades
    return {
      action: 'IGNORE',
      symbol: signal.symbol,
      direction: 'LONG',
      instrumentType: 'OPTION',
      broker: 'tradier',
      side: 'BUY',
      quantity: 0,
      meta: { sourceSignal: 'scanner', newBias: signal.new_bias },
      reasoning: 'Scanner event stored, no trade action',
    }
  }

  private inferSymbol(signal: CoreSignal | RunnerSignal): string {
    // Infer symbol from signal - could be SPX, SPY, QQQ, etc.
    // For now, default to SPX - this should be configurable or extracted from signal
    return process.env.DEFAULT_SYMBOL || 'SPX'
  }

  private selectOptionContract(
    contracts: OptionContract[],
    strikeHint: number,
    direction: 'long' | 'short'
  ): OptionContract | null {
    if (contracts.length === 0) return null

    // Filter by liquidity (min volume/OI)
    const liquidContracts = contracts.filter(
      (c) => c.volume > 0 || c.openInterest > 10
    )

    if (liquidContracts.length === 0) return null

    // For calls: find nearest strike >= strikeHint
    // For puts: find nearest strike <= strikeHint
    const sorted = liquidContracts.sort((a, b) => a.strike - b.strike)

    if (direction === 'long') {
      // For long calls, find first strike >= hint
      const call = sorted.find((c) => c.type === 'call' && c.strike >= strikeHint)
      if (call) return call

      // Fallback: nearest call
      const calls = sorted.filter((c) => c.type === 'call')
      if (calls.length > 0) {
        return calls.reduce((prev, curr) =>
          Math.abs(curr.strike - strikeHint) < Math.abs(prev.strike - strikeHint) ? curr : prev
        )
      }
    } else {
      // For long puts (short direction), find first strike <= hint
      const put = sorted.find((c) => c.type === 'put' && c.strike <= strikeHint)
      if (put) return put

      // Fallback: nearest put
      const puts = sorted.filter((c) => c.type === 'put')
      if (puts.length > 0) {
        return puts.reduce((prev, curr) =>
          Math.abs(curr.strike - strikeHint) < Math.abs(prev.strike - strikeHint) ? curr : prev
        )
      }
    }

    return null
  }

  private calculatePositionSize(riskMult: number): number {
    return Math.max(1, Math.floor(this.basePositionSize * riskMult))
  }

  private async checkRiskLimits(
    quantity: number,
    contract: OptionContract
  ): Promise<{ allowed: boolean; reason?: string }> {
    const riskLimit = await prisma.riskLimit.findFirst({
      where: { enabled: true },
    })

    if (!riskLimit) {
      return { allowed: true } // No limits configured
    }

    // Check max positions
    const openPositions = await prisma.position.count({
      where: { status: 'OPEN' },
    })

    if (openPositions >= riskLimit.maxPositions) {
      return { allowed: false, reason: `Max positions limit: ${riskLimit.maxPositions}` }
    }

    // Check daily loss
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const riskState = await prisma.riskState.findFirst({
      where: { date: { gte: today } },
    })

    if (riskState && riskState.dailyPnL <= -riskLimit.maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit exceeded: ${riskState.dailyPnL}`,
      }
    }

    // Estimate trade risk (simplified)
    const estimatedCost = (contract.ask + contract.bid) / 2 * quantity * 100 // Assuming 100 multiplier
    if (estimatedCost > riskLimit.maxRiskPerTrade) {
      return {
        allowed: false,
        reason: `Trade risk exceeds limit: ${estimatedCost} > ${riskLimit.maxRiskPerTrade}`,
      }
    }

    return { allowed: true }
  }

  private async checkRunnerLimits(
    symbol: string,
    direction: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const riskLimit = await prisma.riskLimit.findFirst({
      where: { enabled: true },
    })

    if (!riskLimit) {
      return { allowed: true }
    }

    // Count existing positions for this symbol/direction
    const existingPositions = await prisma.position.count({
      where: {
        symbol,
        direction: direction.toUpperCase(),
        status: 'OPEN',
      },
    })

    // Count how many are "core" vs "runner" - simplified: assume first is core
    if (existingPositions > 0) {
      const runnerCount = existingPositions - 1 // Subtract the core position
      if (runnerCount >= riskLimit.maxRunnersPerCore) {
        return {
          allowed: false,
          reason: `Max runners per core: ${riskLimit.maxRunnersPerCore}`,
        }
      }
    }

    return { allowed: true }
  }

  private async getScannerBias(): Promise<Record<string, 'BULL' | 'BEAR' | 'NEUTRAL'>> {
    const recentEvents = await prisma.scannerEvent.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
      take: 10,
    })

    const bias: Record<string, 'BULL' | 'BEAR' | 'NEUTRAL'> = {}
    for (const event of recentEvents) {
      bias[event.symbol] = event.newBias as 'BULL' | 'BEAR' | 'NEUTRAL'
    }

    return bias
  }

  private checkScannerConflict(
    direction: 'long' | 'short',
    scannerBias: Record<string, 'BULL' | 'BEAR' | 'NEUTRAL'>
  ): string | null {
    const majorIndices = ['SPY', 'QQQ', 'ES1!']
    const bearCount = majorIndices.filter((sym) => scannerBias[sym] === 'BEAR').length
    const bullCount = majorIndices.filter((sym) => scannerBias[sym] === 'BULL').length

    if (direction === 'long' && bearCount >= 2) {
      return `Multiple major indices BEAR (${bearCount})`
    }

    if (direction === 'short' && bullCount >= 2) {
      return `Multiple major indices BULL (${bullCount})`
    }

    return null
  }

  private calculateTFCScore(signal: CoreSignal, ohlc: any[]): number {
    // Trend/Follow/Confirmation score - simplified
    if (ohlc.length < 2) return 0.5

    const recent = ohlc.slice(-5)
    const trend = recent[recent.length - 1].close > recent[0].close ? 1 : -1
    const aligns = signal.direction === 'long' ? trend > 0 : trend < 0

    return aligns ? 0.9 : 0.5
  }

  private calculateVolScore(ohlc: any[]): number {
    // Volatility score - simplified ATR-based
    if (ohlc.length < 2) return 1.0

    const recent = ohlc.slice(-10)
    const ranges = recent.map((bar) => bar.high - bar.low)
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length
    const currentRange = recent[recent.length - 1].high - recent[recent.length - 1].low

    return currentRange / avgRange // >1 = higher vol
  }
}

