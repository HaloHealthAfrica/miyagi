'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAnalytics } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    switch (timeframe) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      case 'all':
        return { start: undefined, end: undefined }
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const dateRange = getDateRange()
  const { data: metricsData, isLoading: metricsLoading } = useAnalytics(
    dateRange.start,
    dateRange.end,
    'metrics'
  )
  const { data: signalQualityData, isLoading: signalLoading } = useAnalytics(
    dateRange.start,
    dateRange.end,
    'signal-quality'
  )

  const metrics = metricsData?.metrics
  const signalQuality = signalQualityData?.signalQuality

  if (metricsLoading || signalLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        </div>
      </MainLayout>
    )
  }

  if (!metrics || !signalQuality) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">No analytics data available</div>
        </div>
      </MainLayout>
    )
  }

  // Prepare chart data
  const dailyPnLData = metrics.dailyPnL || []
  const cumulativePnLData = metrics.cumulativePnL || []

  const exitReasonData = Object.entries(metrics.exitReasonDistribution || {}).map(([reason, count]) => ({
    name: reason.replace('_', ' ').toUpperCase(),
    value: count,
  }))

  const signalTypeData = [
    {
      name: 'Core',
      wins: signalQuality.byType?.core?.wins || 0,
      losses: signalQuality.byType?.core?.losses || 0,
      winRate: signalQuality.byType?.core?.winRate || 0,
      avgPnL: signalQuality.byType?.core?.avgPnL || 0,
    },
    {
      name: 'Runner',
      wins: signalQuality.byType?.runner?.wins || 0,
      losses: signalQuality.byType?.runner?.losses || 0,
      winRate: signalQuality.byType?.runner?.winRate || 0,
      avgPnL: signalQuality.byType?.runner?.avgPnL || 0,
    },
  ]

  const directionData = [
    {
      name: 'Long',
      wins: signalQuality.byDirection?.long?.wins || 0,
      losses: signalQuality.byDirection?.long?.losses || 0,
      winRate: signalQuality.byDirection?.long?.winRate || 0,
      avgPnL: signalQuality.byDirection?.long?.avgPnL || 0,
    },
    {
      name: 'Short',
      wins: signalQuality.byDirection?.short?.wins || 0,
      losses: signalQuality.byDirection?.short?.losses || 0,
      winRate: signalQuality.byDirection?.short?.winRate || 0,
      avgPnL: signalQuality.byDirection?.short?.avgPnL || 0,
    },
  ]

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Performance metrics and signal quality analysis</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeframe === period
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {period === 'all' ? 'All Time' : period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTrades}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.winningTrades} wins / {metrics.losingTrades} losses
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(metrics.winRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.winningTrades} of {metrics.totalTrades} trades
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(metrics.totalPnL)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Avg: {formatCurrency(metrics.averagePnL)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Max Drawdown: {formatCurrency(metrics.maxDrawdown)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cumulativePnLData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} name="Cumulative P&L" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyPnLData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Bar dataKey="pnl" fill="#3b82f6" name="Daily P&L" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Exit Reason Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={exitReasonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {exitReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signal Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={signalTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wins" stackId="a" fill="#10b981" name="Wins" />
                  <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {signalTypeData.map((type) => (
                  <div key={type.name} className="flex items-center justify-between text-sm">
                    <span>{type.name}</span>
                    <div className="flex items-center gap-4">
                      <span>Win Rate: {formatPercent(type.winRate)}</span>
                      <span className={type.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                        Avg P&L: {formatCurrency(type.avgPnL)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signal Quality Details */}
        <Card>
          <CardHeader>
            <CardTitle>Signal Quality Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">By Direction</h3>
                <div className="space-y-3">
                  {directionData.map((dir) => (
                    <div key={dir.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{dir.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {dir.wins + dir.losses} trades
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatPercent(dir.winRate)}</div>
                        <div className={`text-sm ${dir.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(dir.avgPnL)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Top Performing Signals</h3>
                <div className="space-y-2">
                  {signalQuality.topPerformingSignals?.slice(0, 5).map((signal, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium text-sm">{signal.signal}</div>
                        <div className="text-xs text-muted-foreground">{signal.count} trades</div>
                      </div>
                      <div className="text-right">
                        <Badge variant={signal.winRate >= 50 ? 'success' : 'danger'}>
                          {formatPercent(signal.winRate)}
                        </Badge>
                        <div className={`text-xs mt-1 ${signal.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(signal.avgPnL)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.profitFactor.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Hold Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(metrics.averageHoldTime / 60)}h</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(metrics.averageHoldTime)} minutes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Largest Win / Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-green-500 font-medium">{formatCurrency(metrics.largestWin)}</div>
                <div className="text-red-500 font-medium">{formatCurrency(metrics.largestLoss)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

