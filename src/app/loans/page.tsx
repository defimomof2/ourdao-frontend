'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Banknote,
  Plus,
  Filter,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import { useUserData, useVoting, useLoanProposals, type UILoanProposal } from '@/hooks/useDAO'
import { useNow } from '@/hooks/useNow'
import { formatToken, formatDate, formatAddress, calculatePercentage } from '@/lib/utils'
import { PROPOSAL_STATUS_LABELS } from '@/constants'
import toast from 'react-hot-toast'
import { AppShell } from '@/components/AppShell'

export default function LoansPage() {
  const userData = useUserData()
  const { voteOnProposal, isPending } = useVoting()
  const { proposals, isLoading } = useLoanProposals()
  const now = useNow()

  const [filters, setFilters] = useState({
    status: 'all',
    privacy: 'all',
    search: '',
  })

  const filteredProposals = useMemo(() => {
    let filtered = proposals

    // Filter by status
    if (filters.status !== 'all') {
      const statusMap = {
        'editing': 1,
        'voting': 2,
        'approved': 3,
        'rejected': 4,
      }
      filtered = filtered.filter(p => p.status === statusMap[filters.status as keyof typeof statusMap])
    }

    // Filter by privacy
    if (filters.privacy !== 'all') {
      filtered = filtered.filter(p => {
        if (filters.privacy === 'public') return !p.isPrivate
        if (filters.privacy === 'private') return p.isPrivate
        return true
      })
    }

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(p =>
        p.purpose.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.borrower.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    return filtered
  }, [filters, proposals])

  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      await voteOnProposal(proposalId, support)
      toast.success(`Vote cast ${support ? 'in favor' : 'against'} proposal ${proposalId}`)
    } catch (error) {
      console.error('Voting failed:', error)
      toast.error('Failed to cast vote')
    }
  }

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: // IN_EDITING
        return <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
      case 2: // IN_VOTING
        return <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
      case 3: // APPROVED
        return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
      case 4: // REJECTED
        return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-900'
      case 2: return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900'
      case 3: return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900'
      case 4: return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const canVote = (proposal: UILoanProposal) => {
    return now !== null &&
           userData.isMember &&
           proposal.status === 2 &&
           !proposal.hasVoted &&
           proposal.borrower !== userData.address &&
           proposal.votingEndTime > Math.floor(now / 1000)
  }

  return (
    <AppShell
      title="Loan Proposals"
      subtitle="Browse and vote on member loan requests"
      actions={
        userData.isMember && !userData.hasActiveLoan ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/loans/request">
              <Plus className="mr-2 h-5 w-5" />
              Request Loan
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div>
        {/* Filters */}
        <Card className="mb-12 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg font-semibold">
              <Filter className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="all">All Statuses</option>
                  <option value="editing">In Editing</option>
                  <option value="voting">In Voting</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Privacy</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  value={filters.privacy}
                  onChange={(e) => setFilters(prev => ({ ...prev, privacy: e.target.value }))}
                >
                  <option value="all">All Types</option>
                  <option value="public">Public Only</option>
                  <option value="private">Private Only</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by purpose or borrower address..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current lending activity and proposal statistics</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 mr-4">
                    <Banknote className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Proposals</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{proposals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-950/50 mr-4">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Voting</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {proposals.filter(p => p.status === 2).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/50 mr-4">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {proposals.filter(p => p.status === 3).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 mr-4">
                    <EyeOff className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Private</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {proposals.filter(p => p.isPrivate).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[0, 1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="skeleton mb-4 h-6 w-48 rounded" />
                    <div className="skeleton mb-2 h-4 w-full rounded" />
                    <div className="skeleton h-4 w-2/3 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Banknote className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No proposals found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filters.status !== 'all' || filters.privacy !== 'all' || filters.search
                    ? 'Try adjusting your filters to see more proposals.'
                    : 'Be the first to request a loan!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getStatusIcon(proposal.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <CardTitle className="text-lg">
                            Loan Proposal #{proposal.id}
                          </CardTitle>
                          {proposal.isPrivate && (
                            <span title="Private Loan">
                              <EyeOff className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </span>
                          )}
                          {proposal.documentHash && (
                            <span title="Has Documents">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          By {formatAddress(proposal.borrower)} • Created {formatDate(proposal.creationTime)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(proposal.status)}`}>
                      {PROPOSAL_STATUS_LABELS[proposal.status as keyof typeof PROPOSAL_STATUS_LABELS] || 'Unknown'}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amount Requested</p>
                      <p className="font-semibold">
                        {proposal.isPrivate ? 'Private' : formatToken(proposal.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</p>
                      <p className="font-semibold">{(proposal.interestRate / 100).toFixed(2)}% APR</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Votes For</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">{proposal.votesFor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Votes Against</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">{proposal.votesAgainst}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Purpose</p>
                    <p className="text-gray-900 dark:text-white">
                      {proposal.isPrivate ? 'Details are private' : proposal.purpose}
                    </p>
                  </div>

                  {/* Voting Progress */}
                  {proposal.status === 2 && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Voting Progress</span>
                        <span>
                          {proposal.votesFor + proposal.votesAgainst} votes •{' '}
                          {now === null
                            ? '…'
                            : `${Math.ceil((proposal.votingEndTime - Math.floor(now / 1000)) / 86400)} days left`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${calculatePercentage(
                              proposal.votesFor,
                              proposal.votesFor + proposal.votesAgainst
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/loans/${proposal.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      {proposal.documentHash && (
                        <Button variant="outline" size="sm" disabled>
                          <FileText className="h-4 w-4 mr-2" />
                          Documents
                        </Button>
                      )}
                    </div>

                    {canVote(proposal) && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, false)}
                          disabled={isPending}
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                        >
                          Vote Against
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVote(proposal.id, true)}
                          disabled={isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Vote For
                        </Button>
                      </div>
                    )}

                    {proposal.hasVoted && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-1" />
                        You have voted
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
