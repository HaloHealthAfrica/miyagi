# Webhook Setup and Testing Guide

## Webhook Endpoints

### Production Webhook
```
POST https://your-app.vercel.app/api/webhooks/tradingview
```

### Test Webhook
```
POST https://your-app.vercel.app/api/webhooks/test
GET https://your-app.vercel.app/api/webhooks/test (check status)
```

## Webhook Features

✅ **Always Saves Webhooks**
- Valid webhooks are saved and processed
- Invalid webhooks are saved for debugging
- Error webhooks are saved for troubleshooting

✅ **Error Handling**
- Invalid JSON → Saved as "parse_error"
- Validation errors → Saved with error details
- Processing errors → Saved with stack trace

✅ **Logging**
- All webhooks are logged with timestamps
- Processing time is tracked
- Errors are logged with full details

## Testing the Webhook

### 1. Test with curl

**Core Signal (LONG):**
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

**Core Signal (SHORT):**
```bash
curl -X POST https://your-app.vercel.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "core",
    "direction": "short",
    "signal": "core_short",
    "tf": "5",
    "strike_hint": 5211.30,
    "risk_mult": 1.18,
    "miyagi": "BEAR",
    "daily": "BEAR",
    "timestamp": "2025-02-10T14:35:00Z"
  }'
```

**Runner Signal:**
```bash
curl -X POST https://your-app.vercel.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "runner",
    "direction": "long",
    "signal": "runner_322_long",
    "tf": "5",
    "strike_hint": 5242.10,
    "risk_mult": 0.62,
    "miyagi": "BULL",
    "daily": "BULL",
    "timestamp": "2025-02-10T15:05:00Z"
  }'
```

**Scanner Signal:**
```bash
curl -X POST https://your-app.vercel.app/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "scanner",
    "symbol": "SPY",
    "new_bias": "BULL",
    "timestamp": "2025-02-10T14:30:00Z"
  }'
```

### 2. Test Endpoint

**Send test webhook:**
```bash
curl -X POST https://your-app.vercel.app/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Check webhook status:**
```bash
curl https://your-app.vercel.app/api/webhooks/test
```

## TradingView Alert Configuration

### Step 1: Get Your Webhook URL

```
https://your-app.vercel.app/api/webhooks/tradingview
```

### Step 2: Configure TradingView Alert

In your TradingView Pine Script alert settings:

1. **Alert Name**: Any name
2. **Webhook URL**: `https://your-app.vercel.app/api/webhooks/tradingview`
3. **Alert Message**: Use JSON format (see below)

### Step 3: Alert Message Templates

**For Core LONG:**
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

**For Core SHORT:**
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

**For Runner LONG:**
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

**For Scanner:**
```json
{
  "type": "scanner",
  "symbol": "SPY",
  "new_bias": "BULL",
  "timestamp": "{{time}}"
}
```

## What Happens When Webhook is Received

1. **Webhook Received** → Logged with timestamp
2. **JSON Parsed** → If invalid, saved as error
3. **Validated** → Zod schema validation
4. **Saved to Database** → Signal table
5. **Processed** → Decision engine runs
6. **Decision Saved** → Decision table
7. **Execution** → If not IGNORE, order placed (if enabled)
8. **Response** → JSON response with status

## Verifying Webhooks Are Working

### 1. Check Webhook Status

Visit: `https://your-app.vercel.app/api/webhooks/test`

This shows:
- Total webhooks received
- Processed vs unprocessed
- Recent webhooks

### 2. Check Signals Page

Visit: `https://your-app.vercel.app/signals`

You should see:
- All received webhooks
- Their processing status
- Linked decisions

### 3. Check Debug Page

Visit: `https://your-app.vercel.app/debug`

Test the signals API to see if data is there.

### 4. Check Vercel Logs

1. Go to Vercel Dashboard
2. Your Project → Functions
3. Click on `/api/webhooks/tradingview`
4. View logs for webhook activity

## Troubleshooting

### Webhook Returns 400

**Cause:** Invalid payload format

**Solution:**
- Check JSON syntax
- Verify all required fields are present
- Check TradingView alert message format

### Webhook Returns 500

**Cause:** Server error (database, processing, etc.)

**Solution:**
1. Check Vercel function logs
2. Verify database is accessible
3. Check if tables exist (run migrations)
4. Verify environment variables are set

### Webhook Saved But Not Processed

**Cause:** Decision engine error or validation failure

**Solution:**
1. Check signals page - see if signal is marked as processed
2. Check decisions page - see if decision was created
3. Check Vercel logs for processing errors

### No Webhooks Received

**Cause:** TradingView not sending or URL incorrect

**Solution:**
1. Verify webhook URL in TradingView alert
2. Test with curl to verify endpoint works
3. Check TradingView alert history
4. Verify alert is actually triggering

## Security Considerations

⚠️ **Current Implementation:**
- No authentication on webhook endpoint
- Anyone can send webhooks

🔒 **Recommended:**
- Add API key validation
- Add IP whitelist (if TradingView IPs are known)
- Add rate limiting

## Monitoring

### Check Recent Webhooks

```bash
curl https://your-app.vercel.app/api/webhooks/test
```

### View in Database

```bash
npm run db:studio
# Navigate to Signal table
```

### View in UI

- **Signals Page**: All webhooks
- **Decisions Page**: Processed webhooks
- **Debug Page**: API status

## Success Indicators

✅ Webhook returns `{"success": true, ...}`
✅ Signal appears in `/signals` page
✅ Decision created (if valid)
✅ Order placed (if execution enabled and decision not IGNORE)
✅ No errors in Vercel logs

Your webhook endpoint is ready to receive and process TradingView alerts!

