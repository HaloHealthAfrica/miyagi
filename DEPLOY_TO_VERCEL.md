# Deploy to Vercel - Quick Guide

Your code is on GitHub: https://github.com/HaloHealthAfrica/miyagi ✅

## Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Sign in

2. **If project already exists:**
   - Find your `miyagi` project
   - Click on it
   - Go to "Deployments" tab
   - Click "Redeploy" on the latest deployment
   - OR it will auto-deploy if GitHub integration is enabled

3. **If project doesn't exist:**
   - Click "Add New..." → "Project"
   - Import: `HaloHealthAfrica/miyagi`
   - Configure:
     - Framework: Next.js (auto-detected)
     - Build Command: `prisma generate && next build`
     - Root Directory: `./`
   - Add environment variables (see below)
   - Click "Deploy"

## Option 2: Deploy via CLI

```bash
# 1. Login to Vercel
vercel login

# 2. Link project (if not already linked)
vercel link

# 3. Deploy to production
vercel --prod
```

## Required Environment Variables

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

**Database:**
- `PRISMA_DATABASE_URL` (or `POSTGRES_URL` or `DATABASE_URL`)

**Trading APIs:**
- `TRADIER_API_KEY`
- `TRADIER_ACCOUNT_ID`
- `TRADIER_BASE_URL` = `https://api.tradier.com/v1`
- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`
- `ALPACA_PAPER` = `true`
- `TWELVEDATA_API_KEY`
- `MARKETDATA_API_KEY`

**Configuration:**
- `DEFAULT_SYMBOL` = `SPX`
- `BASE_POSITION_SIZE` = `2`
- `PRIMARY_BROKER` = `tradier`
- `EXECUTION_ENABLED` = `false`

## After Deployment

1. **Run Database Migrations:**
   ```bash
   npm run db:migrate:prod
   ```

2. **Test Health Check:**
   ```
   https://your-app.vercel.app/api/health
   ```

3. **Visit Dashboard:**
   ```
   https://your-app.vercel.app/dashboard
   ```

## Auto-Deploy

If Vercel is connected to your GitHub repo, it will automatically deploy on every push to `main` branch!

