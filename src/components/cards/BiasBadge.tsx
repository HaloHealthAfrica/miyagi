'use client'

import { Badge } from '@/components/ui/badge'
import { getBiasColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BiasBadgeProps {
  bias: string
  className?: string
}

export function BiasBadge({ bias, className }: BiasBadgeProps) {
  const colorClass = getBiasColor(bias)
  
  return (
    <Badge 
      variant="outline" 
      className={cn(colorClass, className)}
    >
      {bias || 'NEUTRAL'}
    </Badge>
  )
}

