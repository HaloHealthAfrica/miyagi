'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface ScannerState {
  symbol: string
  bias: string
  timestamp: Date | null
}

export default function ScannerPage() {
  const [scanner, setScanner] = useState<ScannerState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScanner()
    const interval = setInterval(fetchScanner, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchScanner = async () => {
    try {
      const res = await fetch('/api/scanner')
      const data = await res.json()
      setScanner(data.scanner || [])
    } catch (error) {
      console.error('Error fetching scanner state:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBiasBadge = (bias: string) => {
    switch (bias) {
      case 'BULL':
        return 'badge success'
      case 'BEAR':
        return 'badge danger'
      case 'NEUTRAL':
        return 'badge neutral'
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
          <h1>Miyagi Scanner State</h1>
          <p className="subtitle">Current macro regime bias for major indices</p>
        </div>

        <div className="card">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Bias</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {scanner.map((item) => (
              <tr key={item.symbol}>
                <td>
                  <strong>{item.symbol}</strong>
                </td>
                <td>
                  <span className={getBiasBadge(item.bias)}>{item.bias}</span>
                </td>
                <td>
                  {item.timestamp
                    ? new Date(item.timestamp).toLocaleString()
                    : 'Never'}
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

