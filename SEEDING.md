# Database Seeding Guide

## Overview

The seed script populates your database with realistic mock data to test all pages and ensure everything is functional.

## What Gets Seeded

- **1 Strategy** - Default Miyagi strategy
- **1 Risk Limit** - Default risk configuration
- **1 Risk State** - Today's risk metrics
- **5 Scanner Events** - SPY, QQQ, ES1!, NQ1!, BTC with random biases
- **~35 Signals** - Mix of core, runner, and scanner signals
- **~25 Decisions** - Decision engine outputs
- **~25 Orders** - Broker orders with various statuses
- **~8 Positions** - 2 open positions, 6 closed positions

## Running the Seed Script

### Local Development

```bash
# Make sure database is set up
npm run db:push

# Run the seed script
npm run db:seed
```

### Production/Vercel

```bash
# Pull environment variables
vercel env pull .env.local

# Run seed script (uses production database)
npm run db:seed
```

## What the Mock Data Includes

### Signals
- **Core signals**: 20 signals with long/short directions
- **Runner signals**: 10 signals for position additions
- **Scanner signals**: 5 scanner events

### Decisions
- Mix of `OPEN_POSITION`, `ADD_POSITION`, and `IGNORE` actions
- Realistic reasoning and metadata
- Linked to their source signals

### Orders
- Various statuses: `FILLED`, `PENDING`, `SUBMITTED`
- Both Tradier and Alpaca orders
- Linked to decisions

### Positions
- 2 open positions with current P&L
- 6 closed positions with final P&L
- Realistic entry prices and current prices

### Scanner Events
- Current bias for major indices
- Random BULL/BEAR/NEUTRAL states
- Recent timestamps

## Testing Pages

After seeding, you can test:

1. **Dashboard** (`/dashboard`)
   - Should show 2 open positions
   - Daily P&L: ~$245.50
   - Scanner bias table populated

2. **Signals** (`/signals`)
   - Should show ~35 signals
   - Filterable by type (core, runner, scanner)
   - Each with decision details

3. **Decisions** (`/decisions`)
   - Should show ~25 decisions
   - Mix of actions with color coding
   - Linked to source signals

4. **Positions** (`/positions`)
   - Should show 2 open positions
   - Can filter to see 6 closed positions
   - P&L calculations visible

5. **Orders** (`/orders`)
   - Should show ~25 orders
   - Various statuses visible
   - Filterable by status

6. **Scanner** (`/scanner`)
   - Should show 5 symbols with biases
   - Heatmap visualization
   - Color-coded badges

7. **Risk** (`/risk`)
   - Should show risk limits
   - Current risk state with daily P&L
   - Editable settings

## Clearing Data

The seed script clears existing data before seeding. If you want to keep existing data, comment out the delete operations in `prisma/seed.ts`.

## Customizing Mock Data

Edit `prisma/seed.ts` to:
- Change number of records
- Adjust price ranges
- Modify signal types
- Customize risk limits

## Troubleshooting

**Error: Database connection failed**
- Verify `DATABASE_URL` is set
- Check database is accessible
- Run `npm run db:push` first

**Error: Table doesn't exist**
- Run migrations: `npm run db:migrate` or `npm run db:push`

**No data showing**
- Check browser console for API errors
- Verify API routes are working: `/api/signals`
- Check database directly: `npm run db:studio`

## Next Steps

After seeding:
1. Visit `/dashboard` to see the populated data
2. Test filtering on Signals and Orders pages
3. Check position P&L calculations
4. Verify scanner heatmap displays correctly
5. Test risk settings update functionality

