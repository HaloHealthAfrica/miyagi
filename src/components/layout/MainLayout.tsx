'use client'

import { Sidebar } from './Sidebar'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="terminal-grid">
      <Sidebar />
      
      <main className="terminal-content bg-background">
        {children}
      </main>
    </div>
  )
}

