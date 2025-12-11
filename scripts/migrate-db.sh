#!/bin/bash

# Database migration script
# Runs Prisma migrations against the production database

set -e

echo "🗄️  Running database migrations..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Pulling from Vercel..."
    if command -v vercel &> /dev/null; then
        vercel env pull .env.local
    else
        echo "❌ Vercel CLI not found. Please create .env.local manually or install Vercel CLI."
        exit 1
    fi
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ] && [ -z "$PRISMA_DATABASE_URL" ]; then
    echo "❌ DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL not found in .env.local"
    exit 1
fi

# Use PRISMA_DATABASE_URL if available (for Prisma Accelerate), otherwise use DATABASE_URL or POSTGRES_URL
if [ -n "$PRISMA_DATABASE_URL" ]; then
    export DATABASE_URL="$PRISMA_DATABASE_URL"
    echo "Using PRISMA_DATABASE_URL (Prisma Accelerate)"
elif [ -n "$POSTGRES_URL" ]; then
    export DATABASE_URL="$POSTGRES_URL"
    echo "Using POSTGRES_URL"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Deploy migrations
echo "Deploying migrations..."
npx prisma migrate deploy || npx prisma db push

# Initialize database (if needed)
echo "Initializing database..."
npx tsx scripts/init-db.ts || echo "Database already initialized or init script failed"

echo "✅ Database migrations complete!"

