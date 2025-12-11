'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useOrders } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const { data, error, isLoading } = useOrders(100, statusFilter)

  const orders = data?.orders || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FILLED':
        return <Badge variant="success">{status}</Badge>
      case 'SUBMITTED':
      case 'PENDING':
        return <Badge variant="warning">{status}</Badge>
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge variant="danger">{status}</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Broker order history and status</p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={statusFilter === undefined ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter(undefined)}
            >
              All
            </Badge>
            <Badge
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending
            </Badge>
            <Badge
              variant={statusFilter === 'FILLED' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('FILLED')}
            >
              Filled
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">Error loading orders</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="uppercase">{order.broker}</TableCell>
                        <TableCell className="font-medium">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={order.side === 'BUY' ? 'success' : 'danger'}>
                            {order.side}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.strike?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{order.orderType}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{order.decision?.action || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No orders found
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
