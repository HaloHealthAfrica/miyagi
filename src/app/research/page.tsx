'use client'

import { useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { runResearchExperiment, useResearchExperiment, useResearchExperiments } from '@/lib/api'

function parseNumberList(s: string): number[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n))
}

export default function ResearchPage() {
  const { data: listData } = useResearchExperiments()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const { data: expData } = useResearchExperiment(selectedId)

  const [kind, setKind] = useState<'sweep' | 'walkforward' | 'montecarlo'>('sweep')
  const [name, setName] = useState('Sweep Experiment')
  const [symbols, setSymbols] = useState('SPX')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [slList, setSlList] = useState('3,5,7')
  const [tpList, setTpList] = useState('8,10,15')
  const [slippageBps, setSlippageBps] = useState('0')
  const [feePerTrade, setFeePerTrade] = useState('0')
  const [trainDays, setTrainDays] = useState('30')
  const [testDays, setTestDays] = useState('7')
  const [stepDays, setStepDays] = useState('7')
  const [mcRunId, setMcRunId] = useState('')
  const [mcSims, setMcSims] = useState('500')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const experiments = listData?.experiments || []
  const experiment = expData?.experiment

  const onRun = async () => {
    setBusy(true)
    setError(null)
    try {
      const symList = symbols.split(',').map((s) => s.trim()).filter(Boolean)
      const stopLossPercents = parseNumberList(slList)
      const takeProfitPercents = parseNumberList(tpList)

      const base = {
        name,
        symbols: symList,
        startDate,
        endDate,
        stopLossPercents,
        takeProfitPercents,
        slippageBps: Number(slippageBps),
        feePerTrade: Number(feePerTrade),
      }

      const config =
        kind === 'sweep'
          ? { kind: 'sweep', ...base }
          : kind === 'walkforward'
            ? {
                kind: 'walkforward',
                ...base,
                trainDays: Number(trainDays),
                testDays: Number(testDays),
                stepDays: Number(stepDays),
              }
            : {
                kind: 'montecarlo',
                name,
                backtestRunId: mcRunId,
                simulations: Number(mcSims),
              }

      const res = await runResearchExperiment(config)
      if (res?.experimentId) setSelectedId(res.experimentId)
    } catch (e: any) {
      setError(e.message || 'Failed to start experiment')
    } finally {
      setBusy(false)
    }
  }

  const summary = useMemo(() => {
    if (!experiment) return null
    return {
      id: experiment.id,
      kind: experiment.kind,
      status: experiment.status,
      error: experiment.error,
      runs: (experiment.runs || []).length,
    }
  }, [experiment])

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Research</h1>
          <p className="text-muted-foreground">Parameter sweeps, walk-forward validation, and Monte Carlo analysis (runs via job queue)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New experiment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {(['sweep', 'walkforward', 'montecarlo'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`px-3 py-1 rounded text-sm ${
                      kind === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {kind !== 'montecarlo' ? (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Symbols (comma)</div>
                    <Input value={symbols} onChange={(e) => setSymbols(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Start</div>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">End</div>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">StopLoss % list</div>
                      <Input value={slList} onChange={(e) => setSlList(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">TakeProfit % list</div>
                      <Input value={tpList} onChange={(e) => setTpList(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Slippage (bps)</div>
                      <Input value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Fee per trade ($)</div>
                      <Input value={feePerTrade} onChange={(e) => setFeePerTrade(e.target.value)} />
                    </div>
                  </div>

                  {kind === 'walkforward' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Train days</div>
                        <Input value={trainDays} onChange={(e) => setTrainDays(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Test days</div>
                        <Input value={testDays} onChange={(e) => setTestDays(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Step days</div>
                        <Input value={stepDays} onChange={(e) => setStepDays(e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">BacktestRun ID</div>
                    <Input value={mcRunId} onChange={(e) => setMcRunId(e.target.value)} placeholder="Paste a BacktestRun id" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Simulations</div>
                    <Input value={mcSims} onChange={(e) => setMcSims(e.target.value)} />
                  </div>
                </>
              )}

              {error && <div className="text-sm text-red-500">{error}</div>}
              <Button className="w-full" onClick={onRun} disabled={busy}>
                {busy ? 'Queued…' : 'Queue experiment'}
              </Button>
              <div className="text-xs text-muted-foreground">
                Note: experiments run via the job queue. Ensure `/api/cron/process-jobs` is scheduled.
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Experiments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {experiments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No experiments yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {experiments.map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`text-left p-3 rounded border ${selectedId === e.id ? 'border-primary' : 'border-border'}`}
                    >
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.kind} • {e.status} • {formatDate(e.createdAt)}
                      </div>
                      {e.error && <div className="text-xs text-red-500 mt-1 truncate">{e.error}</div>}
                    </button>
                  ))}
                </div>
              )}

              {experiment && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected experiment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <div><span className="text-muted-foreground">ID:</span> {summary?.id}</div>
                      <div><span className="text-muted-foreground">Kind:</span> {summary?.kind}</div>
                      <div><span className="text-muted-foreground">Status:</span> {summary?.status}</div>
                      <div><span className="text-muted-foreground">Runs:</span> {summary?.runs}</div>
                      {summary?.error && <div className="text-red-500">Error: {summary.error}</div>}
                    </div>

                    <div className="text-sm">
                      <div className="font-medium mb-1">Result</div>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[280px]">
                        {JSON.stringify(experiment.result, null, 2)}
                      </pre>
                    </div>

                    {experiment.runs?.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-2">Runs (latest 50)</div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Trades</TableHead>
                              <TableHead>Win%</TableHead>
                              <TableHead>Total PnL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {experiment.runs.slice(0, 50).map((r: any) => (
                              <TableRow key={r.id}>
                                <TableCell className="max-w-[220px] truncate">{r.name}</TableCell>
                                <TableCell>{r.symbol}</TableCell>
                                <TableCell>{r.totalTrades}</TableCell>
                                <TableCell>{r.winRate.toFixed(2)}%</TableCell>
                                <TableCell className={r.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {formatCurrency(r.totalPnL)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}


