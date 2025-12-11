# Automated Deployment Guide

This guide walks you through the automated deployment workflow using the provided scripts.

## Prerequisites

1. **Vercel Account** ✅ (You have this)
2. **Vercel Postgres Database** ✅ (You've set this up)
3. **GitHub Account** (for code repository)
4. **Node.js and npm** installed locally

## Your Database URLs

You've already set up Vercel Postgres with:
- `DATABASE_URL` - Direct connection
- `POSTGRES_URL` - Pooled connection  
- `PRISMA_DATABASE_URL` - Prisma Accelerate connection (recommended)

## Quick Start Deployment

### Option 1: Automated Script (Recommended)

```bash
# 1. Make scripts executable (Mac/Linux)
chmod +x scripts/*.sh

# 2. Initial Vercel setup (one-time)
npm run setup:vercel

# 3. Deploy everything (pushes to GitHub, deploys to Vercel, runs migrations)
npm run deploy
```

### Option 2: Manual Step-by-Step

#### Step 1: Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit"
```

#### Step 2: Create GitHub Repository

1. Go to GitHub and create a new repository
2. Copy the repository URL

#### Step 3: Push to GitHub

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

#### Step 4: Set Up Vercel Project

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local
```

#### Step 5: Add Environment Variables to Vercel

Go to your Vercel project dashboard → Settings → Environment Variables

Add all these variables:

```env
# Database (Vercel Postgres auto-provides these, but verify they're set)
DATABASE_URL=postgres://...
POSTGRES_URL=postgres://...
PRISMA_DATABASE_URL=prisma+postgres://...

# Trading API Keys
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

#### Step 6: Run Database Migrations

```bash
# This will use PRISMA_DATABASE_URL if available, otherwise POSTGRES_URL or DATABASE_URL
npm run db:migrate:prod
```

#### Step 7: Deploy to Vercel

```bash
# Deploy to production
npm run deploy:vercel

# Or use the full deploy script
npm run deploy
```

## GitHub Actions CI/CD Setup

The repository includes a GitHub Actions workflow that automatically:
- Runs on push to main/master
- Generates Prisma client
- Deploys database migrations
- Builds and deploys to Vercel

### Setup GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add these secrets:

```
DATABASE_URL=postgres://... (or use PRISMA_DATABASE_URL)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### Get Vercel Credentials

```bash
# Get Vercel token
vercel whoami

# Get Org and Project IDs (from .vercel/project.json after running vercel link)
cat .vercel/project.json
```

## Environment Variable Priority

The system uses this priority order:
1. `PRISMA_DATABASE_URL` (Prisma Accelerate - fastest)
2. `POSTGRES_URL` (Pooled connection)
3. `DATABASE_URL` (Direct connection)

## Deployment Workflow

```
┌─────────────────┐
│  Local Changes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git Commit      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push to GitHub  │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ GitHub Actions  │  │  Vercel Deploy   │
│ (CI/CD)         │  │  (Manual/CLI)    │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         └─────────┬──────────┘
                   ▼
         ┌─────────────────┐
         │  Run Migrations  │
         └────────┬─────────┘
                   ▼
         ┌─────────────────┐
         │  Deploy Complete │
         └──────────────────┘
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run setup:vercel` | Initial Vercel project setup |
| `npm run deploy` | Full deployment (Git push + Vercel deploy + migrations) |
| `npm run deploy:vercel` | Deploy to Vercel only |
| `npm run db:migrate:prod` | Run database migrations against production |

## Troubleshooting

### Migration Errors

If migrations fail, try:

```bash
# Use db push instead of migrate deploy
npx prisma db push

# Or create a new migration
npx prisma migrate dev --name init
npx prisma migrate deploy
```

### Environment Variables Not Found

```bash
# Pull latest from Vercel
vercel env pull .env.local

# Verify variables
cat .env.local | grep DATABASE
```

### Prisma Client Generation Issues

```bash
# Regenerate client
npx prisma generate

# Clear Prisma cache
rm -rf node_modules/.prisma
npx prisma generate
```

## Post-Deployment Checklist

- [ ] Database migrations completed successfully
- [ ] Risk limits initialized (check via dashboard)
- [ ] Webhook endpoint accessible: `https://your-app.vercel.app/api/webhooks/tradingview`
- [ ] Dashboard loads: `https://your-app.vercel.app`
- [ ] Test webhook with sample payload
- [ ] Verify environment variables in Vercel dashboard
- [ ] Check Vercel function logs for errors

## Next Steps After Deployment

1. **Update TradingView Webhook URL:**
   ```
   https://your-app.vercel.app/api/webhooks/tradingview
   ```

2. **Test the Webhook:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/webhooks/tradingview \
     -H "Content-Type: application/json" \
     -d @examples/tradingview-webhook-examples.json
   ```

3. **Monitor Logs:**
   - Vercel Dashboard → Functions → View logs
   - Check for any errors or warnings

4. **Enable Execution (when ready):**
   - Set `EXECUTION_ENABLED=true` in Vercel environment variables
   - Redeploy or wait for next deployment

## Security Notes

- Never commit `.env.local` to Git
- Use Vercel's encrypted environment variables
- Rotate API keys regularly
- Monitor for unauthorized access
- Consider adding webhook authentication

