'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLearningAnalysis, useOptimizations, useSignalQuality } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, Lightbulb } from 'lucide-react'

export default function LearningPage() {
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
  const { data: analysisData, isLoading: analysisLoading } = useLearningAnalysis(
    dateRange.start,
    dateRange.end
  )
  const { data: optimizationsData, isLoading: optimizationsLoading } = useOptimizations()

  const analysis = analysisData
  const optimizations = optimizationsData?.optimizations || []

  if (analysisLoading || optimizationsLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">Loading learning analysis...</div>
        </div>
      </MainLayout>
    )
  }

  if (!analysis) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">No learning data available</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Learning & Optimization</h1>
            <p className="text-muted-foreground">Pattern analysis and strategy optimization</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.totalOutcomes}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysis.winningOutcomes} wins / {analysis.losingOutcomes} losses
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(analysis.winRate)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patterns Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.patterns.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Winning patterns identified</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Optimizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{optimizations.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Recommended improvements</div>
            </CardContent>
          </Card>
        </div>

        {/* Winning Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Winning Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.patterns.length > 0 ? (
              <div className="space-y-4">
                {analysis.patterns.slice(0, 10).map((pattern, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{pattern.signalType}</Badge>
                          <Badge variant="outline">{pattern.direction}</Badge>
                          <Badge variant="outline">{pattern.miyagiBias}</Badge>
                          <Badge variant="outline">{pattern.dailyBias}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            TFC Score: {pattern.tfcScoreRange.min.toFixed(2)} -{' '}
                            {pattern.tfcScoreRange.max.toFixed(2)}
                          </div>
                          <div>
                            Vol Score: {pattern.volScoreRange.min.toFixed(2)} -{' '}
                            {pattern.volScoreRange.max.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          {formatPercent(pattern.winRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(pattern.avgPnL)} avg
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {pattern.sampleSize} trades
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No patterns identified yet. Need more trade data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.recommendations.length > 0 ? (
              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No recommendations at this time</div>
            )}
          </CardContent>
        </Card>

        {/* Optimizations */}
        {optimizations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Parameter Optimizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt, idx) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{opt.parameter}</div>
                      <Badge variant={opt.expectedImprovement > 0 ? 'default' : 'secondary'}>
                        {opt.confidence.toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-medium">{opt.currentValue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Recommended</div>
                        <div className="font-medium text-primary">{opt.recommendedValue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Expected Impact</div>
                        <div
                          className={`font-medium ${
                            opt.expectedImprovement > 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {opt.expectedImprovement > 0 ? '+' : ''}
                          {opt.expectedImprovement.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

