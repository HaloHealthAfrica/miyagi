import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Miyagi Trading Platform',
  description: 'Trading platform powered by TradingView signals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

