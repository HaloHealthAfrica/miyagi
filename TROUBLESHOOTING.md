# Troubleshooting: No Data in UI

## Quick Checks

### 1. Is the database seeded?

```bash
# Run the seed script
npm run db:seed
```

You should see output like:
```
✅ Created:
   - 20 signals
   - 15 decisions
   - 10 orders
   - 5 positions
```

### 2. Check Database Connection

```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 3. Test API Endpoints Directly

Visit: `http://localhost:3000/debug`

This page will test all API endpoints and show you:
- Which endpoints are working
- What data they're returning
- Any errors

### 4. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Go to Network tab
5. Check if API requests are failing

### 5. Check Server Logs

If running locally:
```bash
npm run dev
```

Look for errors in the terminal.

## Common Issues

### Issue: "Error loading signals" or similar

**Solution:**
1. Check if database is seeded: `npm run db:seed`
2. Verify DATABASE_URL is set correctly
3. Check `/api/health` endpoint
4. Visit `/debug` page to see detailed errors

### Issue: API returns empty arrays

**Solution:**
- Database is empty - run `npm run db:seed`
- Check database connection
- Verify Prisma schema matches database

### Issue: "Cannot connect to database"

**Solution:**
1. Verify `DATABASE_URL` environment variable
2. Check database is running and accessible
3. For Vercel: Check environment variables in dashboard
4. Test connection: `npm run db:studio`

### Issue: Frontend shows "Loading..." forever

**Solution:**
1. Check Network tab in browser DevTools
2. See if API requests are pending or failing
3. Check server is running
4. Verify API routes are accessible

## Step-by-Step Debugging

### Step 1: Verify Database
```bash
# Check if you can connect
npm run db:studio
# This opens Prisma Studio - you should see tables and data
```

### Step 2: Seed Database
```bash
npm run db:seed
```

### Step 3: Test API
```bash
# In browser or terminal
curl http://localhost:3000/api/signals
```

Should return JSON with signals array.

### Step 4: Check Frontend
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for `/api/signals`, `/api/positions`, etc.
5. Click on each request to see response

### Step 5: Use Debug Page
Visit `http://localhost:3000/debug` and click "Test All Endpoints"

## Expected Behavior

After seeding, you should see:

- **Dashboard**: Stats cards with numbers, position info, scanner table
- **Signals**: Table with 20 signals
- **Decisions**: Table with decisions
- **Positions**: Table with open/closed positions
- **Orders**: Table with orders
- **Scanner**: Table with bias for SPY, QQQ, etc.
- **Risk**: Risk limits and state

## Still Not Working?

1. **Check Environment Variables:**
   ```bash
   # Local
   cat .env.local | grep DATABASE
   
   # Vercel: Check dashboard → Settings → Environment Variables
   ```

2. **Verify Prisma Client:**
   ```bash
   npm run db:generate
   ```

3. **Check Database Schema:**
   ```bash
   npm run db:push
   ```

4. **View Database:**
   ```bash
   npm run db:studio
   ```

5. **Check Logs:**
   - Browser console (F12)
   - Server terminal
   - Vercel function logs (if deployed)

## Getting Help

If still stuck, provide:
1. Output from `/debug` page
2. Browser console errors
3. Server logs
4. Result of `npm run db:seed`

