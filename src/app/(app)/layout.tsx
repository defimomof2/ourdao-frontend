import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'

// Next only applies a title template to the segment directly below the
// layout that defines it — root's template (src/app/layout.tsx) would
// otherwise stop reaching admin/dashboard/treasury/etc. now that this group
// layout sits between them. Re-declared here for the same reason
// loans/layout.tsx and governance/layout.tsx redeclare it for their own
// children. `default` is a pure fallback: every route under (app) sets its
// own title, so it's never actually shown.
export const metadata: Metadata = {
  title: { default: 'OurDAO', template: '%s · OurDAO' },
}

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
