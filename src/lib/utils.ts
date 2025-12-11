import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-green-500'
  if (pnl < 0) return 'text-red-500'
  return 'text-muted-foreground'
}

export function getBiasColor(bias: string): string {
  switch (bias?.toUpperCase()) {
    case 'BULL':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'BEAR':
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case 'NEUTRAL':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

