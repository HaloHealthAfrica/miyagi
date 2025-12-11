# Cron Jobs Setup Guide

## Overview

The trading platform requires scheduled jobs to:
1. **Update Prices** - Update P&L for open positions
2. **Monitor Positions** - Check exit conditions and close positions
3. **Poll Orders** - Update order status from brokers

## API Endpoints

### 1. Update Prices
**Endpoint:** `GET/POST /api/cron/update-prices`
**Frequency:** Every 1-5 minutes during market hours
**Purpose:** Update current prices and recalculate P&L for all open positions

### 2. Monitor Positions
**Endpoint:** `GET/POST /api/cron/monitor-positions`
**Frequency:** Every 1-5 minutes during market hours
**Purpose:** Check stop loss, take profit, and expiry conditions

### 3. Poll Orders
**Endpoint:** `GET/POST /api/cron/poll-orders`
**Frequency:** Every 30 seconds - 2 minutes during market hours
**Purpose:** Update status of pending/submitted orders

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel Deployments)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/monitor-positions",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/poll-orders",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Note:** Vercel Cron requires Pro plan. Free tier has limitations.

### Option 2: External Cron Service (Recommended)

Use external services like:
- **Cron-job.org** (Free)
- **EasyCron** (Free tier available)
- **cron-job.net** (Free)
- **GitHub Actions** (Free)

#### Setup with Cron-job.org:

1. Go to https://cron-job.org
2. Create account (free)
3. Add new cron job:

**Job 1: Update Prices**
- URL: `https://your-app.vercel.app/api/cron/update-prices`
- Schedule: `*/5 * * * *` (every 5 minutes)
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 2: Monitor Positions**
- URL: `https://your-app.vercel.app/api/cron/monitor-positions`
- Schedule: `*/5 * * * *` (every 5 minutes)
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 3: Poll Orders**
- URL: `https://your-app.vercel.app/api/cron/poll-orders`
- Schedule: `*/2 * * * *` (every 2 minutes)
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: GitHub Actions (Free)

Create `.github/workflows/cron.yml`:

```yaml
name: Trading Platform Cron Jobs

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  update-prices:
    runs-on: ubuntu-latest
    steps:
      - name: Update Prices
        run: |
          curl -X GET "https://your-app.vercel.app/api/cron/update-prices" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  
  monitor-positions:
    runs-on: ubuntu-latest
    steps:
      - name: Monitor Positions
        run: |
          curl -X GET "https://your-app.vercel.app/api/cron/monitor-positions" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  
  poll-orders:
    runs-on: ubuntu-latest
    steps:
      - name: Poll Orders
        run: |
          curl -X GET "https://your-app.vercel.app/api/cron/poll-orders" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Security

### Setting CRON_SECRET

1. **Vercel:**
   - Go to Project → Settings → Environment Variables
   - Add: `CRON_SECRET=your-random-secret-key`

2. **GitHub Actions:**
   - Go to Repository → Settings → Secrets
   - Add: `CRON_SECRET`

3. **External Cron Services:**
   - Use the same secret in Authorization header

### Generate Secret:

```bash
# Generate random secret
openssl rand -base64 32
```

## Recommended Schedule

### Market Hours (9:30 AM - 4:00 PM ET, Mon-Fri)

- **Update Prices:** Every 5 minutes
- **Monitor Positions:** Every 5 minutes
- **Poll Orders:** Every 2 minutes

### After Hours

- **Update Prices:** Every 15 minutes (for options that trade after hours)
- **Monitor Positions:** Every 15 minutes
- **Poll Orders:** Every 5 minutes

## Testing

### Manual Test:

```bash
# Set your secret
export CRON_SECRET="your-secret"

# Test update prices
curl -X GET "https://your-app.vercel.app/api/cron/update-prices" \
  -H "Authorization: Bearer $CRON_SECRET"

# Test monitor positions
curl -X GET "https://your-app.vercel.app/api/cron/monitor-positions" \
  -H "Authorization: Bearer $CRON_SECRET"

# Test poll orders
curl -X GET "https://your-app.vercel.app/api/cron/poll-orders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring

### Check Logs:

1. **Vercel:**
   - Go to Project → Functions
   - Click on cron endpoint
   - View logs

2. **Response Format:**
```json
{
  "success": true,
  "message": "Price update completed",
  "updated": 5,
  "failed": 0,
  "timestamp": "2025-02-10T14:30:00Z"
}
```

## Troubleshooting

### Cron Not Running

1. Check CRON_SECRET is set correctly
2. Verify endpoint URLs are correct
3. Check cron service logs
4. Verify authentication header

### Jobs Failing

1. Check Vercel function logs
2. Verify database connection
3. Check API client initialization
4. Verify market data providers are accessible

### Performance Issues

1. Reduce frequency if hitting rate limits
2. Batch operations if possible
3. Monitor function execution time
4. Check database query performance

## Next Steps

After setting up cron jobs:

1. ✅ Monitor logs for first few days
2. ✅ Verify positions are closing correctly
3. ✅ Check P&L updates are accurate
4. ✅ Ensure orders are being tracked
5. ✅ Adjust schedules based on performance

Your trading platform will now automatically:
- Update position prices
- Close positions on stop loss/take profit
- Track order status
- Create trade outcomes for learning loop

