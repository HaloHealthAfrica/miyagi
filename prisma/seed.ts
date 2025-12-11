import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with mock data...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('Clearing existing data...')
  await prisma.execution.deleteMany()
  await prisma.order.deleteMany()
  await prisma.position.deleteMany()
  await prisma.decision.deleteMany()
  await prisma.signal.deleteMany()
  await prisma.scannerEvent.deleteMany()
  await prisma.riskState.deleteMany()
  await prisma.riskLimit.deleteMany()
  await prisma.strategy.deleteMany()

  // Create default strategy
  const strategy = await prisma.strategy.create({
    data: {
      name: 'Miyagi Core Strategy',
      description: 'Main trading strategy using TradingView signals',
      enabled: true,
    },
  })

  // Create risk limit
  const riskLimit = await prisma.riskLimit.create({
    data: {
      name: 'default',
      maxPositions: 5,
      maxDailyLoss: 1000.0,
      maxRiskPerTrade: 500.0,
      maxRunnersPerCore: 2,
      enabled: true,
    },
  })

  // Create today's risk state
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const riskState = await prisma.riskState.create({
    data: {
      date: today,
      dailyPnL: 245.50,
      dailyTrades: 8,
      openPositions: 2,
      totalRisk: 1200.0,
    },
  })

  // Create scanner events
  const scannerSymbols = ['SPY', 'QQQ', 'ES1!', 'NQ1!', 'BTC']
  const biases = ['BULL', 'BEAR', 'NEUTRAL']
  
  for (const symbol of scannerSymbols) {
    await prisma.scannerEvent.create({
      data: {
        symbol,
        newBias: biases[Math.floor(Math.random() * biases.length)] as 'BULL' | 'BEAR' | 'NEUTRAL',
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      },
    })
  }

  // Create signals and decisions
  const now = new Date()
  const signals = []
  const decisions = []

  // Create 20 core signals
  for (let i = 0; i < 20; i++) {
    const direction = Math.random() > 0.5 ? 'long' : 'short'
    const miyagi = direction === 'long' ? 'BULL' : 'BEAR'
    const timestamp = new Date(now.getTime() - (20 - i) * 3600000) // Spread over 20 hours

    const signal = await prisma.signal.create({
      data: {
        strategyId: strategy.id,
        type: 'core',
        direction,
        signal: `core_${direction}`,
        tf: '5',
        strikeHint: 5200 + Math.random() * 100,
        riskMult: 0.8 + Math.random() * 0.6,
        miyagi: miyagi as 'BULL' | 'BEAR' | 'NEUTRAL',
        daily: miyagi as 'BULL' | 'BEAR' | 'NEUTRAL',
        rawPayload: {
          type: 'core',
          direction,
          signal: `core_${direction}`,
          tf: '5',
          strike_hint: 5200 + Math.random() * 100,
          risk_mult: 0.8 + Math.random() * 0.6,
          miyagi,
          daily: miyagi,
          timestamp: timestamp.toISOString(),
        },
        timestamp,
        processed: true,
      },
    })
    signals.push(signal)

    // Create decision for some signals
    if (i % 3 !== 0) { // Skip every 3rd signal (some get IGNORED)
      const action = i % 5 === 0 ? 'IGNORE' : 'OPEN_POSITION'
      const decision = await prisma.decision.create({
        data: {
          signalId: signal.id,
          strategyId: strategy.id,
          action,
          symbol: 'SPX',
          direction: direction.toUpperCase() as 'LONG' | 'SHORT',
          instrumentType: 'OPTION',
          broker: i % 2 === 0 ? 'tradier' : 'alpaca',
          strike: signal.strikeHint ? Math.round(signal.strikeHint / 5) * 5 : null,
          side: 'BUY',
          quantity: action === 'IGNORE' ? 0 : Math.floor(1 + Math.random() * 3),
          meta: {
            sourceSignal: signal.signal,
            tf: signal.tf,
            riskMult: signal.riskMult,
            tfcScore: 0.7 + Math.random() * 0.3,
            volScore: 0.8 + Math.random() * 0.4,
          },
          reasoning: action === 'IGNORE' 
            ? 'Risk limits or validation failed'
            : `Core ${direction} signal validated and executed`,
          executed: action !== 'IGNORE',
        },
      })
      decisions.push(decision)

      // Create order for executed decisions
      if (action !== 'IGNORE' && decision.executed) {
        const order = await prisma.order.create({
          data: {
            decisionId: decision.id,
            broker: decision.broker,
            brokerOrderId: `ORD-${Date.now()}-${i}`,
            symbol: decision.symbol,
            instrumentType: decision.instrumentType,
            side: decision.side,
            quantity: decision.quantity,
            strike: decision.strike,
            orderType: 'MARKET',
            status: i % 4 === 0 ? 'FILLED' : i % 4 === 1 ? 'PENDING' : 'SUBMITTED',
            brokerResponse: {
              id: `ORD-${Date.now()}-${i}`,
              status: 'filled',
            },
          },
        })

        // Create position for filled orders
        if (order.status === 'FILLED') {
          const entryPrice = 50 + Math.random() * 100
          const currentPrice = entryPrice * (0.95 + Math.random() * 0.1)
          const pnl = (currentPrice - entryPrice) * decision.quantity * 100
          const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100

          await prisma.position.create({
            data: {
              decisionId: decision.id,
              strategyId: strategy.id,
              broker: decision.broker,
              symbol: decision.symbol,
              instrumentType: decision.instrumentType,
              direction: decision.direction,
              quantity: decision.quantity,
              strike: decision.strike,
              entryPrice,
              currentPrice,
              pnl,
              pnlPercent,
              status: i < 2 ? 'OPEN' : 'CLOSED', // First 2 are open
              openedAt: timestamp,
              closedAt: i >= 2 ? new Date(timestamp.getTime() + 3600000) : null,
            },
          })
        }
      }
    }
  }

  // Create 10 runner signals
  for (let i = 0; i < 10; i++) {
    const direction = Math.random() > 0.5 ? 'long' : 'short'
    const timestamp = new Date(now.getTime() - (10 - i) * 7200000) // Spread over 20 hours

    const signal = await prisma.signal.create({
      data: {
        strategyId: strategy.id,
        type: 'runner',
        direction,
        signal: `runner_322_${direction}`,
        tf: '5',
        strikeHint: 5200 + Math.random() * 100,
        riskMult: 0.4 + Math.random() * 0.4,
        miyagi: direction === 'long' ? 'BULL' : 'BEAR',
        daily: direction === 'long' ? 'BULL' : 'BEAR',
        rawPayload: {
          type: 'runner',
          direction,
          signal: `runner_322_${direction}`,
          tf: '5',
          strike_hint: 5200 + Math.random() * 100,
          risk_mult: 0.4 + Math.random() * 0.4,
          miyagi: direction === 'long' ? 'BULL' : 'BEAR',
          daily: direction === 'long' ? 'BULL' : 'BEAR',
          timestamp: timestamp.toISOString(),
        },
        timestamp,
        processed: true,
      },
    })

    // Create decision for runner
    if (i % 2 === 0) {
      const decision = await prisma.decision.create({
        data: {
          signalId: signal.id,
          strategyId: strategy.id,
          action: 'ADD_POSITION',
          symbol: 'SPX',
          direction: direction.toUpperCase() as 'LONG' | 'SHORT',
          instrumentType: 'OPTION',
          broker: 'tradier',
          strike: signal.strikeHint ? Math.round(signal.strikeHint / 5) * 5 : null,
          side: 'BUY',
          quantity: Math.floor(1 + Math.random() * 2),
          meta: {
            sourceSignal: signal.signal,
            tf: signal.tf,
            riskMult: signal.riskMult,
          },
          reasoning: `Runner ${direction} signal validated`,
          executed: true,
        },
      })

      await prisma.order.create({
        data: {
          decisionId: decision.id,
          broker: decision.broker,
          brokerOrderId: `ORD-RUNNER-${Date.now()}-${i}`,
          symbol: decision.symbol,
          instrumentType: decision.instrumentType,
          side: decision.side,
          quantity: decision.quantity,
          strike: decision.strike,
          orderType: 'MARKET',
          status: 'FILLED',
        },
      })
    }
  }

  // Create 5 scanner signals
  for (let i = 0; i < 5; i++) {
    const symbol = scannerSymbols[Math.floor(Math.random() * scannerSymbols.length)]
    const bias = biases[Math.floor(Math.random() * biases.length)] as 'BULL' | 'BEAR' | 'NEUTRAL'
    const timestamp = new Date(now.getTime() - (5 - i) * 14400000) // Spread over 20 hours

    await prisma.signal.create({
      data: {
        strategyId: strategy.id,
        type: 'scanner',
        signal: 'scanner',
        symbol,
        newBias: bias,
        rawPayload: {
          type: 'scanner',
          symbol,
          new_bias: bias,
          timestamp: timestamp.toISOString(),
        },
        timestamp,
        processed: true,
      },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`   - Strategy: 1`)
  console.log(`   - Risk Limit: 1`)
  console.log(`   - Risk State: 1`)
  console.log(`   - Scanner Events: ${scannerSymbols.length}`)
  console.log(`   - Signals: ~35`)
  console.log(`   - Decisions: ~25`)
  console.log(`   - Orders: ~25`)
  console.log(`   - Positions: ~8 (2 open, 6 closed)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

