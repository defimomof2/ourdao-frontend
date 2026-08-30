import type { Metadata } from 'next'

export const metadata: Metadata = {
  // `template` must be re-declared here, not just on the root layout — Next
  // only applies a title template to the segment directly below the layout
  // that defines it, so without this, /loans/request and /loans/[id] would
  // fall back to their own bare titles instead of "… · OurDAO".
  title: { default: 'Loans', template: '%s · OurDAO' },
  description: 'Browse and vote on loan proposals.',
}

export default function LoansLayout({ children }: { children: React.ReactNode }) {
  return children
}
