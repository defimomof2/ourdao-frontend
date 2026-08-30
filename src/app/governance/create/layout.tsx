import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Proposal',
  description: 'Create a treasury withdrawal proposal (optionally private, via commit-reveal).',
}

export default function CreateProposalLayout({ children }: { children: React.ReactNode }) {
  return children
}
