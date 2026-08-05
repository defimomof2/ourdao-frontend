'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from 'next-themes'
import { WalletProvider } from '@/lib/wallet'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                borderRadius: '8px',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#f9fafb' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#f9fafb' },
              },
            }}
          />
          {children}
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
