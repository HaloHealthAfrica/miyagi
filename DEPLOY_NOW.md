# Deploy to Vercel - Quick Guide

Your code is already on GitHub: https://github.com/HaloHealthAfrica/miyagi ✅

## Option 1: Deploy via Vercel Dashboard (Easiest - Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Sign in with your account

2. **Import Project:**
   - Click **"Add New..."** → **"Project"**
   - Click **"Import Git Repository"**
   - Find and select: **`HaloHealthAfrica/miyagi`**
   - Click **"Import"**

3. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: Already set (`prisma generate && next build`)
   - Output Directory: `.next` (default)

4. **Add Environment Variables:**
   Click **"Environment Variables"** and add:

   **Database (You already have these from Vercel Postgres):**
   - `DATABASE_URL` = (from Vercel Postgres)
   - `POSTGRES_URL` = (from Vercel Postgres)
   - `PRISMA_DATABASE_URL` = (from Vercel Postgres)

   **Trading API Keys (Add these):**
   - `TRADIER_API_KEY` = your_key
   - `TRADIER_ACCOUNT_ID` = your_account_id
   - `TRADIER_BASE_URL` = https://api.tradier.com/v1
   - `ALPACA_API_KEY` = your_key
   - `ALPACA_API_SECRET` = your_secret
   - `ALPACA_PAPER` = true
   - `TWELVEDATA_API_KEY` = your_key
   - `MARKETDATA_API_KEY` = your_key

   **Trading Configuration:**
   - `DEFAULT_SYMBOL` = SPX
   - `BASE_POSITION_SIZE` = 2
   - `PRIMARY_BROKER` = tradier
   - `EXECUTION_ENABLED` = false

5. **Deploy:**
   - Click **"Deploy"**
   - Wait for build to complete (2-3 minutes)

6. **After Deployment:**
   - Get your app URL (e.g., `https://miyagi-xxxxx.vercel.app`)
   - Run database migrations:
     ```bash
     npm run db:migrate:prod
     ```

## Option 2: Deploy via CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```
   (This will open a browser for authentication)

2. **Link Project:**
   ```bash
   vercel link
   ```
   - Select your account
   - Create new project or link to existing
   - Project name: `miyagi`

3. **Pull Environment Variables:**
   ```bash
   vercel env pull .env.local
   ```

4. **Add Missing Environment Variables:**
   Use Vercel dashboard or CLI:
   ```bash
   vercel env add TRADIER_API_KEY
   vercel env add ALPACA_API_KEY
   # ... etc
   ```

5. **Deploy:**
   ```bash
   vercel --prod
   ```

6. **Run Migrations:**
   ```bash
   npm run db:migrate:prod
   ```

## After Deployment

1. **Test Your App:**
   Visit: `https://your-app.vercel.app`

2. **Test Webhook:**
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

3. **Update TradingView:**
   Set webhook URL to: `https://your-app.vercel.app/api/webhooks/tradingview`

## Recommended: Use Dashboard Method

The dashboard method is easier because:
- ✅ Visual interface
- ✅ Easy environment variable management
- ✅ Automatic GitHub integration
- ✅ Auto-deploys on every push to main branch

After importing, Vercel will automatically deploy on every push!

