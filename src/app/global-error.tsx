'use client'

import { useEffect } from 'react'

/**
 * Catches errors thrown by the root layout itself (outside what error.tsx
 * can reach, since error.tsx renders *inside* the layout). Must render its
 * own <html>/<body> — it fully replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              background: 'white',
              padding: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1.25rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
