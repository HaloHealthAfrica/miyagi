'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/signals', label: 'Signals', icon: '📡' },
    { href: '/positions', label: 'Positions', icon: '💼' },
    { href: '/orders', label: 'Orders', icon: '📋' },
    { href: '/scanner', label: 'Scanner', icon: '🔍' },
    { href: '/config', label: 'Config', icon: '⚙️' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>🥋 Miyagi Trading</h1>
      </div>
      <div className="navbar-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

