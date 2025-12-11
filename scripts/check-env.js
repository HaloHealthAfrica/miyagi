// Script to check and prioritize database URLs
// Prisma Accelerate > POSTGRES_URL > DATABASE_URL

require('dotenv').config({ path: '.env.local' })

const prismaUrl = process.env.PRISMA_DATABASE_URL
const postgresUrl = process.env.POSTGRES_URL
const databaseUrl = process.env.DATABASE_URL

let finalUrl = null

if (prismaUrl) {
  finalUrl = prismaUrl
  console.log('Using PRISMA_DATABASE_URL (Prisma Accelerate)')
} else if (postgresUrl) {
  finalUrl = postgresUrl
  console.log('Using POSTGRES_URL')
} else if (databaseUrl) {
  finalUrl = databaseUrl
  console.log('Using DATABASE_URL')
} else {
  console.error('No database URL found!')
  process.exit(1)
}

// Export for use in shell scripts
process.stdout.write(finalUrl)

