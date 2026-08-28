'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DocumentPlusIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useUserData, useProposeTreasury } from '@/hooks/useDAO'
import toast from 'react-hot-toast'

// Human amount -> token base units (Stellar assets use 7 decimals).
function toBaseUnits(input: string): bigint {
  const n = parseFloat(input)
  if (!Number.isFinite(n) || n <= 0) return BigInt(0)
  return BigInt(Math.round(n * 1e7))
}

const STELLAR_ADDRESS = /^[GC][A-Z2-7]{55}$/

export default function CreateProposalPage() {
  const router = useRouter()
  const userData = useUserData()
  const { propose, isPending } = useProposeTreasury()

  const [form, setForm] = useState({
    amount: '',
    destination: '',
    reason: '',
    isPrivate: false,
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  if (!userData.isConnected || !userData.isMember) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-amber-500 dark:text-amber-400" />
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Member Only
              </h3>
              <p className="text-muted-foreground">
                Only DAO members can create governance proposals.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = toBaseUnits(form.amount)
    if (amount <= BigInt(0)) {
      toast.error('Enter a valid amount greater than zero')
      return
    }
    if (!STELLAR_ADDRESS.test(form.destination.trim())) {
      toast.error('Enter a valid Stellar destination address (G… or C…)')
      return
    }
    if (!form.reason.trim()) {
      toast.error('A reason is required')
      return
    }

    try {
      await propose(amount, form.destination.trim(), form.reason.trim(), form.isPrivate)
      router.push('/governance')
    } catch {
      /* toast handled in hook */
    }
  }

  return (
    <AppShell
      title="Create Proposal"
      subtitle="Propose a treasury withdrawal for members to vote on"
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentPlusIcon className="h-5 w-5 text-primary-600" />
              Treasury Withdrawal
            </CardTitle>
            <CardDescription>
              If approved by member consensus, the requested amount is sent from
              the treasury to the destination address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-input px-3 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Destination address
                </label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => set('destination', e.target.value)}
                  placeholder="G… or C…"
                  spellCheck={false}
                  className="w-full rounded-lg border border-input px-3 py-2.5 font-mono text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Reason
                </label>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                  placeholder="Explain what this withdrawal is for…"
                  className="w-full rounded-lg border border-input px-3 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={(e) => set('isPrivate', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <EyeSlashIcon className="h-4 w-4" />
                    Private voting (commit-reveal)
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Members submit a hidden vote first, then reveal it — no one
                    sees the tally influence others while voting is open.
                  </span>
                </span>
              </label>

              <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">
                <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  Treasury withdrawals require a higher consensus (60%) than loan
                  proposals.
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/governance')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Submitting…' : 'Create Proposal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
