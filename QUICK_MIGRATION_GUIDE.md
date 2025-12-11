# Quick Migration Guide

## Apply All Database Updates

You have **3 migrations** ready to apply:

### Migration 1: Initial Schema
Creates all base tables (Strategy, Signal, Decision, Order, Position, Execution, ScannerEvent, RiskLimit, RiskState)

### Migration 2: Position Management  
Adds stop loss/take profit to Position table + TradeOutcome table

### Migration 3: Performance Metrics
Creates PerformanceMetrics table for analytics

## Quick Apply Command

```bash
# 1. Pull environment variables
vercel env pull .env.local

# 2. Apply all migrations
npm run db:migrate:prod
```

That's it! All 3 migrations will be applied in order.

## Verify After Migration

```sql
-- Check PerformanceMetrics table exists
SELECT * FROM "PerformanceMetrics" LIMIT 1;

-- Check all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## If Migrations Fail

If you get "relation already exists" errors, your database might have been created with `db:push`. In that case:

```bash
# Mark existing migrations as applied
npx prisma migrate resolve --applied 20250210000000_initial_schema
npx prisma migrate resolve --applied 20250210180000_add_position_management_and_trade_outcomes

# Then apply only the new one
npm run db:migrate:prod
```

## What Gets Created

### PerformanceMetrics Table:
- Stores calculated performance metrics
- Supports daily, weekly, monthly, all-time periods
- Indexed for fast queries
- Used by Analytics Service for caching

### All Migrations Are On GitHub:
- ✅ `prisma/migrations/20250210000000_initial_schema/`
- ✅ `prisma/migrations/20250210180000_add_position_management_and_trade_outcomes/`
- ✅ `prisma/migrations/20250210200000_add_performance_metrics/`

## Status

- ✅ All migration files created
- ✅ Pushed to GitHub  
- ⏳ **Ready to apply:** Run `npm run db:migrate:prod`

