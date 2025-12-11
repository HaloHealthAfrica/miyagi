'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Signal {
  id: string
  type: string
  direction: string | null
  signal: string
  timestamp: Date
  processed: boolean
  strikeHint: number | null
  riskMult: number | null
  miyagi: string | null
  daily: string | null
  decisions: Array<{
    id: string
    action: string
    quantity: number
    reasoning: string | null
  }>
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSignals()
  }, [])

  const fetchSignals = async () => {
    try {
      const res = await fetch('/api/signals?limit=100')
      const data = await res.json()
      setSignals(data.signals || [])
    } catch (error) {
      console.error('Error fetching signals:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'core':
        return 'badge info'
      case 'runner':
        return 'badge warning'
      case 'scanner':
        return 'badge neutral'
      default:
        return 'badge'
    }
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'OPEN_POSITION':
        return 'badge success'
      case 'ADD_POSITION':
        return 'badge info'
      case 'IGNORE':
        return 'badge danger'
      default:
        return 'badge'
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>TradingView Signals</h1>
          <p className="subtitle">All webhook signals and their resulting decisions</p>
        </div>

        <div className="card">
        <h1>TradingView Signals</h1>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Signal</th>
              <th>Direction</th>
              <th>Strike Hint</th>
              <th>Risk Mult</th>
              <th>Miyagi</th>
              <th>Daily</th>
              <th>Decision</th>
              <th>Quantity</th>
              <th>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr key={signal.id}>
                <td>{new Date(signal.timestamp).toLocaleString()}</td>
                <td>
                  <span className={getBadgeClass(signal.type)}>{signal.type}</span>
                </td>
                <td>{signal.signal}</td>
                <td>{signal.direction || '-'}</td>
                <td>{signal.strikeHint?.toFixed(2) || '-'}</td>
                <td>{signal.riskMult?.toFixed(2) || '-'}</td>
                <td>{signal.miyagi || '-'}</td>
                <td>{signal.daily || '-'}</td>
                <td>
                  {signal.decisions.length > 0 ? (
                    <span className={getActionBadgeClass(signal.decisions[0].action)}>
                      {signal.decisions[0].action}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {signal.decisions.length > 0 ? signal.decisions[0].quantity : '-'}
                </td>
                <td style={{ maxWidth: '300px', fontSize: '12px' }}>
                  {signal.decisions.length > 0
                    ? signal.decisions[0].reasoning || '-'
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  )
}

