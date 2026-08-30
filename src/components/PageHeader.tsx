import type { ReactNode } from 'react'

/**
 * Per-page title block. Split out of AppShell so pages can still declare a
 * title/subtitle/actions after AppShell moved into (app)/layout.tsx — a
 * layout only renders `{children}`, it can't take props from the page below
 * it, so this is what pages render instead of passing them to <AppShell>.
 * Same markup AppShell used to render inline; only where it lives changed.
 */
interface PageHeaderProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  if (!title && !actions) return null

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {title && (
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        )}
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
