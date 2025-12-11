'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Position {
  id: string
  symbol: string
  direction: string
  quantity: number
  strike: number | null
  entryPrice: number
  currentPrice: number | null
  pnl: number
  pnlPercent: number
  broker: string
  openedAt: Date
  decision: {
    action: string
    meta: any
  } | null
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions')
      const data = await res.json()
      setPositions(data.positions || [])
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDirectionBadge = (direction: string) => {
    return direction === 'LONG' ? 'badge success' : 'badge danger'
  }

  const getPnLBadge = (pnl: number) => {
    if (pnl > 0) return 'badge success'
    if (pnl < 0) return 'badge danger'
    return 'badge neutral'
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
        <h1>Open Positions</h1>
        {positions.length === 0 ? (
          <p>No open positions</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Direction</th>
                <th>Quantity</th>
                <th>Strike</th>
                <th>Entry Price</th>
                <th>Current Price</th>
                <th>PnL</th>
                <th>PnL %</th>
                <th>Broker</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id}>
                  <td>{pos.symbol}</td>
                  <td>
                    <span className={getDirectionBadge(pos.direction)}>
                      {pos.direction}
                    </span>
                  </td>
                  <td>{pos.quantity}</td>
                  <td>{pos.strike?.toFixed(2) || '-'}</td>
                  <td>${pos.entryPrice.toFixed(2)}</td>
                  <td>
                    {pos.currentPrice ? `$${pos.currentPrice.toFixed(2)}` : '-'}
                  </td>
                  <td>
                    <span className={getPnLBadge(pos.pnl)}>
                      ${pos.pnl.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={getPnLBadge(pos.pnl)}>
                      {pos.pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td>{pos.broker}</td>
                  <td>{new Date(pos.openedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

