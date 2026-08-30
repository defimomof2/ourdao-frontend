import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request a Loan',
  description: 'Multi-step loan request form.',
}

export default function RequestLoanLayout({ children }: { children: React.ReactNode }) {
  return children
}
