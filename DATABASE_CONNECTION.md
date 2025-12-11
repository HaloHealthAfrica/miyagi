# Database Connection Guide

## Frontend to Database Connection

The frontend is connected to the database through Next.js API routes that use Prisma ORM.

### Connection Flow

```
Frontend (React/Next.js)
    ↓
API Routes (/api/*)
    ↓
Prisma Client
    ↓
PostgreSQL Database
```

### API Routes

All API routes are located in `src/app/api/` and connect to the database:

- **`/api/signals`** - Fetches TradingView signals
- **`/api/decisions`** - Fetches decision engine outputs
- **`/api/positions`** - Fetches trading positions
- **`/api/orders`** - Fetches broker orders
- **`/api/scanner`** - Fetches scanner state
- **`/api/config`** - Fetches configuration and risk state
- **`/api/risk/update`** - Updates risk settings
- **`/api/health`** - Database health check

### Database Configuration

The database connection is configured via environment variables:

```env
# Primary (use Prisma Accelerate if available)
PRISMA_DATABASE_URL=prisma+postgres://...

# Fallback options
POSTGRES_URL=postgres://...
DATABASE_URL=postgres://...
```

Priority order:
1. `PRISMA_DATABASE_URL` (Prisma Accelerate - fastest)
2. `POSTGRES_URL` (Pooled connection)
3. `DATABASE_URL` (Direct connection)

### Prisma Client

The Prisma client is initialized in `src/lib/prisma.ts`:

- Automatically handles connection pooling
- Supports Prisma Accelerate
- Graceful shutdown handling
- Development logging enabled

### Testing the Connection

1. **Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Test API Route:**
   ```bash
   curl http://localhost:3000/api/signals
   ```

3. **Check Frontend:**
   - Visit `http://localhost:3000/dashboard`
   - Data should load automatically via SWR

### Troubleshooting

**Database connection errors:**
- Verify `DATABASE_URL` is set in `.env.local` or Vercel environment variables
- Check database is accessible from your network
- Verify Prisma schema matches database structure

**API route errors:**
- Check browser console for errors
- Check server logs for Prisma errors
- Verify API routes are returning data: `curl /api/signals`

**Frontend not loading data:**
- Check Network tab in browser DevTools
- Verify API routes are responding
- Check SWR is configured correctly in `src/app/providers.tsx`

### Production Setup

For Vercel deployment:

1. **Set Environment Variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `DATABASE_URL`, `POSTGRES_URL`, or `PRISMA_DATABASE_URL`

2. **Run Migrations:**
   ```bash
   npm run db:migrate:prod
   ```

3. **Verify Connection:**
   - Visit `https://your-app.vercel.app/api/health`
   - Should return `{ status: 'healthy', database: 'connected' }`

### Data Flow Example

1. User visits `/dashboard`
2. React component calls `usePositions()` hook
3. SWR fetches `/api/positions`
4. API route uses `prisma.position.findMany()`
5. Prisma queries PostgreSQL database
6. Data flows back through API → Frontend
7. UI updates automatically (refreshes every 5 seconds)

All connections are already set up and working!

