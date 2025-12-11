'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { usePositions } from '@/lib/api'
import { formatDate, formatCurrency, getPnLColor } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function PositionsPage() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('OPEN')
  const { data, error, isLoading } = usePositions()

  const positions = data?.positions || []
  const filteredPositions = statusFilter === 'ALL' 
    ? positions 
    : positions.filter((p: any) => p.status === statusFilter)

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Positions</h1>
            <p className="text-muted-foreground">Active and closed trading positions</p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('ALL')}
            >
              All
            </Badge>
            <Badge
              variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('OPEN')}
            >
              Open
            </Badge>
            <Badge
              variant={statusFilter === 'CLOSED' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('CLOSED')}
            >
              Closed
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Position List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">Error loading positions</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Mark Price</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>P&L %</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Opened</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.length > 0 ? (
                    filteredPositions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {position.direction === 'LONG' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <Badge variant={position.direction === 'LONG' ? 'success' : 'danger'}>
                              {position.direction}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell>{position.strike?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                        <TableCell>
                          {position.currentPrice ? formatCurrency(position.currentPrice) : '-'}
                        </TableCell>
                        <TableCell className={getPnLColor(position.pnl)}>
                          {formatCurrency(position.pnl)}
                        </TableCell>
                        <TableCell className={getPnLColor(position.pnl)}>
                          {position.pnlPercent?.toFixed(2) || '0.00'}%
                        </TableCell>
                        <TableCell className="uppercase">{position.broker}</TableCell>
                        <TableCell className="text-xs">{formatDate(position.openedAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No positions found
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
