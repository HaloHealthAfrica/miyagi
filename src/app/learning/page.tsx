'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useLearningAnalysis, useOptimizations } from '@/lib/api'
import { TrendingUp, TrendingDown, Lightbulb, Settings } from 'lucide-react'

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
  const { data: analysisData, isLoading: analysisLoading } = useLearningAnalysis(dateRange.start, dateRange.end)
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

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Learning Loop</h1>
            <p className="text-muted-foreground">Pattern identification and strategy optimization</p>
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

        {/* Recommendations */}
        {analysis?.recommendations && analysis.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                    {rec}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimizations */}
        {optimizations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parameter Optimizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{opt.parameter}</div>
                      <Badge variant={opt.expectedImprovement > 0 ? 'default' : 'secondary'}>
                        {opt.confidence.toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-medium">{opt.currentValue}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Recommended</div>
                        <div className="font-medium text-primary">{opt.recommendedValue}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Expected Improvement</div>
                        <div className={`font-medium ${opt.expectedImprovement > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {opt.expectedImprovement > 0 ? '+' : ''}{opt.expectedImprovement.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{opt.reasoning}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Winning Patterns */}
        {analysis?.winningPatterns && analysis.winningPatterns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Winning Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.winningPatterns.slice(0, 10).map((pattern: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {pattern.signalType} {pattern.direction}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.conditions.miyagi} / {pattern.conditions.daily}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          {formatPercent(pattern.winRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.sampleSize} trades
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg P&L: </span>
                        <span className={pattern.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(pattern.avgPnL)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence: </span>
                        <span>{pattern.confidence.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Losing Patterns */}
        {analysis?.losingPatterns && analysis.losingPatterns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Losing Patterns (Avoid)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.losingPatterns.slice(0, 10).map((pattern: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {pattern.signalType} {pattern.direction}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.conditions.miyagi} / {pattern.conditions.daily}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-500">
                          {formatPercent(pattern.winRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.sampleSize} trades
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg P&L: </span>
                        <span className={pattern.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(pattern.avgPnL)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence: </span>
                        <span>{pattern.confidence.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimized Parameters */}
        {analysis?.optimizedParameters && Object.keys(analysis.optimizedParameters).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Optimized Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analysis.optimizedParameters).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">{key}</div>
                    <div className="text-lg font-bold">{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(!analysis || analysis.totalOutcomes === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No trade outcomes available for analysis. The learning loop will activate once positions start closing.
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
