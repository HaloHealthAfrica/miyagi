# Fixing 500 Errors on API Routes

## Common Causes

### 1. Database Schema Not Migrated

**Symptom:** All APIs return 500 except `/api/health`

**Solution:**
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run migrations
npm run db:migrate:prod

# Or push schema directly
npm run db:push
```

### 2. Prisma Client Not Generated

**Symptom:** "Cannot find module '@prisma/client'" or similar

**Solution:**
```bash
# Generate Prisma client
npm run db:generate

# Rebuild
npm run build
```

### 3. Database Tables Don't Exist

**Symptom:** "relation does not exist" errors

**Solution:**
```bash
# Push schema to create tables
npm run db:push

# Or create migration
npm run db:migrate
```

### 4. Environment Variables Not Set in Vercel

**Symptom:** "No DATABASE_URL found" errors

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `PRISMA_DATABASE_URL` (preferred)
   - `POSTGRES_URL` (fallback)
   - `DATABASE_URL` (fallback)
3. Redeploy

### 5. Prisma Client Singleton Issue in Serverless

**Symptom:** Connection errors in production

**Solution:** Already fixed in `src/lib/prisma.ts` - uses proper singleton pattern

## Step-by-Step Fix

### Step 1: Verify Database Connection

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "tablesExist": true
}
```

### Step 2: Check Vercel Environment Variables

1. Go to Vercel Dashboard
2. Project → Settings → Environment Variables
3. Verify these are set:
   - `PRISMA_DATABASE_URL` or `POSTGRES_URL` or `DATABASE_URL`

### Step 3: Run Database Migrations

```bash
# Pull env vars
vercel env pull .env.local

# Run migrations
npm run db:migrate:prod
```

### Step 4: Verify Schema

```bash
# Check if tables exist
npm run db:studio
```

### Step 5: Seed Database (Optional)

```bash
npm run db:seed:vercel
```

## Debugging

### Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Your Project → Functions
3. Click on a failed function
4. View logs for error details

### Use Debug Page

Visit: `https://your-app.vercel.app/debug`

This will show:
- Which endpoints are failing
- Error messages
- Response details

### Common Error Messages

**"P1001: Can't reach database server"**
- Database URL is incorrect
- Database is not accessible
- Firewall blocking connection

**"P2021: Table does not exist"**
- Schema not migrated
- Run: `npm run db:push`

**"P1000: Authentication failed"**
- Database credentials incorrect
- Check DATABASE_URL format

**"Cannot find module '@prisma/client'"**
- Prisma client not generated
- Run: `npm run db:generate`

## Quick Fix Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migrations run: `npm run db:migrate:prod`
- [ ] Prisma client generated: `npm run db:generate`
- [ ] Health endpoint works: `/api/health`
- [ ] Database seeded: `npm run db:seed:vercel`
- [ ] Vercel deployment successful
- [ ] Check function logs for errors

## After Fixing

1. **Test Health:**
   ```
   https://your-app.vercel.app/api/health
   ```

2. **Test Signals:**
   ```
   https://your-app.vercel.app/api/signals
   ```

3. **Visit Debug Page:**
   ```
   https://your-app.vercel.app/debug
   ```

4. **Check Dashboard:**
   ```
   https://your-app.vercel.app/dashboard
   ```

All endpoints should now return data instead of 500 errors!

