'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BiasBadge } from '@/components/cards/BiasBadge'
import { useSignals } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function SignalsPage() {
  const [selectedType, setSelectedType] = useState<string | undefined>()
  const { data, error, isLoading } = useSignals(100, selectedType)
  const [selectedSignal, setSelectedSignal] = useState<any>(null)

  const signals = data?.signals || []

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'core':
        return <Badge variant="default">CORE</Badge>
      case 'runner':
        return <Badge variant="secondary">RUNNER</Badge>
      case 'scanner':
        return <Badge variant="outline">SCANNER</Badge>
      default:
        return <Badge variant="neutral">{type}</Badge>
    }
  }

  const getDirectionBadge = (direction: string | null) => {
    if (!direction) return <Badge variant="neutral">-</Badge>
    return direction === 'long' ? (
      <Badge variant="success">LONG</Badge>
    ) : (
      <Badge variant="danger">SHORT</Badge>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Signals</h1>
            <p className="text-muted-foreground">TradingView webhook signals</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === undefined ? 'default' : 'outline'}
              onClick={() => setSelectedType(undefined)}
            >
              All
            </Button>
            <Button
              variant={selectedType === 'core' ? 'default' : 'outline'}
              onClick={() => setSelectedType('core')}
            >
              Core
            </Button>
            <Button
              variant={selectedType === 'runner' ? 'default' : 'outline'}
              onClick={() => setSelectedType('runner')}
            >
              Runner
            </Button>
            <Button
              variant={selectedType === 'scanner' ? 'default' : 'outline'}
              onClick={() => setSelectedType('scanner')}
            >
              Scanner
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signal History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-center py-8 space-y-2">
                <div className="text-destructive font-semibold">Error loading signals</div>
                <div className="text-sm text-muted-foreground">
                  {error.message || 'Unknown error'}
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  Check browser console and server logs for details
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Strike Hint</TableHead>
                    <TableHead>Risk Mult</TableHead>
                    <TableHead>Miyagi</TableHead>
                    <TableHead>Daily</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.length > 0 ? (
                    signals.map((signal: any) => (
                      <TableRow key={signal.id}>
                        <TableCell className="text-xs">{formatDate(signal.timestamp)}</TableCell>
                        <TableCell>{getTypeBadge(signal.type)}</TableCell>
                        <TableCell className="font-mono text-xs">{signal.signal}</TableCell>
                        <TableCell>{getDirectionBadge(signal.direction)}</TableCell>
                        <TableCell>{signal.strikeHint?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{signal.riskMult?.toFixed(2) || '-'}</TableCell>
                        <TableCell><BiasBadge bias={signal.miyagi || 'NEUTRAL'} /></TableCell>
                        <TableCell><BiasBadge bias={signal.daily || 'NEUTRAL'} /></TableCell>
                        <TableCell>{signal.tf || '-'}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSignal(signal)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Signal Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <h3 className="font-semibold mb-2">Raw Payload</h3>
                                  <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                                    {JSON.stringify(signal.rawPayload || signal, null, 2)}
                                  </pre>
                                </div>
                                {signal.decisions && signal.decisions.length > 0 && (
                                  <div>
                                    <h3 className="font-semibold mb-2">Decisions</h3>
                                    {signal.decisions.map((decision: any) => (
                                      <div key={decision.id} className="bg-muted p-3 rounded-md mb-2">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge>{decision.action}</Badge>
                                          <span className="text-sm">Qty: {decision.quantity}</span>
                                        </div>
                                        {decision.reasoning && (
                                          <p className="text-sm text-muted-foreground">{decision.reasoning}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No signals found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
