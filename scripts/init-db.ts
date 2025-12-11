// Script to initialize database with default risk limits
import { PrismaClient } from '@prisma/client'

// Support Prisma Accelerate URL if available
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('No DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL found in environment')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

async function main() {
  console.log('Initializing database...')

  // Create default risk limit if it doesn't exist
  const existingLimit = await prisma.riskLimit.findFirst({
    where: { name: 'default' },
  })

  if (!existingLimit) {
    await prisma.riskLimit.create({
      data: {
        name: 'default',
        maxPositions: 5,
        maxDailyLoss: 1000.0,
        maxRiskPerTrade: 500.0,
        maxRunnersPerCore: 2,
        enabled: true,
      },
    })
    console.log('Created default risk limit')
  } else {
    console.log('Default risk limit already exists')
  }

  // Create today's risk state if it doesn't exist
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingState = await prisma.riskState.findFirst({
    where: { date: { gte: today } },
  })

  if (!existingState) {
    await prisma.riskState.create({
      data: {
        date: today,
        dailyPnL: 0,
        dailyTrades: 0,
        openPositions: 0,
        totalRisk: 0,
      },
    })
    console.log('Created today\'s risk state')
  } else {
    console.log('Today\'s risk state already exists')
  }

  console.log('Database initialization complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

