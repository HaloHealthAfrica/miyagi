import './globals.css'

import type { Metadata } from 'next'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Miyagi Trading Platform',
  description: 'Automated trading platform powered by TradingView signals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>

       <Toaster/> 
      </body>
    </html>
  )
}
