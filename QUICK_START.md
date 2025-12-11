# Quick Start Deployment Guide

You've already set up Vercel Postgres! Here's how to deploy everything.

## Your Database URLs (Already Configured)

You have:
- `DATABASE_URL` - Direct connection
- `POSTGRES_URL` - Pooled connection
- `PRISMA_DATABASE_URL` - Prisma Accelerate (recommended for production)

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel Project (One-Time)

**Windows (PowerShell):**
```powershell
npm run setup:vercel
```

**Mac/Linux:**
```bash
npm run setup:vercel
```

This will:
- Install Vercel CLI (if needed)
- Log you into Vercel
- Link your project
- Pull environment variables

### 3. Add Missing Environment Variables to Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these (if not already there):

```env
# Trading API Keys (you need to add these)
TRADIER_API_KEY=your_key
TRADIER_ACCOUNT_ID=your_account_id
TRADIER_BASE_URL=https://api.tradier.com/v1

ALPACA_API_KEY=your_key
ALPACA_API_SECRET=your_secret
ALPACA_PAPER=true

TWELVEDATA_API_KEY=your_key
MARKETDATA_API_KEY=your_key

# Trading Configuration
DEFAULT_SYMBOL=SPX
BASE_POSITION_SIZE=2
PRIMARY_BROKER=tradier
EXECUTION_ENABLED=false
```

**Note:** Your database URLs are already set by Vercel Postgres!

### 4. Initialize Git Repository (if not done)

```bash
git init
git add .
git commit -m "Initial commit"
```

### 5. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Copy the repository URL

### 6. Connect to GitHub

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

### 7. Run Database Migrations

**Windows (PowerShell):**
```powershell
npm run db:migrate:prod
```

**Mac/Linux:**
```bash
npm run db:migrate:prod
```

This will:
- Use your `PRISMA_DATABASE_URL` (Prisma Accelerate)
- Generate Prisma client
- Deploy database schema
- Initialize risk limits

### 8. Deploy to Vercel

**Option A: Full Automated Deployment**
```bash
npm run deploy
```

**Option B: Just Deploy (if already pushed to GitHub)**
```bash
npm run deploy:vercel
```

### 9. Verify Deployment

1. Check your Vercel dashboard for the deployment URL
2. Visit: `https://your-app.vercel.app`
3. Test webhook: `https://your-app.vercel.app/api/webhooks/tradingview`

## Testing the Webhook

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

## Update TradingView Webhook

In your TradingView alerts, set the webhook URL to:
```
https://your-app.vercel.app/api/webhooks/tradingview
```

## Troubleshooting

### Migration Fails

Try using `db push` instead:
```bash
npx prisma db push
```

### Environment Variables Not Found

Pull them again:
```bash
vercel env pull .env.local
```

### Prisma Client Issues

```bash
npx prisma generate
```

## Next Steps

1. ✅ Database is set up
2. ✅ Migrations are run
3. ✅ App is deployed
4. ⏭️ Add your TradingView webhook URL
5. ⏭️ Test with sample signals
6. ⏭️ Monitor dashboard for incoming signals

## Need Help?

- Check `DEPLOYMENT_AUTOMATED.md` for detailed instructions
- Check Vercel function logs for errors
- Verify all environment variables are set

