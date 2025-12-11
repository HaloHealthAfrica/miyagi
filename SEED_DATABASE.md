# Database Seeding Guide

## Overview

The seed script populates your database with realistic mock data to test all pages and ensure everything is functional.

## What Gets Created

- **20 TradingView Signals** (mix of core, runner, scanner)
- **Decisions** (linked to signals)
- **Orders** (various statuses: FILLED, PENDING, SUBMITTED)
- **Positions** (OPEN and CLOSED, with P&L)
- **Scanner Events** (for SPY, QQQ, ES1!, NQ1!, BTC)
- **Risk Limits** (default configuration)
- **Risk State** (today's trading state)

## How to Run

### Local Development

```bash
# Make sure your database is set up
npm run db:push

# Run the seed script
npm run db:seed
```

### Production/Remote Database

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your_production_database_url"

# Or use .env.local
# DATABASE_URL=your_production_database_url

# Run the seed script
npm run db:seed
```

## What You'll See

After seeding, you can:

1. **Dashboard** (`/dashboard`)
   - See open positions with P&L
   - View scanner bias for all symbols
   - Check risk status

2. **Signals** (`/signals`)
   - Browse 20 mock TradingView signals
   - Filter by type (core, runner, scanner)
   - View signal details

3. **Decisions** (`/decisions`)
   - See decision engine outputs
   - View reasoning and metadata
   - Check execution status

4. **Positions** (`/positions`)
   - View open and closed positions
   - See P&L calculations
   - Filter by status

5. **Orders** (`/orders`)
   - See order history
   - Check order statuses
   - View broker information

6. **Scanner** (`/scanner`)
   - See bias for all tracked symbols
   - View heatmap visualization

7. **Risk** (`/risk`)
   - View risk limits
   - Check current risk state
   - See daily P&L and trade count

## Data Characteristics

- **Signals**: Spread over last 20 hours
- **Positions**: Mix of LONG and SHORT
- **P&L**: Realistic gains/losses (±5% variation)
- **Orders**: Various statuses (FILLED, PENDING, etc.)
- **Scanner**: Random BULL/BEAR/NEUTRAL biases

## Clearing Data

The seed script clears existing data before seeding. If you want to keep existing data, comment out the delete operations in `prisma/seed.ts`.

## Re-seeding

You can run the seed script multiple times. It will:
1. Clear existing data
2. Create fresh mock data
3. Maintain relationships between signals, decisions, orders, and positions

## Troubleshooting

**Error: Database connection failed**
- Verify `DATABASE_URL` is set correctly
- Check database is accessible
- Run `npm run db:push` first

**Error: Prisma client not generated**
- Run `npm run db:generate`

**No data showing in UI**
- Check API routes are working: `/api/signals`
- Verify database connection
- Check browser console for errors

## Next Steps

After seeding:
1. Visit `/dashboard` to see the data
2. Navigate through all pages
3. Test filtering and sorting
4. Verify all components render correctly

Enjoy testing! 🚀

