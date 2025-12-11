'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getPnLColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PnLCardProps {
  label: string
  value: number
  subtitle?: string
  icon?: 'up' | 'down' | 'neutral'
}

export function PnLCard({ label, value, subtitle, icon }: PnLCardProps) {
  const colorClass = getPnLColor(value)
  const IconComponent = icon === 'up' ? TrendingUp : icon === 'down' ? TrendingDown : Minus

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <IconComponent className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>
          {formatCurrency(value)}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

