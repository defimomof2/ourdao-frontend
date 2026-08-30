import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy',
  description: "What's actually private on-chain (commit-reveal voting, document encryption) and how to use it.",
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
