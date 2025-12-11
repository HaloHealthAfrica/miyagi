import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use Prisma Accelerate URL if available, otherwise use standard connection
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ No DATABASE_URL found. Please set PRISMA_DATABASE_URL, POSTGRES_URL, or DATABASE_URL')
}

// Create Prisma client with proper configuration for Vercel/serverless
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Don't override datasources - let Prisma use DATABASE_URL from env
    // This is important for Vercel/serverless environments
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Handle graceful shutdown (only in Node.js environment)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

