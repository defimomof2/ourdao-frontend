'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import {
  useUserData,
  useVoting,
  useLoanRepayment,
  useLoanProposal,
  useProposalDocument,
  useAttachDocument,
} from '@/hooks/useDAO'
import { useNow } from '@/hooks/useNow'
import { formatEther, formatDate, formatAddress, calculatePercentage } from '@/lib/utils'
import { PROPOSAL_STATUS_LABELS, IPFS_GATEWAY } from '@/constants'
import toast from 'react-hot-toast'
import { AppShell } from '@/components/AppShell'

export default function LoanDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userData = useUserData()
  const { voteOnProposal, isPending: isVoting } = useVoting()
  const { repayLoan, isPending: isRepaying } = useLoanRepayment()
  const now = useNow()
  
  const loanId = parseInt(params.id as string)
  const { proposal, isLoading } = useLoanProposal(loanId)
  const { cid: documentCid, refetch: refetchDocument } = useProposalDocument('Loan', loanId)
  const { attach, isPending: attaching } = useAttachDocument()
  const [cidInput, setCidInput] = useState('')
  // The contract stores the proposal core; borrower profile, history and
  // documents aren't on-chain, so they default to empty until an indexer or
  // attached document supplies them.
  const loan = proposal
    ? {
        ...proposal,
        totalVotingPower: proposal.votesFor + proposal.votesAgainst,
        editEndTime: proposal.votingStartTime,
        isRepaid: proposal.status === 5,
        borrowerProfile: {
          reputation: 0,
          totalLoans: 0,
          completedLoans: 0,
          defaultedLoans: 0,
          averageRepaymentTime: '—',
          memberSince: 0,
        },
        loanHistory: [] as { action: string; timestamp: number; details: string }[],
      }
    : null

  const [showRepayment, setShowRepayment] = useState(false)
  const [repaymentAmount, setRepaymentAmount] = useState('')

  useEffect(() => {
    if (!loan) {
      toast.error('Loan not found')
      router.push('/loans')
    }
  }, [loan, router])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="skeleton h-40 w-full max-w-2xl rounded-xl" />
        </div>
      </AppShell>
    )
  }

  if (!loan) {
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
    if (!repaymentAmount || parseFloat(repaymentAmount) <= 0) {
      toast.error('Please enter a valid repayment amount')
      return
    }

    try {
      // Convert ETH string to wei (bigint)
      const amountInWei = BigInt(Math.floor(parseFloat(repaymentAmount) * 1e18))
      await repayLoan(loanId, amountInWei)
      toast.success('Loan repayment successful')
      setShowRepayment(false)
    } catch (error) {
      console.error('Repayment failed:', error)
      toast.error('Failed to process repayment')
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

  const canVote = () => {
    return now !== null &&
           userData.isMember &&
           loan.status === 2 &&
           !loan.hasVoted &&
           loan.borrower !== userData.address &&
           loan.votingEndTime > Math.floor(now / 1000)
  }

  const isBorrower = () => {
    return userData.address?.toLowerCase() === loan.borrower.toLowerCase()
  }

  const votingProgress = calculatePercentage(loan.votesFor, loan.votesFor + loan.votesAgainst)
  const quorumProgress = calculatePercentage(loan.votesFor + loan.votesAgainst, loan.totalVotingPower)

  return (
    <AppShell
      title={`Loan Proposal #${loan.id}`}
      actions={
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(loan.status)}`}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(loan.status)}
              <span>{PROPOSAL_STATUS_LABELS[loan.status as keyof typeof PROPOSAL_STATUS_LABELS]}</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            Share
          </Button>
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
                    <p className="text-xl font-bold text-gray-900">
                      {loan.isPrivate ? 'Private' : `${formatEther(loan.amount)} ETH`}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Interest Rate</p>
                    <p className="text-xl font-bold text-gray-900">{(loan.interestRate / 100).toFixed(2)}%</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <HandThumbUpIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Votes For</p>
                    <p className="text-xl font-bold text-green-600">{loan.votesFor}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <HandThumbDownIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Votes Against</p>
                    <p className="text-xl font-bold text-red-600">{loan.votesAgainst}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Purpose</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {loan.isPrivate ? 'This is a private loan. Details are only visible to the borrower and approved members.' : loan.purpose}
                  </p>
                </div>

                {/* Voting Progress */}
                {loan.status === 2 && (
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
                          style={{ width: `${quorumProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>
                        Voting ends in:{' '}
                        {now === null
                          ? '…'
                          : `${Math.ceil((loan.votingEndTime - Math.floor(now / 1000)) / 86400)} days`}
                      </span>
                      <span>Total votes: {loan.votesFor + loan.votesAgainst}</span>
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

            {/* Loan Repayment for Borrower */}
            {isBorrower() && loan.status === 3 && !loan.isRepaid && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Repayment</CardTitle>
                  <CardDescription>
                    Your loan has been approved. You can make repayments here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showRepayment ? (
                    <Button onClick={() => setShowRepayment(true)} className="w-full">
                      Make Repayment
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repayment Amount (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={repaymentAmount}
                          onChange={(e) => setRepaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleRepayment}
                          disabled={isRepaying}
                          className="flex-1"
                        >
                          {isRepaying ? 'Processing...' : 'Confirm Repayment'}
                        </Button>
                        <Button
                          onClick={() => setShowRepayment(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
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

            {/* Loan History */}
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loan.loanHistory.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">{event.action}</p>
                        <p className="text-sm text-gray-600">{event.details}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Borrower Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Borrower Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-xl">
                      {loan.borrower.substring(2, 4).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{formatAddress(loan.borrower)}</p>
                  <p className="text-sm text-gray-600">Member since {formatDate(loan.borrowerProfile.memberSince)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reputation Score</span>
                    <span className="font-medium text-green-600">{loan.borrowerProfile.reputation}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Loans</span>
                    <span className="font-medium">{loan.borrowerProfile.totalLoans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-medium text-green-600">{loan.borrowerProfile.completedLoans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Defaulted</span>
                    <span className="font-medium text-red-600">{loan.borrowerProfile.defaultedLoans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg. Repayment</span>
                    <span className="font-medium">{loan.borrowerProfile.averageRepaymentTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Timeline */}
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
                  <span className="font-medium">{formatDate(loan.creationTime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Editing Ended</span>
                  <span className="font-medium">{formatDate(loan.editEndTime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Voting Started</span>
                  <span className="font-medium">{formatDate(loan.votingStartTime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Voting Ends</span>
                  <span className="font-medium">{formatDate(loan.votingEndTime)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Low Risk</p>
                  <p className="text-xs text-green-600">Borrower has excellent repayment history</p>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Established member with good reputation</p>
                  <p>• No previous loan defaults</p>
                  <p>• Reasonable loan amount for stated purpose</p>
                  <p>• Supporting documentation provided</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
