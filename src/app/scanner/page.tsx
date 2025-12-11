'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BiasBadge } from '@/components/cards/BiasBadge'
import { useScanner } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ScannerPage() {
  const { data, error, isLoading } = useScanner()

  const scanner = data?.scanner || []

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scanner</h1>
          <p className="text-muted-foreground">Macro regime bias for major indices</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Bias</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">Error loading scanner</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Bias</TableHead>
                      <TableHead>Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanner.length > 0 ? (
                      scanner.map((item: any) => (
                        <TableRow key={item.symbol}>
                          <TableCell className="font-medium">{item.symbol}</TableCell>
                          <TableCell>
                            <BiasBadge bias={item.bias} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.timestamp ? formatDate(item.timestamp) : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No scanner data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {scanner.map((item: any) => {
                  const biasColor = item.bias === 'BULL' 
                    ? 'bg-green-500/20 border-green-500/50' 
                    : item.bias === 'BEAR'
                    ? 'bg-red-500/20 border-red-500/50'
                    : 'bg-gray-500/20 border-gray-500/50'
                  
                  return (
                    <div
                      key={item.symbol}
                      className={`p-4 rounded-lg border ${biasColor} text-center`}
                    >
                      <div className="font-bold text-lg mb-1">{item.symbol}</div>
                      <BiasBadge bias={item.bias} />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
