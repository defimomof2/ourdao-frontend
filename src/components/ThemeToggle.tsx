'use client'

import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // next-themes only knows the resolved (system-aware) theme on the client,
  // after hydration — rendering a theme-dependent icon before that would
  // mismatch the server-rendered HTML. A same-size placeholder avoids
  // layout shift once the real icon appears.
  if (resolvedTheme === undefined) {
    return <div className="h-9 w-9 rounded-lg p-2" aria-hidden />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  )
}
