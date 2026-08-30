import type { Metadata } from 'next'

export const metadata: Metadata = {
  // See src/app/(app)/loans/layout.tsx for why `template` is repeated here rather
  // than relying on the root layout's — Next only applies it one level down.
  title: { default: 'Governance', template: '%s · OurDAO' },
  description: 'Browse and vote on both loan and treasury proposals in one place.',
}

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return children
}
