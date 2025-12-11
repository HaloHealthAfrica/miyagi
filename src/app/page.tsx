'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface DashboardStats {
  openPositions: number
  totalPnL: number
  dailyPnL: number
  recentSignals: number
  pendingOrders: number
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    openPositions: 0,
    totalPnL: 0,
    dailyPnL: 0,
    recentSignals: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    const interval = setInterval(fetchDashboardStats, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [positionsRes, signalsRes, ordersRes, configRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/signals?limit=10'),
        fetch('/api/orders?limit=10&status=PENDING'),
        fetch('/api/config'),
      ])

      const positions = await positionsRes.json()
      const signals = await signalsRes.json()
      const orders = await ordersRes.json()
      const config = await configRes.json()

      const totalPnL = positions.positions?.reduce((sum: number, p: any) => sum + (p.pnl || 0), 0) || 0

      setStats({
        openPositions: positions.positions?.length || 0,
        totalPnL,
        dailyPnL: config.riskState?.dailyPnL || 0,
        recentSignals: signals.signals?.length || 0,
        pendingOrders: orders.orders?.filter((o: any) => o.status === 'PENDING' || o.status === 'SUBMITTED').length || 0,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'stat-value positive'
    if (pnl < 0) return 'stat-value negative'
    return 'stat-value'
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="subtitle">Trading platform overview and statistics</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💼</div>
            <div className="stat-content">
              <div className="stat-label">Open Positions</div>
              <div className="stat-value">{stats.openPositions}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Total P&L</div>
              <div className={getPnLColor(stats.totalPnL)}>
                ${stats.totalPnL.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-label">Daily P&L</div>
              <div className={getPnLColor(stats.dailyPnL)}>
                ${stats.dailyPnL.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📡</div>
            <div className="stat-content">
              <div className="stat-label">Recent Signals</div>
              <div className="stat-value">{stats.recentSignals}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-label">Pending Orders</div>
              <div className="stat-value">{stats.pendingOrders}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <Link href="/signals" className="action-card">
            <div className="action-icon">📡</div>
            <div className="action-content">
              <h3>View Signals</h3>
              <p>See all TradingView webhook signals and decisions</p>
            </div>
          </Link>

          <Link href="/positions" className="action-card">
            <div className="action-icon">💼</div>
            <div className="action-content">
              <h3>Manage Positions</h3>
              <p>Monitor open positions and P&L</p>
            </div>
          </Link>

          <Link href="/orders" className="action-card">
            <div className="action-icon">📋</div>
            <div className="action-content">
              <h3>Order History</h3>
              <p>Track all orders and their status</p>
            </div>
          </Link>

          <Link href="/scanner" className="action-card">
            <div className="action-icon">🔍</div>
            <div className="action-content">
              <h3>Scanner State</h3>
              <p>View macro regime bias for major indices</p>
            </div>
          </Link>

          <Link href="/config" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-content">
              <h3>Configuration</h3>
              <p>View risk limits and system settings</p>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
