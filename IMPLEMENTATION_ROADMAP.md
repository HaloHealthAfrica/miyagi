# Implementation Roadmap: Closing Critical Gaps

## Overview

This roadmap outlines the implementation plan to close critical gaps identified in the end-to-end review.

---

## Phase 1: Position Management (Week 1) 🔴 CRITICAL

### 1.1 Position Manager Service

**File:** `src/services/positionManager.ts`

```typescript
export class PositionManager {
  // Monitor open positions
  async monitorPositions(): Promise<void>
  
  // Check stop loss / take profit
  async checkExitConditions(position: Position): Promise<boolean>
  
  // Handle option expiry
  async checkExpiry(position: Position): Promise<boolean>
  
  // Close position
  async closePosition(positionId: string, reason: string): Promise<void>
  
  // Update P&L
  async updatePositionPnL(positionId: string): Promise<void>
}
```

**Tasks:**
- [ ] Create position manager service
- [ ] Implement stop loss logic
- [ ] Implement take profit logic
- [ ] Implement expiry checking
- [ ] Create scheduled job (Vercel Cron or external scheduler)

### 1.2 Price Updater Service

**File:** `src/services/priceUpdater.ts`

```typescript
export class PriceUpdater {
  // Update prices for all open positions
  async updateAllPositions(): Promise<void>
  
  // Update single position price
  async updatePositionPrice(positionId: string): Promise<void>
  
  // Recalculate P&L
  async recalculatePnL(position: Position): Promise<{pnl: number, pnlPercent: number}>
}
```

**Tasks:**
- [ ] Create price updater service
- [ ] Integrate with market data providers
- [ ] Create scheduled job to update prices
- [ ] Update positions table with current prices
- [ ] Recalculate P&L

### 1.3 Order Poller Service

**File:** `src/services/orderPoller.ts`

```typescript
export class OrderPoller {
  // Poll pending orders
  async pollPendingOrders(): Promise<void>
  
  // Update order status
  async updateOrderStatus(orderId: string): Promise<void>
  
  // Create position on fill
  async handleOrderFill(order: Order): Promise<void>
}
```

**Tasks:**
- [ ] Create order poller service
- [ ] Poll orders from Tradier/Alpaca
- [ ] Update order status in database
- [ ] Create positions when orders fill
- [ ] Create scheduled job

---

## Phase 2: Analytics & Performance (Week 2) 🟡 HIGH

### 2.1 Analytics Service

**File:** `src/services/analytics.ts`

```typescript
export class AnalyticsService {
  // Calculate performance metrics
  async calculateMetrics(timeframe: string): Promise<PerformanceMetrics>
  
  // Track signal quality
  async analyzeSignalQuality(): Promise<SignalQualityReport>
  
  // Generate performance report
  async generateReport(): Promise<PerformanceReport>
}
```

**Tasks:**
- [ ] Create analytics service
- [ ] Calculate win rate
- [ ] Calculate Sharpe ratio
- [ ] Calculate max drawdown
- [ ] Track signal success rates
- [ ] Generate performance reports

### 2.2 Performance Metrics API

**File:** `src/app/api/analytics/route.ts`

```typescript
// GET /api/analytics
// Returns performance metrics, charts data, etc.
```

**Tasks:**
- [ ] Create analytics API endpoint
- [ ] Return performance metrics
- [ ] Return chart data
- [ ] Return signal quality metrics

### 2.3 Analytics Dashboard

**File:** `src/app/analytics/page.tsx`

**Tasks:**
- [ ] Create analytics page
- [ ] Display performance metrics
- [ ] Show charts (P&L over time, win rate, etc.)
- [ ] Show signal quality analysis
- [ ] Show trade distribution

---

## Phase 3: Learning Loop (Week 3-4) 🔴 CRITICAL

### 3.1 Learning Service

**File:** `src/services/learning.ts`

```typescript
export class LearningService {
  // Analyze trade outcomes
  async analyzeOutcomes(): Promise<OutcomeAnalysis>
  
  // Identify winning patterns
  async identifyWinningPatterns(): Promise<Pattern[]>
  
  // Optimize decision engine
  async optimizeDecisionEngine(): Promise<OptimizationResult>
  
  // A/B test strategies
  async testStrategyVariant(variant: StrategyVariant): Promise<TestResult>
}
```

**Tasks:**
- [ ] Create learning service
- [ ] Track trade outcomes
- [ ] Identify patterns in successful trades
- [ ] Calculate signal quality scores
- [ ] Optimize decision engine parameters
- [ ] Implement A/B testing framework

### 3.2 Trade Outcome Tracking

