# Complete Database Migration Setup ✅

## Migration Status

All database migrations are now in place:

### 1. Initial Schema Migration ✅
**File:** `prisma/migrations/20250210000000_initial_schema/migration.sql`

**Creates all base tables:**
- Strategy
- Signal
- Decision
- Order
- Position (base version)
- Execution
- ScannerEvent
- RiskLimit
- RiskState

### 2. Position Management Migration ✅
**File:** `prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/migration.sql`

**Adds:**
- Position table updates (stopLoss, takeProfit, exitReason, etc.)
- TradeOutcome table for learning loop

## Migration Order

When applying migrations, they will run in this order:

1. **Initial Schema** (20250210000000) - Creates all base tables
2. **Position Management** (20250210180000) - Adds new fields and TradeOutcome table

## How to Apply

### Fresh Database (No Existing Data)

```bash
# This will apply all migrations in order
npm run db:migrate:prod
```

### Existing Database

If your database already has tables (created via `db:push`):

**Option 1: Mark migrations as applied (if schema matches)**
```bash
# Mark initial migration as applied (if tables already exist)
npx prisma migrate resolve --applied 20250210000000_initial_schema

# Apply only the new migration
npm run db:migrate:prod
```

**Option 2: Apply all migrations (will fail if tables exist)**
```bash
# This will fail if tables already exist
npm run db:migrate:prod
```

**Option 3: Manual SQL (if migrations fail)**
1. Check if initial tables exist
2. If they do, only run the position management migration SQL
3. If they don't, run both migrations

## Verification

After applying migrations, verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'Strategy', 'Signal', 'Decision', 'Order', 
  'Position', 'Execution', 'ScannerEvent', 
  'RiskLimit', 'RiskState', 'TradeOutcome'
);

-- Check Position table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Position' 
AND column_name IN ('stopLoss', 'takeProfit', 'exitReason', 'lastPriceUpdate');

-- Check TradeOutcome table exists
SELECT * FROM "TradeOutcome" LIMIT 1;
```

## Migration History

Your database now has complete migration history:

```
20250210000000_initial_schema
  └─ Creates all base tables and relationships

20250210180000_add_position_management_and_trade_outcomes
  └─ Adds position management fields and TradeOutcome table
```

## Next Steps

1. ✅ **Apply migrations to production:**
   ```bash
   npm run db:migrate:prod
   ```

2. ✅ **Verify schema matches:**
   ```bash
   npx prisma db pull  # Compare with schema.prisma
   ```

3. ✅ **Test the system:**
   - Send test webhook
   - Verify positions are created with stop loss/take profit
   - Check TradeOutcome is created when positions close

## Status

- ✅ Initial schema migration created
- ✅ Position management migration created
- ✅ Both migrations pushed to GitHub
- ⏳ **Pending:** Apply migrations to production database

**Your database is now fully versioned with migrations!**

