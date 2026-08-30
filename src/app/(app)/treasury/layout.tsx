import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Treasury',
  description: 'Treasury balance, staking (stake/unstake for voting-weight boost), claimable yield.',
}

export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
  return children
}
