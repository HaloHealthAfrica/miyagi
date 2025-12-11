# Phase 2 Database Migration Required

## Migration Status

✅ **Migration file created and pushed to GitHub**
❌ **Migration NOT yet applied to database**

## What Needs to Be Applied

### New Table: PerformanceMetrics

The migration adds a new table to store calculated performance metrics:

```sql
CREATE TABLE "PerformanceMetrics" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,  -- "daily" | "weekly" | "monthly" | "all"
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

### Additional Index

Also adds an index to TradeOutcome for faster date-based queries:
```sql
CREATE INDEX "TradeOutcome_createdAt_idx" ON "TradeOutcome"("createdAt");
```

## How to Apply

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Apply migration
npm run db:migrate:prod
```

### Option 2: Manual SQL

If Prisma migrate doesn't work, you can run the SQL directly:

1. Connect to your database
2. Run the SQL from: `prisma/migrations/20250210200000_add_performance_metrics/migration.sql`

### Option 3: Using Prisma Studio

```bash
# Generate Prisma client first
npm run db:generate

# Then apply migration
npm run db:migrate:prod
```

## Migration File Location

**File:** `prisma/migrations/20250210200000_add_performance_metrics/migration.sql`

**Status:** ✅ Created and pushed to GitHub

## Verification

After applying the migration, verify:

```sql
-- Check PerformanceMetrics table exists
SELECT * FROM "PerformanceMetrics" LIMIT 1;

-- Check index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'TradeOutcome' 
AND indexname = 'TradeOutcome_createdAt_idx';
```

## Impact

### Without Migration:
- ❌ Analytics API will work (calculates on-the-fly)
- ❌ PerformanceMetrics table won't exist (can't store cached metrics)
- ❌ Analytics dashboard will work but slower (no cached data)

### With Migration:
- ✅ Analytics API works
- ✅ Can cache performance metrics for faster queries
- ✅ Analytics dashboard loads faster
- ✅ Can track metrics over time

## Important Note

**The Analytics Service works WITHOUT this migration!**

The migration is **optional** for Phase 2 functionality:
- Analytics Service calculates metrics on-the-fly from TradeOutcome table
- PerformanceMetrics table is for **caching** metrics (future optimization)
- Analytics dashboard will work without it

However, it's recommended to apply it for:
- Future performance optimizations
- Historical metrics tracking
- Cached metric storage

## Next Steps

1. **Apply migration:**
   ```bash
   npm run db:migrate:prod
   ```

2. **Verify:**
   - Check Analytics dashboard loads
   - Test API endpoint: `/api/analytics`

3. **Optional:** Set up scheduled job to cache metrics periodically

## Status

- ✅ Migration file created
- ✅ Pushed to GitHub
- ⏳ **Pending:** Apply to production database

**Action Required:** Run `npm run db:migrate:prod` to apply the migration.

