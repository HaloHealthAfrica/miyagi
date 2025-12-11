'use client'

import { SWRConfig } from 'swr'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then((res) => res.json()),
        refreshInterval: 5000,
        revalidateOnFocus: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}

