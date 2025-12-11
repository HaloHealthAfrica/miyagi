# Database Migration Instructions

## Migration Created ✅

A new migration has been created and pushed to GitHub:
- **File:** `prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/migration.sql`
- **Changes:**
  - Added `stopLoss`, `takeProfit`, `stopLossPercent`, `takeProfitPercent` to Position table
  - Added `exitReason` and `lastPriceUpdate` to Position table
  - Created new `TradeOutcome` table for learning loop
  - Added indexes and foreign keys

## How to Apply Migration

### Option 1: Local Development

```bash
# Make sure DATABASE_URL is set in .env.local
npm run db:migrate
```

### Option 2: Production (Vercel)

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run migration
npm run db:migrate:prod
```

### Option 3: Direct SQL (if migration tool fails)

1. Connect to your database
2. Run the SQL from `prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/migration.sql`

## What the Migration Does

### Position Table Updates:
- Adds stop loss and take profit fields (price and percentage-based)
- Adds exit reason tracking
- Adds last price update timestamp

### New TradeOutcome Table:
- Tracks completed trades for learning loop
- Links to Position, Decision, and Signal
- Stores P&L, hold time, and exit reason
- Indexed for performance

## Verification

After running the migration, verify:

```sql
-- Check Position table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Position' 
AND column_name IN ('stopLoss', 'takeProfit', 'exitReason');

-- Check TradeOutcome table exists
SELECT * FROM "TradeOutcome" LIMIT 1;
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Remove TradeOutcome table
DROP TABLE IF EXISTS "TradeOutcome";

-- Remove columns from Position
ALTER TABLE "Position" 
DROP COLUMN IF EXISTS "stopLoss",
DROP COLUMN IF EXISTS "takeProfit",
DROP COLUMN IF EXISTS "stopLossPercent",
DROP COLUMN IF EXISTS "takeProfitPercent",
DROP COLUMN IF EXISTS "exitReason",
DROP COLUMN IF EXISTS "lastPriceUpdate";
```

## Next Steps

After migration is applied:
1. ✅ Position Manager Service can set stop loss/take profit
2. ✅ Price Updater Service can track last update time
3. ✅ Trade outcomes will be created when positions close
4. ✅ Learning loop (Phase 3) can analyze outcomes

## Status

- ✅ Migration file created
- ✅ Pushed to GitHub
- ⏳ **Pending:** Apply migration to production database

**Action Required:** Run `npm run db:migrate:prod` to apply to your Vercel database.