**Database Schema Update:**

```prisma
model TradeOutcome {
  id            String   @id @default(uuid())
  positionId   String   @unique
  decisionId   String
  signalId     String
  entryPrice   Float
  exitPrice    Float
  pnl          Float
  pnlPercent   Float
  holdTime     Int      // minutes
  exitReason   String   // "stop_loss" | "take_profit" | "expiry" | "manual"
  createdAt    DateTime @default(now())
  
  position     Position @relation(fields: [positionId], references: [id])
  decision     Decision @relation(fields: [decisionId], references: [id])
  signal       Signal   @relation(fields: [signalId], references: [id])
}
```

**Tasks:**
- [ ] Add TradeOutcome model to schema
- [ ] Create migration
- [ ] Track outcomes when positions close
- [ ] Link outcomes to signals and decisions

### 3.3 Signal Quality Tracking

**Database Schema Update:**

```prisma
model SignalQuality {
  id            String   @id @default(uuid())
  signalId      String   @unique
  tfcScore      Float?
  volScore      Float?
  outcome       String?  // "win" | "loss" | "breakeven"
  pnl           Float?
  successRate   Float    @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  signal        Signal   @relation(fields: [signalId], references: [id])
}
```

**Tasks:**
- [ ] Add SignalQuality model
- [ ] Track signal scores vs outcomes
- [ ] Calculate success rates
- [ ] Update decision engine to use quality scores

---

## Phase 4: Enhanced Features (Month 2) 🟢 MEDIUM

### 4.1 Backtesting System

**File:** `src/services/backtester.ts`

```typescript
export class Backtester {
  // Run backtest on historical data
  async runBacktest(startDate: Date, endDate: Date): Promise<BacktestResult>
  
  // Load historical signals
  async loadHistoricalSignals(): Promise<Signal[]>
  
  // Simulate decision engine
  async simulateDecisions(signals: Signal[]): Promise<Decision[]>
  
  // Calculate hypothetical P&L
  async calculateHypotheticalPnL(decisions: Decision[]): Promise<number>
}
```

**Tasks:**
- [ ] Create backtester service
- [ ] Load historical market data
- [ ] Simulate decision engine
- [ ] Calculate performance metrics
- [ ] Generate backtest reports

### 4.2 Advanced Risk Management

**Tasks:**
- [ ] Dynamic position sizing based on volatility
- [ ] Portfolio-level risk limits
- [ ] Correlation analysis
- [ ] Drawdown protection

### 4.3 Strategy Optimization

**Tasks:**
- [ ] Parameter optimization (grid search)
- [ ] Machine learning integration
- [ ] Strategy variant testing
- [ ] Automated strategy selection

---

## Implementation Order

### Week 1: Critical Infrastructure
1. Position Manager Service
2. Price Updater Service
3. Order Poller Service
4. Scheduled Jobs Setup

### Week 2: Analytics
5. Analytics Service
6. Performance Metrics
7. Analytics Dashboard

### Week 3-4: Learning Loop
8. Learning Service
9. Trade Outcome Tracking
10. Signal Quality Tracking
11. Decision Engine Optimization

### Month 2: Enhancements
12. Backtesting System
13. Advanced Risk Management
14. Strategy Optimization

---

## Technical Considerations

### Scheduled Jobs

**Option 1: Vercel Cron Jobs**
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/update-prices",
    "schedule": "*/5 * * * *" // Every 5 minutes
  }]
}
```

**Option 2: External Scheduler (Recommended)**
- Use external service (Cron-job.org, EasyCron, etc.)
- Call API endpoints on schedule
- More reliable for production

### Database Migrations

All schema changes require:
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate:prod`
3. Update TypeScript types

### Testing

For each service:
1. Unit tests
2. Integration tests
3. End-to-end tests
4. Load testing (for scheduled jobs)

---

## Success Metrics

### Phase 1 Complete When:
- [ ] Positions automatically close on stop loss/take profit
- [ ] P&L updates in real-time
- [ ] Orders polled and status updated
- [ ] No positions expire worthless

### Phase 2 Complete When:
- [ ] Performance metrics calculated
- [ ] Analytics dashboard functional
- [ ] Signal quality tracked

### Phase 3 Complete When:
- [ ] Learning loop operational
- [ ] Decision engine optimized based on outcomes
- [ ] Strategy parameters adjusted automatically

---

## Next Steps

1. **Review this roadmap** with team
2. **Prioritize features** based on business needs
3. **Start with Phase 1** (Position Management)
4. **Iterate and improve** based on feedback

**Estimated Timeline:** 4-6 weeks for critical features, 2-3 months for full implementation.

