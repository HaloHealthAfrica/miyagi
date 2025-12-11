import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // @ts-ignore
    error.info = await res.json().catch(() => ({ message: res.statusText }))
    // @ts-ignore
    error.status = res.status
    throw error
  }
  return res.json()
}

export function useSignals(limit = 100, type?: string) {
  const url = type 
    ? `/api/signals?limit=${limit}&type=${type}`
    : `/api/signals?limit=${limit}`
  return useSWR(url, fetcher, { refreshInterval: 5000 })
}

export function useDecisions(limit = 100, action?: string) {
  const url = action
    ? `/api/decisions?limit=${limit}&action=${action}`
    : `/api/decisions?limit=${limit}`
  return useSWR(url, fetcher, { refreshInterval: 5000 })
}

export function usePositions() {
  return useSWR('/api/positions', fetcher, { refreshInterval: 5000 })
}

export function useOrders(limit = 100, status?: string) {
  const url = status
    ? `/api/orders?limit=${limit}&status=${status}`
    : `/api/orders?limit=${limit}`
  return useSWR(url, fetcher, { refreshInterval: 5000 })
}

export function useScanner() {
  return useSWR('/api/scanner', fetcher, { refreshInterval: 10000 })
}

export function useConfig() {
  return useSWR('/api/config', fetcher, { refreshInterval: 5000 })
}

export async function updateRiskSettings(data: any) {
  const response = await fetch('/api/risk/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

export function useAnalytics(startDate?: string, endDate?: string, type: 'metrics' | 'signal-quality' | 'full' = 'metrics') {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  params.append('type', type)
  const url = `/api/analytics?${params.toString()}`
  return useSWR(url, fetcher, { refreshInterval: 30000 }) // Refresh every 30 seconds
}

export function useLearningAnalysis(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  const url = `/api/learning?${params.toString()}`
  return useSWR(url, fetcher, { refreshInterval: 60000 }) // Refresh every minute
}

export function useOptimizations() {
  return useSWR('/api/learning?action=optimize', fetcher, { refreshInterval: 300000 }) // Refresh every 5 minutes
}

export function useSignalQuality(signalId?: string, signalPattern?: string) {
  const params = new URLSearchParams()
  if (signalId) params.append('signalId', signalId)
  if (signalPattern) params.append('signal', signalPattern)
  params.append('action', 'signal-quality')
  const url = `/api/learning?${params.toString()}`
  return useSWR(url, fetcher, { refreshInterval: 60000 })
}

export function useBacktestRuns() {
  return useSWR('/api/backtest', fetcher, { refreshInterval: 30000 })
}

export function useBacktestRun(runId?: string) {
  if (!runId) return { data: undefined, error: undefined, isLoading: false } as any
  return useSWR(`/api/backtest?runId=${encodeURIComponent(runId)}`, fetcher, { refreshInterval: 30000 })
}

export async function runBacktest(payload: any) {
  const res = await fetch('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.error || err.message || 'Failed to run backtest')
  }
  return res.json()
}

