import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

