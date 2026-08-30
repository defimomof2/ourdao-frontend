'use client'

import Link from 'next/link'
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useUserData, useTreasuryProposals } from '@/hooks/useDAO'
import { PageHeader } from '@/components/PageHeader'

export default function PrivacyPage() {
  const userData = useUserData()
  const { proposals, isLoading } = useTreasuryProposals()

  if (!userData.isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="bg-card rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-muted-foreground">
            Please connect your wallet to view privacy features.
          </p>
        </div>
      </div>
    )
  }

  const privateCount = proposals.filter((p) => p.isPrivate).length
  const publicCount = proposals.length - privateCount

  return (
    <>
      <PageHeader
        title="Privacy"
        subtitle="What's actually private on-chain, and how to use it."
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-start space-x-4">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <EyeSlashIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Commit-reveal private treasury voting
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Treasury withdrawal proposals can be created as <strong>private</strong>. Votes on
                a private proposal are first submitted as a hidden commitment (a hash of your
                choice + a secret salt), then revealed later — so no one, including other voters,
                can see the running tally while voting is open. This is enforced on-chain by the
                contract&apos;s commit-reveal module, not by trusting a server.
              </p>
              <Link
                href="/governance/create"
                className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Create a private treasury proposal →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-start space-x-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <LockClosedIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Document encryption
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                When attaching supporting documents to a loan or treasury proposal, you can
                encrypt them client-side (AES-GCM, password-derived key) before upload — the
                contract only ever stores a content hash, never the document itself or your
                password.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
            Treasury proposal privacy, DAO-wide
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{privateCount}</div>
                <div className="text-sm text-muted-foreground">Private proposals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{publicCount}</div>
                <div className="text-sm text-muted-foreground">Public proposals</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Everything else — membership, loan proposals, loan votes, staking — is public on-chain
            by design, the same as any Soroban contract. There is no account-level &quot;privacy
            mode&quot; covering activity outside the two features above.
          </p>
        </div>
      </div>
    </>
  )
}
