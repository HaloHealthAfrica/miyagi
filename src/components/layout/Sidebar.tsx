'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Radio, 
  FileText, 
  Briefcase, 
  ShoppingCart, 
  Search, 
  Shield,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/decisions', label: 'Decisions', icon: FileText },
  { href: '/positions', label: 'Positions', icon: Briefcase },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/scanner', label: 'Scanner', icon: Search },
  { href: '/analytics', label: 'Analytics', icon: LayoutDashboard },
  { href: '/learning', label: 'Learning', icon: LayoutDashboard },
  { href: '/risk', label: 'Risk', icon: Shield },
  { href: '/debug', label: 'Debug', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Miyagi</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          Trading Platform v1.0
        </div>
      </div>
    </div>
  )
}

