# Fixing Vercel 404 DEPLOYMENT_NOT_FOUND Error

This error means the deployment doesn't exist yet. Let's set it up properly.

## Solution: Create New Deployment via Dashboard

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Make sure you're logged in

### Step 2: Import Your GitHub Repository
1. Click **"Add New..."** button (top right)
2. Select **"Project"**
3. Click **"Import Git Repository"**
4. Find **`HaloHealthAfrica/miyagi`** in the list
5. Click **"Import"** next to it

### Step 3: Configure Project Settings
- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `prisma generate && next build` (already in package.json)
- **Output Directory**: `.next` (leave as default)
- **Install Command**: `npm install` (default)

### Step 4: Add Environment Variables
Before deploying, add these environment variables:

**Click "Environment Variables" and add:**

1. **Database URLs** (from your Vercel Postgres):
   - `DATABASE_URL` = (your postgres URL)
   - `POSTGRES_URL` = (your postgres URL)
   - `PRISMA_DATABASE_URL` = (your prisma accelerate URL)

2. **Trading API Keys**:
   - `TRADIER_API_KEY` = your_key
   - `TRADIER_ACCOUNT_ID` = your_account_id
   - `TRADIER_BASE_URL` = https://api.tradier.com/v1
   - `ALPACA_API_KEY` = your_key
   - `ALPACA_API_SECRET` = your_secret
   - `ALPACA_PAPER` = true
   - `TWELVEDATA_API_KEY` = your_key
   - `MARKETDATA_API_KEY` = your_key

3. **Configuration**:
   - `DEFAULT_SYMBOL` = SPX
   - `BASE_POSITION_SIZE` = 2
   - `PRIMARY_BROKER` = tradier
   - `EXECUTION_ENABLED` = false

### Step 5: Deploy
1. Click **"Deploy"** button
2. Wait for build to complete (2-3 minutes)
3. You'll get a deployment URL like: `https://miyagi-xxxxx.vercel.app`

## Alternative: Use CLI (If Dashboard Doesn't Work)

If you prefer CLI:

```bash
# 1. Login
vercel login

# 2. Link project (creates new project)
vercel link

# 3. Deploy
vercel --prod
```

## After Successful Deployment

1. **Get your deployment URL** from Vercel dashboard
2. **Run database migrations**:
   ```bash
   npm run db:migrate:prod
   ```
3. **Test your app**: Visit the deployment URL
4. **Test webhook**: 
   ```
   https://your-app.vercel.app/api/webhooks/tradingview
   ```

## Why the 404 Error Happened

The error occurs because:
- The project hasn't been imported to Vercel yet, OR
- You're trying to access a deployment that was deleted, OR
- The project isn't properly linked

**Solution**: Import the project fresh via the dashboard (Step 2 above).

## Troubleshooting

If you still get errors:
1. Check Vercel dashboard for build logs
2. Verify all environment variables are set
3. Make sure GitHub repository is accessible
4. Check that Next.js build completes successfully

