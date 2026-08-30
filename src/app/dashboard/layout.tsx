import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Member home: membership status, voting weight, pending yield, quick actions, DAO-wide stats, recent activity.',
  // Member-specific, wallet-gated content — nothing here is useful to a
  // search index.
  robots: { index: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
