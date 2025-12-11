'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfig } from '@/lib/api'
import { formatCurrency, getPnLColor } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RiskPage() {
  const { data, error, isLoading } = useConfig()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    maxPositions: 5,
    maxDailyLoss: 1000,
    maxRiskPerTrade: 500,
    maxRunnersPerCore: 2,
  })

  const riskLimit = data?.riskLimit
  const riskState = data?.riskState
  const executionEnabled = data?.executionEnabled || false

  if (riskLimit && !isEditing) {
    setFormData({
      maxPositions: riskLimit.maxPositions || 5,
      maxDailyLoss: riskLimit.maxDailyLoss || 1000,
      maxRiskPerTrade: riskLimit.maxRiskPerTrade || 500,
      maxRunnersPerCore: riskLimit.maxRunnersPerCore || 2,
    })
  }

  const handleSave = async () => {
    try {
      await fetch('/api/risk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      setIsEditing(false)
      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update risk settings:', error)
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Risk Management</h1>
            <p className="text-muted-foreground">Configure risk limits and monitor risk state</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Risk Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="maxPositions">Max Positions</Label>
                    <Input
                      id="maxPositions"
                      type="number"
                      value={formData.maxPositions}
                      onChange={(e) => setFormData({ ...formData, maxPositions: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDailyLoss">Max Daily Loss</Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={formData.maxDailyLoss}
                      onChange={(e) => setFormData({ ...formData, maxDailyLoss: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxRiskPerTrade">Max Risk Per Trade</Label>
                    <Input
                      id="maxRiskPerTrade"
                      type="number"
                      value={formData.maxRiskPerTrade}
                      onChange={(e) => setFormData({ ...formData, maxRiskPerTrade: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxRunnersPerCore">Max Runners Per Core</Label>
                    <Input
                      id="maxRunnersPerCore"
                      type="number"
                      value={formData.maxRunnersPerCore}
                      onChange={(e) => setFormData({ ...formData, maxRunnersPerCore: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>Save</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Positions</span>
                    <span className="font-semibold">{riskLimit?.maxPositions || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Daily Loss</span>
                    <span className="font-semibold">{formatCurrency(riskLimit?.maxDailyLoss || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Risk Per Trade</span>
                    <span className="font-semibold">{formatCurrency(riskLimit?.maxRiskPerTrade || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Runners Per Core</span>
                    <span className="font-semibold">{riskLimit?.maxRunnersPerCore || '-'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Risk State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily P&L</span>
                <span className={`font-semibold ${getPnLColor(riskState?.dailyPnL || 0)}`}>
                  {formatCurrency(riskState?.dailyPnL || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Trades</span>
                <span className="font-semibold">{riskState?.dailyTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Positions</span>
                <span className="font-semibold">{riskState?.openPositions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Risk</span>
                <span className="font-semibold">{formatCurrency(riskState?.totalRisk || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Execution Enabled</span>
                <Badge variant={executionEnabled ? 'success' : 'danger'}>
                  {executionEnabled ? 'YES' : 'NO'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

