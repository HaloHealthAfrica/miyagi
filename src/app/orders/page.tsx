'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  broker: string
  symbol: string
  side: string
  quantity: number
  strike: number | null
  orderType: string
  status: string
  createdAt: Date
  updatedAt: Date
  decision: {
    action: string
    reasoning: string | null
  } | null
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?limit=100')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FILLED':
        return 'badge success'
      case 'SUBMITTED':
      case 'PENDING':
        return 'badge warning'
      case 'REJECTED':
      case 'CANCELLED':
        return 'badge danger'
      default:
        return 'badge neutral'
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">Home</Link>
        <Link href="/signals">Signals</Link>
        <Link href="/positions">Positions</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/scanner">Scanner</Link>
        <Link href="/config">Config</Link>
      </nav>

      <div className="card">
        <h1>Recent Orders</h1>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Broker</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Quantity</th>
              <th>Strike</th>
              <th>Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{order.broker}</td>
                <td>{order.symbol}</td>
                <td>{order.side}</td>
                <td>{order.quantity}</td>
                <td>{order.strike?.toFixed(2) || '-'}</td>
                <td>{order.orderType}</td>
                <td>
                  <span className={getStatusBadge(order.status)}>{order.status}</span>
                </td>
                <td>{order.decision?.action || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

