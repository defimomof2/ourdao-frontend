'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Route-segment error boundary. Without this, an uncaught render error
 * anywhere below the root layout unmounts the whole app with no way to
 * recover short of a hard reload — this gives React a place to catch it and
 * offers a retry that doesn't lose the rest of the app's state (wallet
 * connection, query cache, etc).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">This page couldn&apos;t load</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Something went wrong rendering this page. You can try again, or head
          back to the dashboard.
        </p>
        {error.message && (
          <p className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-2 font-mono text-xs text-gray-500 dark:text-gray-400 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
