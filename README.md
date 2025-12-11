# Miyagi Trading Platform

A production-grade trading platform that processes TradingView alerts via webhooks, validates signals using multiple data providers, and executes trades through Tradier and Alpaca brokers.

## Features

- **TradingView Webhook Integration**: Receives and processes core, runner, and scanner signals
- **Multi-Provider Data**: Pulls market data from Tradier, Alpaca, TwelveData, and MarketData.app
- **Decision Engine**: Validates signals, enforces position state machine, and computes entries/exits
- **Risk Management**: Position limits, daily loss caps, and per-trade risk controls
- **Execution Layer**: Routes orders to Tradier (primary) or Alpaca (secondary)
- **Real-time Dashboard**: Monitor signals, positions, orders, and scanner state
- **PostgreSQL Database**: Full audit trail of all signals, decisions, and trades

## Architecture

```
TradingView Alerts → Webhook → Decision Engine → Execution Engine → Broker
                              ↓
                         Data Providers
                         (Tradier, Alpaca, 
                          TwelveData, MarketData.app)
                              ↓
                         PostgreSQL Database
                              ↓
                         Next.js Dashboard
```

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- API keys for:
  - Tradier (broker + market data)
  - Alpaca (broker + market data)
  - TwelveData (market data)
  - MarketData.app (options data)

## Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/miyagi_strat"

# Tradier (Primary Broker)
TRADIER_API_KEY=your_tradier_api_key
TRADIER_ACCOUNT_ID=your_tradier_account_id
TRADIER_BASE_URL=https://api.tradier.com/v1

# Alpaca (Secondary Broker)
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_API_SECRET=your_alpaca_api_secret
ALPACA_PAPER=true  # Set to false for live trading

# Market Data Providers
TWELVEDATA_API_KEY=your_twelvedata_api_key
MARKETDATA_API_KEY=your_marketdata_api_key

# Trading Configuration
DEFAULT_SYMBOL=SPX
BASE_POSITION_SIZE=2
PRIMARY_BROKER=tradier
EXECUTION_ENABLED=false  # Set to true to enable live execution
```

3. **Set up the database:**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (or use migrations)
npm run db:push

# Or create a migration
npm run db:migrate

# Initialize default risk limits and risk state
npm run db:init
```

This will create:
- Default risk limit configuration
- Today's risk state record

Alternatively, you can manually create risk limits via Prisma Studio:

```bash
npm run db:studio
```

5. **Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## TradingView Webhook Setup

1. **Get your webhook URL:**

Once the server is running, your webhook endpoint is:
```
http://your-domain.com/api/webhooks/tradingview
```

For local development with ngrok:
```bash
ngrok http 3000
# Use the ngrok URL: https://xxxx.ngrok.io/api/webhooks/tradingview
```

2. **Configure TradingView Alert:**

In your TradingView Pine Script, create an alert with the following webhook URL and JSON payload format:

**For Core Signals (LONG):**
```json
{
  "type": "core",
  "direction": "long",
  "signal": "core_long",
  "tf": "5",
  "strike_hint": {{close}},
  "risk_mult": 1.23,
  "miyagi": "BULL",
  "daily": "BULL",
  "timestamp": "{{time}}"
}
```

**For Core Signals (SHORT):**
```json
{
  "type": "core",
  "direction": "short",
  "signal": "core_short",
  "tf": "5",
  "strike_hint": {{close}},
  "risk_mult": 1.18,
  "miyagi": "BEAR",
  "daily": "BEAR",
  "timestamp": "{{time}}"
}
```

**For Runner Signals (LONG):**
```json
{
  "type": "runner",
  "direction": "long",
  "signal": "runner_322_long",
  "tf": "5",
  "strike_hint": {{close}},
  "risk_mult": 0.62,
  "miyagi": "BULL",
  "daily": "BULL",
  "timestamp": "{{time}}"
}
```

**For Scanner Events:**
```json
{
  "type": "scanner",
  "symbol": "SPY",
  "new_bias": "BULL",
  "timestamp": "{{time}}"
}
```

3. **Test the webhook:**

You can test the webhook using curl:

