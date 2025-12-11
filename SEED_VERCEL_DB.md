# Seed Vercel Database

## Quick Start

### Step 1: Pull Environment Variables from Vercel

```bash
# Make sure you're logged in to Vercel CLI
vercel login

# Link your project (if not already linked)
vercel link

# Pull environment variables (this creates .env.local)
vercel env pull .env.local
```

### Step 2: Seed the Database

```bash
npm run db:seed:vercel
```

That's it! Your Vercel database will be seeded with mock data.

## What Gets Created

- **20 TradingView Signals** (core, runner, scanner)
- **Decisions** (linked to signals)
- **Orders** (various statuses)
- **Positions** (OPEN and CLOSED with P&L)
- **Scanner Events** (for SPY, QQQ, ES1!, NQ1!, BTC)
- **Risk Limits** (default configuration)
- **Risk State** (today's trading state)

## Detailed Steps

### Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link Your Project**:
   ```bash
   vercel link
   ```
   - Select your Vercel account
   - Select your project (or create new)
   - This creates `.vercel/project.json`

4. **Pull Environment Variables**:
   ```bash
   vercel env pull .env.local
   ```
   This downloads all environment variables from Vercel to `.env.local`

5. **Seed the Database**:
   ```bash
   npm run db:seed:vercel
   ```

### Option 2: Manual Environment Variables

If you prefer to set environment variables manually:

1. **Get Database URL from Vercel Dashboard**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Copy `PRISMA_DATABASE_URL`, `POSTGRES_URL`, or `DATABASE_URL`

2. **Create `.env.local`**:
   ```env
   PRISMA_DATABASE_URL=your_vercel_database_url
   # or
   POSTGRES_URL=your_vercel_database_url
   # or
   DATABASE_URL=your_vercel_database_url
   ```

3. **Seed the Database**:
   ```bash
   npm run db:seed:vercel
   ```

## Verify Seeding

After seeding, you can verify:

1. **Check Vercel App**:
   - Visit your Vercel app URL
   - Go to `/dashboard` - you should see data
   - Go to `/signals` - you should see 20 signals
   - Go to `/debug` - test all endpoints

2. **Check Database Directly**:
   ```bash
   # Use Prisma Studio with Vercel database
   DATABASE_URL="your_vercel_db_url" npx prisma studio
   ```

## Troubleshooting

### Error: "No DATABASE_URL found"

**Solution:**
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Or set manually in .env.local
```

### Error: "Cannot connect to database"

**Solution:**
1. Verify database URL is correct
2. Check database is accessible (not blocked by firewall)
3. For Prisma Accelerate: Make sure `PRISMA_DATABASE_URL` is used

### Error: "Table does not exist"

**Solution:**
```bash
# Run migrations first
npm run db:migrate:prod
```

### Environment Variables Not Found

**Solution:**
1. Make sure `.env.local` exists
2. Check it contains `DATABASE_URL`, `POSTGRES_URL`, or `PRISMA_DATABASE_URL`
3. Verify the URL format is correct

## Re-seeding

You can run the seed script multiple times. It will:
1. Clear existing data
2. Create fresh mock data
3. Maintain relationships

To re-seed:
```bash
npm run db:seed:vercel
```

## What to Expect

After seeding, your Vercel app will show:

- **Dashboard**: Stats, positions, scanner bias
- **Signals**: 20 signals with filtering
- **Decisions**: Decision engine outputs
- **Positions**: Open/closed positions
- **Orders**: Order history
- **Scanner**: Bias heatmap
- **Risk**: Risk limits and state

All pages will be fully functional with realistic data!

## Security Note

⚠️ **Important**: The seed script clears all existing data before seeding. Make sure you're seeding the correct database!

To keep existing data, comment out the delete operations in `scripts/seed-vercel.ts`.

