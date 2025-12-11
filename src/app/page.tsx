import Link from 'next/link'

export default function Home() {
  return (
    <div className="container">
      <h1>Miyagi Trading Platform</h1>
      <p>Welcome to the trading platform dashboard.</p>
      <nav style={{ marginTop: '20px' }}>
        <Link href="/signals" style={{ marginRight: '10px' }}>
          Signals
        </Link>
        <Link href="/positions" style={{ marginRight: '10px' }}>
          Positions
        </Link>
        <Link href="/orders" style={{ marginRight: '10px' }}>
          Orders
        </Link>
        <Link href="/scanner" style={{ marginRight: '10px' }}>
          Scanner
        </Link>
        <Link href="/config">Config</Link>
      </nav>
    </div>
  )
}

