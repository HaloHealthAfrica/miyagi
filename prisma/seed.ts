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
    const bias = biases[Math.floor(Math.random() * biases.length)]
    await prisma.scannerEvent.create({
      data: {
        symbol,
        newBias: bias,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      },
    })
  }

  // Create mock signals and decisions
  const signalTypes = ['core', 'runner', 'scanner']
  const directions = ['long', 'short']
  const miyagiBias = ['BULL', 'BEAR', 'NEUTRAL']
  
  const signals = []
  const decisions = []
  const orders = []
  const positions = []

  // Generate 20 signals
  for (let i = 0; i < 20; i++) {
    const type = signalTypes[Math.floor(Math.random() * signalTypes.length)]
    const direction = directions[Math.floor(Math.random() * directions.length)]
    const miyagi = miyagiBias[Math.floor(Math.random() * miyagiBias.length)]
    const daily = miyagiBias[Math.floor(Math.random() * miyagiBias.length)]
    
    const timestamp = new Date(Date.now() - i * 3600000) // Spread over last 20 hours
    
    let signalData: any = {
      strategyId: strategy.id,
      type,
      signal: type === 'core' 
        ? `core_${direction}`
        : type === 'runner'
        ? `runner_322_${direction}`
        : 'scanner',
      tf: '5',
      strikeHint: type !== 'scanner' ? 5200 + Math.random() * 100 : null,
      riskMult: type !== 'scanner' ? 0.8 + Math.random() * 0.6 : null,
      miyagi: type !== 'scanner' ? miyagi : null,
      daily: type !== 'scanner' ? daily : null,
      direction: type !== 'scanner' ? direction : null,
      symbol: type === 'scanner' ? scannerSymbols[Math.floor(Math.random() * scannerSymbols.length)] : 'SPX',
      newBias: type === 'scanner' ? biases[Math.floor(Math.random() * biases.length)] : null,
      rawPayload: {
        type,
        direction: type !== 'scanner' ? direction : undefined,
        signal: type === 'core' ? `core_${direction}` : type === 'runner' ? `runner_322_${direction}` : 'scanner',
        tf: '5',
        strike_hint: type !== 'scanner' ? 5200 + Math.random() * 100 : undefined,
        risk_mult: type !== 'scanner' ? 0.8 + Math.random() * 0.6 : undefined,
        miyagi: type !== 'scanner' ? miyagi : undefined,
        daily: type !== 'scanner' ? daily : undefined,
        symbol: type === 'scanner' ? scannerSymbols[Math.floor(Math.random() * scannerSymbols.length)] : undefined,
        new_bias: type === 'scanner' ? biases[Math.floor(Math.random() * biases.length)] : undefined,
        timestamp: timestamp.toISOString(),
      },
      timestamp,
      processed: true,
    }

    const signal = await prisma.signal.create({ data: signalData })
    signals.push(signal)

    // Create decisions for core and runner signals
    if (type !== 'scanner' && Math.random() > 0.3) { // 70% of signals get decisions
      const action = type === 'core' ? 'OPEN_POSITION' : 'ADD_POSITION'
      const decisionAction = Math.random() > 0.2 ? action : 'IGNORE' // 80% execute, 20% ignore
      
      const decision = await prisma.decision.create({
        data: {
          signalId: signal.id,
          strategyId: strategy.id,
          action: decisionAction,
          symbol: 'SPX',
          direction: direction.toUpperCase(),
          instrumentType: 'OPTION',
          broker: Math.random() > 0.5 ? 'tradier' : 'alpaca',
          strike: signal.strikeHint ? Math.round(signal.strikeHint / 5) * 5 : null, // Round to nearest 5
          side: 'BUY',
          quantity: decisionAction !== 'IGNORE' ? Math.floor(1 + Math.random() * 3) : 0,
          meta: {
            sourceSignal: signal.signal,
            tf: signal.tf,
            riskMult: signal.riskMult,
            tfcScore: 0.7 + Math.random() * 0.3,
            volScore: 0.8 + Math.random() * 0.4,
          },
          reasoning: decisionAction !== 'IGNORE' 
            ? `${type} ${direction} signal validated with ${miyagi} bias`
            : 'Signal filtered by risk limits',
          executed: decisionAction !== 'IGNORE',
        },
      })
      decisions.push(decision)

      // Create orders for executed decisions
      if (decision.executed) {
        const orderStatuses = ['FILLED', 'SUBMITTED', 'PENDING', 'PARTIAL']
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
        
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
            status,
            brokerResponse: {
              id: `ORD-${Date.now()}-${i}`,
              status,
            },
          },
        })
        orders.push(order)

        // Create positions for filled orders
        if (status === 'FILLED' && Math.random() > 0.3) { // 70% of filled orders create positions
          const entryPrice = 50 + Math.random() * 100
          const currentPrice = entryPrice * (0.95 + Math.random() * 0.1) // ±5% variation
          const pnl = (currentPrice - entryPrice) * decision.quantity * 100 // Options multiplier
          const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100

          const position = await prisma.position.create({
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
              status: Math.random() > 0.7 ? 'CLOSED' : 'OPEN', // 30% closed
              openedAt: timestamp,
              closedAt: Math.random() > 0.7 ? new Date(timestamp.getTime() + 3600000) : null,
            },
          })
          positions.push(position)

          // Create execution for filled orders
          if (status === 'FILLED') {
            await prisma.execution.create({
              data: {
                orderId: order.id,
                broker: order.broker,
                brokerExecId: `EXEC-${Date.now()}-${i}`,
                symbol: order.symbol,
                quantity: order.quantity,
                price: entryPrice,
                executedAt: timestamp,
              },
            })
          }
        }
      }
    }
  }

  console.log(`✅ Created:`)
  console.log(`   - ${signals.length} signals`)
  console.log(`   - ${decisions.length} decisions`)
  console.log(`   - ${orders.length} orders`)
  console.log(`   - ${positions.length} positions`)
  console.log(`   - ${scannerSymbols.length} scanner events`)
  console.log(`   - 1 risk limit`)
  console.log(`   - 1 risk state`)
  console.log(`\n🎉 Database seeded successfully!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
