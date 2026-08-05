'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline'
import {
  useUserData,
  useDAOStats,
  useVoting,
  useLoanRepayment,
  useLoanProposal,
  useLoan,
  useMarkLoanDefaulted,
  useProposalDocument,
  useAttachDocument,
  type UILoan,
} from '@/hooks/useDAO'
import { useNow } from '@/hooks/useNow'
import { formatToken, formatDate, formatAddress, calculatePercentage } from '@/lib/utils'
import { PROPOSAL_STATUS_LABELS, IPFS_GATEWAY } from '@/constants'
import toast from 'react-hot-toast'
import { AppShell } from '@/components/AppShell'

export default function LoanDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userData = useUserData()
  const { activeMembers } = useDAOStats()
  const { voteOnProposal, isPending: isVoting } = useVoting()
  const { repayLoan, isPending: isRepaying } = useLoanRepayment()
  const { markLoanDefaulted, isPending: isMarkingDefaulted } = useMarkLoanDefaulted()
  const now = useNow()

  const loanId = parseInt(params.id as string)
  const { proposal, isLoading } = useLoanProposal(loanId)
  // A LoanProposal only tracks the vote; the real disbursed Loan (due date,
  // repayment status) exists once the proposal is Approved (status 3), and
  // the contract guarantees it carries the same id as the proposal.
  const { loan: realLoan, isLoading: loanLoading, refetch: refetchLoan } = useLoan(
    loanId,
    proposal?.status === 3
  )
  const { cid: documentCid, refetch: refetchDocument } = useProposalDocument('Loan', loanId)
  const { attach, isPending: attaching } = useAttachDocument()
  const [cidInput, setCidInput] = useState('')

  useEffect(() => {
    if (!isLoading && !proposal) {
      toast.error('Loan not found')
      router.push('/loans')
    }
  }, [isLoading, proposal, router])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="skeleton h-40 w-full max-w-2xl rounded-xl" />
        </div>
      </AppShell>
    )
  }

  if (!proposal) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loan Not Found</h3>
            <p className="text-gray-600 mb-4">The requested loan proposal does not exist.</p>
            <Button asChild>
              <Link href="/loans">Back to Loans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </AppShell>
    )
  }

  const handleVote = async (support: boolean) => {
    try {
      await voteOnProposal(loanId, support)
      toast.success(`Vote cast ${support ? 'in favor of' : 'against'} the proposal`)
    } catch (error) {
      console.error('Voting failed:', error)
      toast.error('Failed to cast vote')
    }
  }

  const handleRepayment = async () => {
    try {
      await repayLoan(loanId)
      toast.success('Loan repayment successful')
    } catch (error) {
      console.error('Repayment failed:', error)
      toast.error('Failed to process repayment')
    }
  }

  const handleMarkDefaulted = async () => {
    try {
      await markLoanDefaulted(loanId)
      toast.success('Loan marked as defaulted')
      refetchLoan()
    } catch (error) {
      console.error('Mark defaulted failed:', error)
      toast.error('Failed to mark loan as defaulted')
    }
  }

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: return <ClockIcon className="h-6 w-6 text-yellow-500" />
      case 2: return <ClockIcon className="h-6 w-6 text-blue-500" />
      case 3: return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 4: return <XCircleIcon className="h-6 w-6 text-red-500" />
      default: return <ClockIcon className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 2: return 'text-blue-600 bg-blue-50 border-blue-200'
      case 3: return 'text-green-600 bg-green-50 border-green-200'
      case 4: return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const loanStatusClass = (status: UILoan['status']) => {
    switch (status) {
      case 'Active': return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'Repaid': return 'text-green-700 bg-green-50 border-green-200'
      case 'Defaulted': return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  const canVote = () => {
    return now !== null &&
           userData.isMember &&
           proposal.status === 2 &&
           !proposal.hasVoted &&
           proposal.borrower !== userData.address &&
           proposal.votingEndTime > Math.floor(now / 1000)
  }

  const isBorrower = () => {
    return userData.address?.toLowerCase() === proposal.borrower.toLowerCase()
  }

  const isOverdue =
    realLoan?.status === 'Active' && now !== null && Math.floor(now / 1000) > realLoan.dueTime

  const outstanding = realLoan ? realLoan.totalRepayment - realLoan.amountRepaid : BigInt(0)

  const votingProgress = calculatePercentage(proposal.votesFor, proposal.votesFor + proposal.votesAgainst)
  const totalVotes = proposal.votesFor + proposal.votesAgainst
  // Approximates participation against active member headcount (vote
  // weight can exceed 1/member via staking bonuses, so this can overshoot
  // 100% for a heavily-staked electorate — clamped below for the bar width).
  const quorumProgress = calculatePercentage(totalVotes, activeMembers)

  return (
    <AppShell
      title={`Loan Proposal #${proposal.id}`}
      actions={
        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(proposal.status)}`}>
          <div className="flex items-center space-x-1">
            {getStatusIcon(proposal.status)}
            <span>{PROPOSAL_STATUS_LABELS[proposal.status as keyof typeof PROPOSAL_STATUS_LABELS]}</span>
          </div>
        </div>
      }
    >
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loan Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-xl font-bold text-gray-900">{formatToken(proposal.amount)}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Interest Rate</p>
                    <p className="text-xl font-bold text-gray-900">{(proposal.interestRate / 100).toFixed(2)}%</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <HandThumbUpIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Votes For</p>
                    <p className="text-xl font-bold text-green-600">{proposal.votesFor}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <HandThumbDownIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Votes Against</p>
                    <p className="text-xl font-bold text-red-600">{proposal.votesAgainst}</p>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Borrower</span>
                  <span className="font-medium text-gray-900">{formatAddress(proposal.borrower)}</span>
                </div>

                {/* Voting Progress */}
                {proposal.status === 2 && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Approval Progress</span>
                        <span>{votingProgress}% in favor</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${votingProgress}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Quorum Progress</span>
                        <span>{quorumProgress}% participation</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(quorumProgress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>
                        Voting ends in:{' '}
                        {now === null
                          ? '…'
                          : `${Math.ceil((proposal.votingEndTime - Math.floor(now / 1000)) / 86400)} days`}
                      </span>
                      <span>Total votes: {totalVotes}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voting Actions */}
            {canVote() && (
              <Card>
                <CardHeader>
                  <CardTitle>Cast Your Vote</CardTitle>
                  <CardDescription>
                    As a DAO member, you can vote on this loan proposal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => handleVote(true)}
                      disabled={isVoting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <HandThumbUpIcon className="h-4 w-4 mr-2" />
                      {isVoting ? 'Voting...' : 'Vote For'}
                    </Button>
                    <Button
                      onClick={() => handleVote(false)}
                      disabled={isVoting}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <HandThumbDownIcon className="h-4 w-4 mr-2" />
                      {isVoting ? 'Voting...' : 'Vote Against'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real disbursed-loan status, once approved */}
            {proposal.status === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Status</CardTitle>
                  <CardDescription>
                    The disbursed loan&apos;s real on-chain state — separate from
                    the proposal above, which only tracked the vote.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loanLoading || !realLoan ? (
                    <div className="skeleton h-24 w-full rounded-lg" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`px-3 py-1 rounded-full border text-sm font-medium ${loanStatusClass(realLoan.status)}`}>
                          {realLoan.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Principal</p>
                          <p className="font-medium text-gray-900">{formatToken(realLoan.principal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Repayment</p>
                          <p className="font-medium text-gray-900">{formatToken(realLoan.totalRepayment)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Repaid So Far</p>
                          <p className="font-medium text-gray-900">{formatToken(realLoan.amountRepaid)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Due</p>
                          <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatDate(realLoan.dueTime)}
                          </p>
                        </div>
                      </div>

                      {isOverdue && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-2 mb-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">
                              This loan is past its due date. Anyone can mark
                              it defaulted, which slashes a policy-defined
                              share of the borrower&apos;s treasury claim.
                            </p>
                          </div>
                          <Button
                            onClick={handleMarkDefaulted}
                            disabled={isMarkingDefaulted}
                            variant="outline"
                            className="w-full text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {isMarkingDefaulted ? 'Processing...' : 'Mark as Defaulted'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Loan Repayment for Borrower */}
            {isBorrower() && realLoan?.status === 'Active' && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Repayment</CardTitle>
                  <CardDescription>
                    Repayment is always the full outstanding balance — the
                    contract doesn&apos;t support partial repayments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Outstanding balance</span>
                    <span className="text-lg font-semibold text-gray-900">{formatToken(outstanding)}</span>
                  </div>
                  <Button onClick={handleRepayment} disabled={isRepaying} className="w-full">
                    {isRepaying ? 'Processing...' : 'Repay Full Outstanding Balance'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Supporting document (on-chain content hash) */}
            <Card>
              <CardHeader>
                <CardTitle>Supporting Document</CardTitle>
                <CardDescription>
                  A content hash (e.g. an IPFS CID) anchoring an off-chain
                  document to this proposal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentCid ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DocumentTextIcon className="h-8 w-8 shrink-0 text-primary-600" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">Attached document</p>
                        <p className="truncate font-mono text-xs text-gray-500">
                          {documentCid}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`${IPFS_GATEWAY}${documentCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <EyeIcon className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">No document attached yet.</p>
                    {userData.isMember && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cidInput}
                          onChange={(e) => setCidInput(e.target.value)}
                          placeholder="IPFS CID or content hash…"
                          spellCheck={false}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                        <Button
                          size="sm"
                          disabled={attaching || !cidInput.trim()}
                          onClick={async () => {
                            try {
                              await attach('Loan', loanId, cidInput)
                              setCidInput('')
                              refetchDocument()
                            } catch {
                              /* toast handled in hook */
                            }
                          }}
                        >
                          Attach
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Proposal Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">{formatDate(proposal.creationTime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Editing Ended</span>
                  <span className="font-medium">{formatDate(proposal.votingStartTime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Voting Ends</span>
                  <span className="font-medium">{formatDate(proposal.votingEndTime)}</span>
                </div>
                {realLoan && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Disbursed</span>
                      <span className="font-medium">{formatDate(realLoan.startTime)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Due</span>
                      <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                        {formatDate(realLoan.dueTime)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
