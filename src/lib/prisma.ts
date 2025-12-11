import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma schema datasource uses env("DATABASE_URL"), so make sure it exists at runtime.
// Vercel Postgres commonly provides POSTGRES_URL / POSTGRES_PRISMA_URL; we map those to DATABASE_URL if missing.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    ''
}

// Use Prisma Accelerate URL if available, otherwise use standard connection
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error(
    '❌ No DATABASE_URL found. Please set DATABASE_URL (or Vercel POSTGRES_URL/POSTGRES_PRISMA_URL).'
  )
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

