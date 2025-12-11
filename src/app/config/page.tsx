'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Config {
  riskLimit: {
    maxPositions: number
    maxDailyLoss: number
    maxRiskPerTrade: number
    maxRunnersPerCore: number
  } | null
  riskState: {
    dailyPnL: number
    dailyTrades: number
    openPositions: number
    totalRisk: number
  } | null
  executionEnabled: boolean
  primaryBroker: string
  basePositionSize: number
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
    const interval = setInterval(fetchConfig, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!config) {
    return <div className="container">No configuration found</div>
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Configuration & Risk Settings</h1>
          <p className="subtitle">View and manage system configuration and risk limits</p>
        </div>

        <div className="card">

        <div style={{ marginBottom: '30px' }}>
          <h2>Execution Settings</h2>
          <table>
            <tbody>
              <tr>
                <td>
                  <strong>Execution Enabled</strong>
                </td>
                <td>
                  <span className={config.executionEnabled ? 'badge success' : 'badge danger'}>
                    {config.executionEnabled ? 'YES' : 'NO (SIMULATION MODE)'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Primary Broker</strong>
                </td>
                <td>{config.primaryBroker}</td>
              </tr>
              <tr>
                <td>
                  <strong>Base Position Size</strong>
                </td>
                <td>{config.basePositionSize} contracts</td>
              </tr>
            </tbody>
          </table>
        </div>

        {config.riskLimit && (
          <div style={{ marginBottom: '30px' }}>
            <h2>Risk Limits</h2>
            <table>
              <tbody>
                <tr>
                  <td>
                    <strong>Max Positions</strong>
                  </td>
                  <td>{config.riskLimit.maxPositions}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Max Daily Loss</strong>
                  </td>
                  <td>${config.riskLimit.maxDailyLoss.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Max Risk Per Trade</strong>
                  </td>
                  <td>${config.riskLimit.maxRiskPerTrade.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Max Runners Per Core</strong>
                  </td>
                  <td>{config.riskLimit.maxRunnersPerCore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {config.riskState && (
          <div>
            <h2>Current Risk State</h2>
            <table>
              <tbody>
                <tr>
                  <td>
                    <strong>Daily P&L</strong>
                  </td>
                  <td>
                    <span
                      className={
                        config.riskState.dailyPnL >= 0 ? 'badge success' : 'badge danger'
                      }
                    >
                      ${config.riskState.dailyPnL.toFixed(2)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Daily Trades</strong>
                  </td>
                  <td>{config.riskState.dailyTrades}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Open Positions</strong>
                  </td>
                  <td>{config.riskState.openPositions}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total Risk</strong>
                  </td>
                  <td>${config.riskState.totalRisk.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </>
  )
}

