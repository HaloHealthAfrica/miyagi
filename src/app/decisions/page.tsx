'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDecisions } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function DecisionsPage() {
  const { data, error, isLoading } = useDecisions(100)
  const [selectedDecision, setSelectedDecision] = useState<any>(null)

  const decisions = data?.decisions || []

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('long') || actionLower === 'open_position') {
      return <Badge variant="success">{action}</Badge>
    }
    if (actionLower.includes('short')) {
      return <Badge variant="danger">{action}</Badge>
    }
    if (actionLower.includes('ignore')) {
      return <Badge variant="neutral">{action}</Badge>
    }
    return <Badge variant="warning">{action}</Badge>
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Decisions</h1>
          <p className="text-muted-foreground">Decision engine outputs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Decision History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">Error loading decisions</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Reasoning</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisions.length > 0 ? (
                    decisions.map((decision: any) => (
                      <TableRow key={decision.id}>
                        <TableCell className="text-xs">{formatDate(decision.createdAt)}</TableCell>
                        <TableCell>{getActionBadge(decision.action)}</TableCell>
                        <TableCell className="font-medium">{decision.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={decision.direction === 'LONG' ? 'success' : 'danger'}>
                            {decision.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{decision.quantity}</TableCell>
                        <TableCell>{decision.strike?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="uppercase">{decision.broker}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">
                          {decision.reasoning || '-'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDecision(decision)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Decision Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <h3 className="font-semibold mb-2">Decision</h3>
                                  <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                                    {JSON.stringify(decision, null, 2)}
                                  </pre>
                                </div>
                                {decision.signal && (
                                  <div>
                                    <h3 className="font-semibold mb-2">Source Signal</h3>
                                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                                      {JSON.stringify(decision.signal.rawPayload || decision.signal, null, 2)}
                                    </pre>
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
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No decisions found
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

