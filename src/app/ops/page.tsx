'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import useSWR from 'swr'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText)
  return res.json()
}

export default function OpsPage() {
  const { data, error, isLoading } = useSWR('/api/ops', fetcher, { refreshInterval: 15000 })

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ops</h1>
          <p className="text-muted-foreground">Operational status, cron endpoints, and cached metric snapshots</p>
        </div>

        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {error && <div className="text-red-500 text-sm">Error: {String(error.message || error)}</div>}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Execution</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {data.env.executionEnabled ? 'ENABLED' : 'SIMULATION'}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Secrets</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>CRON_SECRET: {data.env.hasCronSecret ? 'set' : 'missing'}</div>
                  <div>TV_WEBHOOK_SECRET: {data.env.hasWebhookSecret ? 'set' : 'missing'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Counts</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>Signals: {data.counts.signals}</div>
                  <div>Decisions: {data.counts.decisions}</div>
                  <div>Orders: {data.counts.orders}</div>
                  <div>Positions: {data.counts.positions}</div>
                  <div>Outcomes: {data.counts.outcomes}</div>
                  <div>Backtests: {data.counts.backtests}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cron endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  Call these with `Authorization: Bearer CRON_SECRET` from your cron provider.
                </div>
                <ul className="list-disc pl-5">
                  {data.cronEndpoints.map((p: string) => (
                    <li key={p}>
                      <code>{p}</code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PerformanceMetrics (latest)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Win%</TableHead>
                      <TableHead>Total PnL</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.performanceMetrics || []).map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.period}</TableCell>
                        <TableCell>{formatDate(m.startDate)}</TableCell>
                        <TableCell>{formatDate(m.endDate)}</TableCell>
                        <TableCell>{m.totalTrades}</TableCell>
                        <TableCell>{formatPercent(m.winRate)}</TableCell>
                        <TableCell className={m.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(m.totalPnL)}
                        </TableCell>
                        <TableCell>{formatDate(m.updatedAt)}</TableCell>
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


