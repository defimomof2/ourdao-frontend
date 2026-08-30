import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Admin-only: pause/unpause, add/remove admins, set consensus threshold, governance audit log.',
  // Admin-only, wallet-gated content — nothing here is useful to a search index.
  robots: { index: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
