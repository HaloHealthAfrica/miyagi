'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const endpoints = [
    { name: 'Health', url: '/api/health' },
    { name: 'Signals', url: '/api/signals?limit=5' },
    { name: 'Decisions', url: '/api/decisions?limit=5' },
    { name: 'Positions', url: '/api/positions' },
    { name: 'Orders', url: '/api/orders?limit=5' },
    { name: 'Scanner', url: '/api/scanner' },
    { name: 'Config', url: '/api/config' },
  ]

  const testEndpoint = async (name: string, url: string) => {
    setLoading((prev) => ({ ...prev, [name]: true }))
    try {
      const response = await fetch(url)
      const data = await response.json()
      setResults((prev) => ({
        ...prev,
        [name]: {
          status: response.status,
          ok: response.ok,
          data,
          error: null,
        },
      }))
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [name]: {
          status: 'error',
          ok: false,
          data: null,
          error: error.message,
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [name]: false }))
    }
  }

  const testAll = async () => {
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint.name, endpoint.url)
      await new Promise((resolve) => setTimeout(resolve, 200)) // Small delay between requests
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">API Debug</h1>
          <p className="text-muted-foreground">Test all API endpoints</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={testAll}>Test All Endpoints</Button>
        </div>

        <div className="grid gap-4">
          {endpoints.map((endpoint) => {
            const result = results[endpoint.name]
            const isLoading = loading[endpoint.name]

            return (
              <Card key={endpoint.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{endpoint.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testEndpoint(endpoint.name, endpoint.url)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Testing...' : 'Test'}
                      </Button>
                      {result && (
                        <Badge
                          variant={result.ok ? 'success' : 'danger'}
                        >
                          {result.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result && (
                    <div className="space-y-2">
                      {result.error ? (
                        <div className="text-red-500 text-sm">{result.error}</div>
                      ) : (
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  {!result && !isLoading && (
                    <p className="text-muted-foreground text-sm">Click Test to check endpoint</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}

