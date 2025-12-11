# Deploy to Vercel - Quick Steps

Your code is now on GitHub: https://github.com/HaloHealthAfrica/miyagi

## Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Sign in or create an account

2. **Import GitHub Repository:**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Find and select `HaloHealthAfrica/miyagi`
   - Click "Import"

3. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `prisma generate && next build` (already in package.json)
   - Output Directory: `.next` (default)

4. **Add Environment Variables:**
   Click "Environment Variables" and add:

   **Database (You already have these from Vercel Postgres):**
   - `DATABASE_URL` - Your Vercel Postgres URL
   - `POSTGRES_URL` - Your Vercel Postgres URL
   - `PRISMA_DATABASE_URL` - Your Prisma Accelerate URL

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
   - Click "Deploy"
   - Wait for build to complete

6. **Run Database Migrations:**
   After first deployment, run migrations:
   ```bash
   npm run db:migrate:prod
   ```
   (This will use your PRISMA_DATABASE_URL)

## Option 2: Deploy via CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Link Project:**
   ```bash
   vercel link
   ```
   - Select your Vercel account
   - Create new project or link to existing
   - Project name: `miyagi` (or your choice)

3. **Pull Environment Variables:**
   ```bash
   vercel env pull .env.local
   ```

4. **Add Missing Environment Variables:**
   Edit `.env.local` and add your API keys, then push back:
   ```bash
   vercel env add TRADIER_API_KEY
   vercel env add ALPACA_API_KEY
   # ... etc for all variables
   ```

5. **Run Database Migrations:**
   ```bash
   npm run db:migrate:prod
   ```

6. **Deploy:**
   ```bash
   vercel --prod
   ```

## After Deployment

1. **Get your deployment URL:**
   - Check Vercel dashboard for: `https://miyagi-xxxxx.vercel.app`

2. **Test the webhook:**
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
- ✅ Auto-deploys on every push

After importing, Vercel will automatically deploy on every push to main branch!

