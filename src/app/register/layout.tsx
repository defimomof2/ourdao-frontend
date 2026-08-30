import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Join the DAO (pays the membership fee via a real contract call).',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