```bash
curl -X POST http://localhost:3000/api/webhooks/tradingview \
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

## Dashboard Pages

- **Signals** (`/signals`): View all TradingView webhook signals and their resulting decisions
- **Positions** (`/positions`): Monitor open positions with P&L
- **Orders** (`/orders`): Track order status and execution history
- **Scanner** (`/scanner`): View macro regime bias for major indices
- **Config** (`/config`): View risk limits and current risk state

## API Endpoints

- `POST /api/webhooks/tradingview` - Receive TradingView alerts
- `GET /api/signals` - List recent signals
- `GET /api/positions` - Get open positions
- `GET /api/orders` - List recent orders
- `GET /api/scanner` - Get scanner state
- `GET /api/config` - Get configuration and risk state

## Decision Engine Logic

### Core Signals

1. Validates position state (must be FLAT to open new position)
2. Checks macro bias alignment (miyagi/daily fields)
3. Validates scanner state (conflicts with major indices)
4. Fetches market data for price validation
5. Selects appropriate option contract based on strike_hint
6. Calculates position size using risk_mult
7. Checks risk limits (max positions, daily loss, per-trade risk)

### Runner Signals

1. Requires existing position in same direction
2. Validates runner count limits
3. Selects option contract
4. Calculates smaller position size (based on risk_mult)

### Scanner Signals

1. Stores scanner event in database
2. Updates macro regime state
3. No direct trade execution (used for filtering other signals)

## Position State Machine

- **FLAT** → Can open LONG or SHORT (core signals)
- **LONG** → Can add LONG (runner signals), cannot open SHORT
- **SHORT** → Can add SHORT (runner signals), cannot open LONG

## Risk Management

The platform enforces several risk controls:

- **Max Positions**: Limits total open positions
- **Max Daily Loss**: Hard stop if daily P&L exceeds threshold
- **Max Risk Per Trade**: Limits position size per trade
- **Max Runners Per Core**: Limits number of runner positions per core

## Simulation Mode

By default, `EXECUTION_ENABLED=false` runs in simulation mode:
- All signals are processed and decisions are made
- Decisions are logged to the database
- No actual orders are placed with brokers

Set `EXECUTION_ENABLED=true` to enable live execution.

## Database Schema

Key tables:
- `signals` - Raw TradingView webhook payloads
- `decisions` - Decision engine outputs
- `orders` - Broker orders
- `positions` - Open/closed positions
- `executions` - Order fills
- `scanner_events` - Macro regime scanner events
- `risk_limits` - Risk configuration
- `risk_state` - Current risk metrics

## Development

```bash
# Run development server
npm run dev

# Generate Prisma client after schema changes
npm run db:generate

# Open Prisma Studio to view/edit database
npm run db:studio

# Create a new migration
npm run db:migrate
```

## Production Deployment

### Quick Deploy to Vercel

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a complete guide on deploying to Vercel.

**Quick Steps:**
1. Push code to GitHub/GitLab
2. Import repository in Vercel
3. Set up Vercel Postgres (or use Supabase/Neon)
4. Add all environment variables in Vercel dashboard
5. Deploy and run database migrations

### Manual Deployment

1. Set up PostgreSQL database (e.g., AWS RDS, Supabase, Railway)
2. Configure all environment variables
3. Run database migrations
4. Build the application: `npm run build`
5. Start the server: `npm start`
6. Set up reverse proxy (nginx) or deploy to Vercel/Netlify
7. Configure TradingView webhook URL to point to your production domain

## Security Considerations

- Never commit `.env` files to version control
- Use environment variables for all API keys
- Implement webhook authentication (add API key validation)
- Use HTTPS in production
- Regularly rotate API keys
- Monitor for unauthorized access

## Troubleshooting

**Webhook not receiving signals:**
- Check that TradingView alert is configured correctly
- Verify webhook URL is accessible
- Check server logs for errors

**Orders not executing:**
- Verify `EXECUTION_ENABLED=true`
- Check broker API credentials
- Verify account has sufficient buying power
- Check order status in broker dashboard

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database permissions

## License

This project is for educational and personal use. Ensure compliance with broker terms of service and applicable regulations.

## Support

For issues or questions, please check the logs and database for error details. The decision engine logs reasoning for all IGNORE actions, which can help debug signal processing issues.

