# Apply All Database Migrations

## Migration Status

You have **3 migrations** that need to be applied:

### 1. Initial Schema (20250210000000)
**File:** `prisma/migrations/20250210000000_initial_schema/migration.sql`
- Creates all base tables (Strategy, Signal, Decision, Order, Position, Execution, ScannerEvent, RiskLimit, RiskState)

### 2. Position Management (20250210180000)
**File:** `prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/migration.sql`
- Adds stop loss/take profit fields to Position table
- Creates TradeOutcome table

### 3. Performance Metrics (20250210200000)
**File:** `prisma/migrations/20250210200000_add_performance_metrics/migration.sql`
- Creates PerformanceMetrics table
- Adds index to TradeOutcome.createdAt

## How to Apply

### Option 1: Apply All Migrations (Recommended)

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Apply all migrations in order
npm run db:migrate:prod
```

This will apply all 3 migrations in the correct order.

### Option 2: Manual SQL (If Prisma Migrate Fails)

If you need to apply manually, run the SQL files in order:

1. **Initial Schema:**
   ```sql
   -- Run: prisma/migrations/20250210000000_initial_schema/migration.sql
   ```

2. **Position Management:**
   ```sql
   -- Run: prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/migration.sql
   ```

3. **Performance Metrics:**
   ```sql
   -- Run: prisma/migrations/20250210200000_add_performance_metrics/migration.sql
   ```

### Option 3: Mark Existing Migrations as Applied

If your database already has some tables (from `db:push`), you can mark migrations as applied:

```bash
# Mark initial migration as applied (if tables exist)
npx prisma migrate resolve --applied 20250210000000_initial_schema

# Mark position management as applied (if fields exist)
npx prisma migrate resolve --applied 20250210180000_add_position_management_and_trade_outcomes

# Apply only the new migration
npm run db:migrate:prod
```

## Verification

After applying migrations, verify all tables exist:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'Strategy', 
  'Signal', 
  'Decision', 
  'Order', 
  'Position', 
  'Execution', 
  'ScannerEvent', 
  'RiskLimit', 
  'RiskState',
  'TradeOutcome',
  'PerformanceMetrics'
);

-- Check Position table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Position' 
AND column_name IN (
  'stopLoss', 
  'takeProfit', 
  'stopLossPercent', 
  'takeProfitPercent', 
  'exitReason', 
  'lastPriceUpdate'
);

-- Check PerformanceMetrics table
SELECT * FROM "PerformanceMetrics" LIMIT 1;
```

## Migration Order

Migrations are applied in this order (by timestamp):

1. `20250210000000_initial_schema` - Base tables
2. `20250210180000_add_position_management_and_trade_outcomes` - Position management
3. `20250210200000_add_performance_metrics` - Analytics

## Troubleshooting

### Error: "relation already exists"
- Tables already exist from `db:push`
- Solution: Mark migrations as applied (Option 3 above)

### Error: "column already exists"
- Fields already added manually
- Solution: Mark migration as applied or remove duplicate columns

### Error: "migration not found"
- Migration files not in correct location
- Solution: Ensure migrations are in `prisma/migrations/` directory

## Status

- ✅ All migration files created
- ✅ Pushed to GitHub
- ⏳ **Pending:** Apply to production database

**Action Required:** Run `npm run db:migrate:prod` to apply all migrations.

