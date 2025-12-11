'use client'

import { useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { runBacktest, useBacktestRun, useBacktestRuns } from '@/lib/api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function BacktestPage() {
  const { data: runsData } = useBacktestRuns()
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined)
  const { data: runData } = useBacktestRun(selectedRunId)

  const [symbol, setSymbol] = useState('SPX')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [stopLossPercent, setStopLossPercent] = useState('5')
  const [takeProfitPercent, setTakeProfitPercent] = useState('10')
  const [maxHoldBars, setMaxHoldBars] = useState('78')
  const [positionSize, setPositionSize] = useState('1')
  const [contractMultiplier, setContractMultiplier] = useState('100')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRun = runData?.run
  const equityCurve = (activeRun?.results as any)?.equityCurve || []

  const runs = runsData?.runs || []

  const onRun = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const res = await runBacktest({
        symbol,
        startDate,
        endDate,
        stopLossPercent: Number(stopLossPercent),
        takeProfitPercent: Number(takeProfitPercent),
        maxHoldBars: Number(maxHoldBars),
        positionSize: Number(positionSize),
        contractMultiplier: Number(contractMultiplier),
      })
      const id = res?.run?.id
      if (id) setSelectedRunId(id)
    } catch (e: any) {
      setError(e.message || 'Failed to run backtest')
    } finally {
      setIsRunning(false)
    }
  }

  const summary = useMemo(() => {
    if (!activeRun) return null
    return {
      totalTrades: activeRun.totalTrades,
      winRate: activeRun.winRate,
      totalPnL: activeRun.totalPnL,
      avgPnL: activeRun.averagePnL,
      sharpe: activeRun.sharpeRatio,
      maxDd: activeRun.maxDrawdown,
    }
  }, [activeRun])

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Backtest</h1>
            <p className="text-muted-foreground">Replay stored signals into simulated trades (SL/TP on underlying OHLC)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Run Backtest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Symbol</div>
                  <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Max Hold Bars</div>
                  <Input value={maxHoldBars} onChange={(e) => setMaxHoldBars(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">End Date</div>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Stop Loss %</div>
                  <Input value={stopLossPercent} onChange={(e) => setStopLossPercent(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Take Profit %</div>
                  <Input value={takeProfitPercent} onChange={(e) => setTakeProfitPercent(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Position Size</div>
                  <Input value={positionSize} onChange={(e) => setPositionSize(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Contract Multiplier</div>
                  <Input value={contractMultiplier} onChange={(e) => setContractMultiplier(e.target.value)} />
                </div>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <Button onClick={onRun} disabled={isRunning} className="w-full">
                {isRunning ? 'Running…' : 'Run Backtest'}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {runs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No runs yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {runs.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRunId(r.id)}
                        className={`text-left p-3 rounded border ${
                          selectedRunId === r.id ? 'border-primary' : 'border-border'
                        }`}
                      >
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.symbol} • {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs mt-1">
                          Trades: {r.totalTrades} • P&L: {formatCurrency(r.totalPnL)} • Win: {formatPercent(r.winRate)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeRun && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary?.totalTrades}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{formatPercent(summary?.winRate || 0)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total P&L</CardTitle>
                </CardHeader>
                <CardContent className={`text-2xl font-bold ${summary!.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(summary!.totalPnL)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{formatCurrency(summary!.maxDd)}</CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(d) => new Date(d).toLocaleString()}
                      formatter={(v: any) => formatCurrency(Number(v))}
                    />
                    <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trades (latest 2000)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>Dir</TableHead>
                      <TableHead>Entry Px</TableHead>
                      <TableHead>Exit Px</TableHead>
                      <TableHead>PnL</TableHead>
                      <TableHead>PnL %</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(activeRun.trades || []).slice(-200).reverse().map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.entryTime).toLocaleString()}</TableCell>
                        <TableCell>{new Date(t.exitTime).toLocaleString()}</TableCell>
                        <TableCell>{t.direction}</TableCell>
                        <TableCell>{t.entryPrice.toFixed(2)}</TableCell>
                        <TableCell>{t.exitPrice.toFixed(2)}</TableCell>
                        <TableCell className={t.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(t.pnl)}
                        </TableCell>
                        <TableCell className={t.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercent(t.pnlPercent)}
                        </TableCell>
                        <TableCell>{t.exitReason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}


