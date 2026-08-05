'use client'

/**
 * Shared application shell: a sticky top bar plus a persistent sidebar on
 * desktop (a slide-over drawer on mobile). Renders the primary navigation from
 * a single source of truth, highlights the active route, and surfaces a banner
 * when no contract is configured. App pages wrap their content in <AppShell>
 * instead of hand-rolling their own header.
 */
import { type ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BanknotesIcon,
  UsersIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { ConnectButton } from '@/components/ConnectButton'
import NotificationCenter from '@/components/NotificationCenter'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useUserData } from '@/hooks/useDAO'
import { isContractConfigured } from '@/lib/stellar'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: typeof HomeIcon
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Loans', href: '/loans', icon: BanknotesIcon },
  { name: 'Governance', href: '/governance', icon: UsersIcon },
  { name: 'Treasury', href: '/treasury', icon: BuildingLibraryIcon },
  { name: 'Privacy', href: '/privacy', icon: ShieldCheckIcon },
]

const ADMIN_ITEM: NavItem = { name: 'Admin', href: '/admin', icon: Cog6ToothIcon }

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 text-sm font-bold text-white shadow-sm">
        O
      </span>
      <span className="text-lg font-semibold tracking-tight text-gray-900">
        OurDAO
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { isAdmin } = useUserData()
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 shrink-0',
                active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

interface AppShellProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <BrandMark />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationCenter />
            <ConnectButton />
          </div>
        </div>
      </header>

      {!isContractConfigured() && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-6">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>
            No contract configured — set{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_CONTRACT_ID
            </code>{' '}
            to enable live data. The app is running in preview mode.
          </span>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-gray-200 bg-white py-4 lg:flex">
          <NavLinks />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-gray-900/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white py-4 shadow-xl">
              <div className="mb-2 flex items-center justify-between px-4">
                <BrandMark />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close navigation"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
