'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import {
  useUserData,
  useDAOStats,
  useAdmins,
  useAdminActions,
  useAdminLog,
} from '@/hooks/useDAO'
import { formatToken, formatAddress, formatDate } from '@/lib/utils'
import { AppShell } from '@/components/AppShell'

type Tab = 'overview' | 'governance' | 'activity'

const TABS: { id: Tab; name: string; icon: ReactNode }[] = [
  { id: 'overview', name: 'Overview', icon: <ChartBarIcon className="h-4 w-4" /> },
  { id: 'governance', name: 'Governance', icon: <UsersIcon className="h-4 w-4" /> },
  { id: 'activity', name: 'Activity Log', icon: <ClockIcon className="h-4 w-4" /> },
]

export default function AdminPage() {
  const userData = useUserData()
  const stats = useDAOStats()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (!userData.isConnected) {
    return (
      <AppShell>
        <GuardMessage
          icon={<ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />}
          title="Wallet Not Connected"
          message="Please connect your wallet to access the admin panel."
        />
      </AppShell>
    )
  }

  if (!userData.isAdmin) {
    return (
      <AppShell>
        <GuardMessage
          icon={<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />}
          title="Access Denied"
          message="You need admin privileges to access this panel."
        />
      </AppShell>
    )
  }

  return (
    <AppShell title="Admin Dashboard" subtitle="Real-time DAO governance and system state.">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'governance' && <GovernanceTab stats={stats} />}
            {activeTab === 'activity' && <ActivityTab />}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function GuardMessage({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</h4>
      <div className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{value}</div>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function OverviewTab({ stats }: { stats: ReturnType<typeof useDAOStats> }) {
  const { pause, unpause, isPending } = useAdminActions()

  return (
    <div className="space-y-6">
      <div
        className={`rounded-lg p-6 border ${
          stats.isPaused ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${stats.isPaused ? 'bg-red-100' : 'bg-green-100'}`}>
              <ShieldCheckIcon className={`h-6 w-6 ${stats.isPaused ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${stats.isPaused ? 'text-red-900' : 'text-green-900'}`}>
                Contract is {stats.isPaused ? 'Paused' : 'Active'}
              </h3>
              <p className={`text-sm ${stats.isPaused ? 'text-red-700' : 'text-green-700'}`}>
                {stats.isPaused
                  ? 'All state-changing operations are currently blocked on-chain.'
                  : 'Members can register, vote, and transact normally.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => (stats.isPaused ? unpause() : pause())}
            disabled={isPending}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white disabled:opacity-50 ${
              stats.isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {stats.isPaused ? <PlayIcon className="h-4 w-4" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
            <span>{stats.isPaused ? 'Unpause' : 'Pause'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Members" value={stats.activeMembers.toLocaleString()} sub={`${stats.totalMembers} total ever joined`} />
        <StatCard label="Active Loans" value={stats.activeLoans.toLocaleString()} sub={`${stats.totalLoans} total`} />
        <StatCard label="Treasury Balance" value={formatToken(stats.treasuryBalance)} />
        <StatCard label="Consensus Threshold" value={`${(stats.consensusThreshold / 100).toFixed(2)}%`} />
      </div>
    </div>
  )
}

function GovernanceTab({ stats }: { stats: ReturnType<typeof useDAOStats> }) {
  const { admins, isLoading, refetch } = useAdmins()
  const { addAdmin, removeAdmin, setThreshold, isPending, isSuccess } = useAdminActions()
  const [newAdmin, setNewAdmin] = useState('')
  const [threshold, setThresholdInput] = useState('')

  const submitAddAdmin = async (e: FormEvent) => {
    e.preventDefault()
    if (!newAdmin.trim()) return
    await addAdmin(newAdmin.trim())
    setNewAdmin('')
    refetch()
  }

  const submitThreshold = async (e: FormEvent) => {
    e.preventDefault()
    const bps = Number(threshold)
    if (!Number.isFinite(bps) || bps <= 0 || bps > 10_000) return
    await setThreshold(bps)
    setThresholdInput('')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admins ({admins.length})</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading && <div className="px-6 py-4 text-sm text-gray-500">Loading…</div>}
          {admins.map((addr) => (
            <div key={addr} className="px-6 py-3 flex items-center justify-between">
              <span className="font-mono text-sm text-gray-900 dark:text-white">{formatAddress(addr)}</span>
              <button
                onClick={async () => {
                  await removeAdmin(addr)
                  refetch()
                }}
                disabled={isPending || admins.length <= 1}
                title={admins.length <= 1 ? 'Cannot remove the last admin' : 'Remove admin'}
                className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={submitAddAdmin} className="p-6 flex space-x-2 border-t border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            placeholder="G… address to add as admin"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={isPending || !newAdmin.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add Admin
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consensus Threshold</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Currently {(stats.consensusThreshold / 100).toFixed(2)}% of active members, in basis points.
          </p>
        </div>
        <form onSubmit={submitThreshold} className="p-6 flex space-x-2">
          <input
            type="number"
            min={1}
            max={10_000}
            value={threshold}
            onChange={(e) => setThresholdInput(e.target.value)}
            placeholder="e.g. 5100 for 51%"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={isPending || !threshold}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Update Threshold
          </button>
        </form>
        {isSuccess && <p className="px-6 pb-4 text-sm text-green-600">Updated.</p>}
      </div>
    </div>
  )
}

function ActivityTab() {
  const { entries, isLoading } = useAdminLog(100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Admin/Governance Event History
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Indexed on-chain events: admin add/remove, threshold and policy changes, pause/unpause.
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading && <div className="px-6 py-4 text-sm text-gray-500">Loading…</div>}
        {!isLoading && entries.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No admin/governance events indexed yet.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                {entry.symbol}
              </span>
              <span className="text-sm text-gray-900 dark:text-white">Ledger {entry.ledger}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.closedAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
