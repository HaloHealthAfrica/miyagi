# Vercel Deployment Guide

This guide walks you through deploying the Miyagi Trading Platform to Vercel with a PostgreSQL database.

## Deployment Architecture

```
Vercel (Next.js App) → External PostgreSQL Database
```

**Recommended Setup:**
- **Web App**: Deploy to Vercel (automatic Next.js detection)
- **Database**: Use one of these PostgreSQL services:
  1. **Vercel Postgres** (integrated, easiest)
  2. **Supabase** (free tier, great for PostgreSQL)
  3. **Neon** (serverless PostgreSQL, perfect for Vercel)
  4. **Railway** (simple setup)

## Option 1: Vercel Postgres (Recommended for Vercel)

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a plan (Hobby plan is free for small projects)
5. Select a region close to your users
6. Click **Create**

Vercel will automatically:
- Create a `POSTGRES_URL` environment variable
- Create a `POSTGRES_PRISMA_URL` environment variable (for Prisma)
- Create a `POSTGRES_URL_NON_POOLING` environment variable

### Step 2: Update Prisma Schema (if needed)

If using Vercel Postgres, you may need to use connection pooling. Update your `.env` to use:

```env
DATABASE_URL="${POSTGRES_PRISMA_URL}"
```

Or for direct connection:
```env
DATABASE_URL="${POSTGRES_URL_NON_POOLING}"
```

### Step 3: Deploy Your App

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Vercel will auto-detect Next.js
4. Add all your environment variables (see below)
5. Deploy!

## Option 2: Supabase (Alternative)

### Step 1: Create Supabase Database

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to provision
4. Go to **Settings** → **Database**
5. Copy the **Connection string** (URI format)

### Step 2: Configure Vercel

1. In Vercel project settings, add environment variable:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```
   (Use the connection string from Supabase)

2. Add all other environment variables (see below)

## Option 3: Neon (Serverless PostgreSQL)

### Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### Step 2: Configure Vercel

1. Add `DATABASE_URL` environment variable in Vercel
2. Neon provides connection pooling automatically

## Environment Variables Setup

In your Vercel project **Settings** → **Environment Variables**, add:

### Required Database Variable
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Trading API Keys
```env
TRADIER_API_KEY=your_key
TRADIER_ACCOUNT_ID=your_account_id
TRADIER_BASE_URL=https://api.tradier.com/v1

ALPACA_API_KEY=your_key
ALPACA_API_SECRET=your_secret
ALPACA_PAPER=true

TWELVEDATA_API_KEY=your_key
MARKETDATA_API_KEY=your_key
```

### Trading Configuration
```env
DEFAULT_SYMBOL=SPX
BASE_POSITION_SIZE=2
PRIMARY_BROKER=tradier
EXECUTION_ENABLED=false
```

**Important**: Set `EXECUTION_ENABLED=false` initially for testing!

## Database Migration Steps

After deploying to Vercel, you need to run database migrations. You have two options:

### Option A: Run Migrations Locally (Recommended)

1. Connect to your production database locally:
   ```bash
   # Set DATABASE_URL to your production database
   export DATABASE_URL="postgresql://..."
   
   # Generate Prisma client
   npm run db:generate
   
   # Push schema
   npm run db:push
   
   # Or create migration
   npm run db:migrate
   
   # Initialize risk limits
   npm run db:init
   ```

### Option B: Use Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

4. Run migrations:
   ```bash
   npm run db:push
   npm run db:init
   ```

## Build Configuration

Vercel will automatically:
- Detect Next.js framework
- Run `npm install`
- Run `prisma generate` (via postinstall script)
- Build the application

The `vercel.json` file ensures Prisma client is generated during build.

## Post-Deployment Checklist

- [ ] Database is accessible and migrations are run
- [ ] All environment variables are set in Vercel
- [ ] Test webhook endpoint: `https://your-app.vercel.app/api/webhooks/tradingview`
- [ ] Verify dashboard loads: `https://your-app.vercel.app`
- [ ] Test with a sample TradingView webhook payload
- [ ] Check Vercel function logs for any errors
- [ ] Initialize risk limits in database

## Testing the Webhook

After deployment, test your webhook:

```bash
curl -X POST https://your-app.vercel.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "core",
    "direction": "long",
    "signal": "core_long",
    "tf": "5",
    "strike_hint": 5230.45,
    "risk_mult": 1.23,
    "miyagi": "BULL",
    "daily": "BULL",
    "timestamp": "2025-02-10T14:32:00Z"
  }'
```

## Updating TradingView Webhook URL

In your TradingView alerts, update the webhook URL to:
```
https://your-app.vercel.app/api/webhooks/tradingview
```

## Monitoring

- **Vercel Dashboard**: View function logs, deployments, and analytics
- **Database**: Use Prisma Studio or your database provider's dashboard
- **Logs**: Check Vercel function logs for webhook processing

## Troubleshooting

**Build fails with Prisma errors:**
- Ensure `DATABASE_URL` is set in Vercel
- Check that Prisma can connect to database
- Verify database is accessible from Vercel's IP ranges

**Webhook returns 500 errors:**
- Check Vercel function logs
- Verify all environment variables are set
- Check database connection

**Database connection timeouts:**
- For Supabase/Neon: Check connection pooling settings
- For Vercel Postgres: Ensure using correct connection string format

## Security Notes

- Never commit `.env` files
- Use Vercel's environment variable encryption
- Consider adding webhook authentication (API key validation)
- Regularly rotate API keys
- Monitor for unauthorized access

## Cost Considerations

- **Vercel Hobby Plan**: Free for personal projects
- **Vercel Postgres**: Free tier available (limited storage)
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Neon**: Free tier available (0.5GB storage)

For production with high traffic, consider upgrading plans as needed.

