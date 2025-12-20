'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import useSWR from 'swr'
import { formatDate } from '@/lib/utils'
import { useMemo, useState } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText)
  return res.json()
}

function pretty(v: any) {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export default function WebhookErrorsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/ops/webhook-errors?limit=100', fetcher, { refreshInterval: 15000 })
  const items = (data?.items || []) as any[]

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailUrl = useMemo(() => (selectedId ? `/api/ops/webhook-errors/${encodeURIComponent(selectedId)}` : null), [selectedId])
  const detail = useSWR(detailUrl, fetcher)

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Webhook Error Queue</h1>
            <p className="text-muted-foreground">All persisted TradingView webhooks with status REJECTED or ERROR</p>
          </div>
          <Button variant="outline" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>

        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {error && <div className="text-red-500 text-sm">Error: {String((error as any).message || error)}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Latest</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>created_at</TableHead>
                  <TableHead>event_id</TableHead>
                  <TableHead>trace_id</TableHead>
                  <TableHead>strategy_id</TableHead>
                  <TableHead>event</TableHead>
                  <TableHead>symbol</TableHead>
                  <TableHead>timeframe</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>error_code</TableHead>
                  <TableHead>error_message</TableHead>
                  <TableHead>inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.eventId}>
                    <TableCell className="whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[180px] truncate" title={row.eventId}>
                      {row.eventId}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[160px] truncate" title={row.traceId}>
                      {row.traceId}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate" title={row.strategyId || ''}>
                      {row.strategyId || '—'}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate" title={row.event || ''}>
                      {row.event || '—'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" title={row.symbol || ''}>
                      {row.symbol || '—'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" title={row.timeframe || ''}>
                      {row.timeframe || '—'}
                    </TableCell>
                    <TableCell className="font-semibold">{row.status}</TableCell>
                    <TableCell className="font-mono text-xs">{row.errorCode || '—'}</TableCell>
                    <TableCell className="max-w-[320px] truncate" title={row.errorMessage || ''}>
                      {row.errorMessage || '—'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedId(row.eventId)
                            }}
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle className="font-mono text-sm">{row.eventId}</DialogTitle>
                            <DialogDescription className="font-mono text-xs">
                              trace_id={row.traceId} · status={row.status} · error_code={row.errorCode || '—'}
                            </DialogDescription>
                          </DialogHeader>

                          {detail.isLoading && <div className="text-muted-foreground text-sm">Loading payload…</div>}
                          {detail.error && (
                            <div className="text-red-500 text-sm">Error: {String((detail.error as any).message || detail.error)}</div>
                          )}

                          {detail.data?.item && (
                            <div className="space-y-4">
                              <div className="text-sm">
                                <div>
                                  <span className="text-muted-foreground">error_fields:</span>{' '}
                                  <span className="font-mono">{(detail.data.item.errorFields || []).join(', ') || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">dedupe_key:</span>{' '}
                                  <span className="font-mono text-xs break-all">{detail.data.item.dedupeKey}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-semibold mb-2">raw_payload</div>
                                  <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-[420px]">
                                    {pretty(detail.data.item.rawPayload)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold mb-2">normalized_payload</div>
                                  <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-[420px]">
                                    {detail.data.item.normalizedPayload ? pretty(detail.data.item.normalizedPayload) : '—'}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}

                {items.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-muted-foreground">
                      No rejected/error webhooks found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}


