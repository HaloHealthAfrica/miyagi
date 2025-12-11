'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import useSWR from 'swr'
import { formatDate } from '@/lib/utils'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText)
  return res.json()
}

export default function JobsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/jobs?limit=100', fetcher, { refreshInterval: 5000 })

  const retry = async (jobId: string) => {
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry', jobId }),
    })
    mutate()
  }

  const cancel = async (jobId: string) => {
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', jobId }),
    })
    mutate()
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">DB-backed queue for durable processing and retries</p>
        </div>

        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {error && <div className="text-red-500 text-sm">Error: {String(error.message || error)}</div>}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Status counts</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                {(data.counts || []).map((c: any) => (
                  <div key={c.status} className="px-3 py-1 rounded bg-muted">
                    <span className="font-medium">{c.status}</span>: {c._count?._all || 0}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Next run</TableHead>
                      <TableHead>Locked by</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.jobs || []).map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell>{j.type}</TableCell>
                        <TableCell>{j.status}</TableCell>
                        <TableCell>
                          {j.attempts}/{j.maxAttempts}
                        </TableCell>
                        <TableCell>{formatDate(j.nextRunAt)}</TableCell>
                        <TableCell>{j.lockedBy || '-'}</TableCell>
                        <TableCell>{formatDate(j.updatedAt)}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{j.error || '-'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => retry(j.id)}>
                            Retry
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => cancel(j.id)}>
                            Cancel
                          </Button>
                        </TableCell>
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


