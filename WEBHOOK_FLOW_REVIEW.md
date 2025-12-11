# Webhook Flow Review

## Current Implementation Analysis

### Current Flow:
```
1. Webhook Received
   ↓
2. Parse & Validate JSON
   ↓
3. Call decisionEngine.processSignal()
   ↓
   Inside processSignal():
   a. Save signal to DB ✅
   b. Process with decision engine
   c. Save decision
   ↓
4. Execute decision (if not IGNORE)
```

### Issue Identified:
- Signal saving happens INSIDE `processSignal()` method
- If `processSignal()` fails before saving, signal is lost
- No clear separation between "save" and "process" steps

## Recommended Flow:

```
1. Webhook Received
   ↓
2. Parse & Validate JSON
   ↓
3. Save Signal to DB FIRST (with processed=false)
   ↓
4. Process Signal with Decision Engine
   ↓
5. Update Signal (mark as processed)
   ↓
6. Execute Decision (if not IGNORE)
```

## Benefits of Improved Flow:

1. **Signal Always Saved** - Even if processing fails
2. **Clear Separation** - Save vs Process are distinct steps
3. **Retry Capability** - Can reprocess unprocessed signals
4. **Better Error Handling** - Signal saved even on processing errors
5. **Audit Trail** - All webhooks saved regardless of processing status

## Proposed Changes:

1. Save signal in webhook endpoint BEFORE calling processSignal
2. Update processSignal to accept signalId instead of creating signal
3. Add ability to reprocess unprocessed signals
4. Better error handling with signal always saved

