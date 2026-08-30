'use client'

// Barrel re-export so every existing `from '@/hooks/useDAO'` import keeps
// working unchanged. The actual implementation is split by responsibility:
//   - src/lib/dao-mappers.ts   — pure ScVal/DTO -> UI-type mapping, no React
//   - src/hooks/dao/enumeration.ts — paginated, concurrency-bounded proposal
//     enumeration (the contract has no queryable proposal list)
//   - src/hooks/dao/reads.ts   — core contract/user/stats/event reads
//   - src/hooks/dao/proposal-reads.ts — proposal, loan, staking, document and
//     admin reads
//   - src/hooks/dao/writes.ts  — write actions (shared useWriteAction plumbing
//     plus every mutation hook)
// See useDAO.tsx (issue #115) for the pre-existing duplicate-file situation —
// untouched here, out of scope for this split.
export * from '@/lib/dao-mappers'
export * from './dao/enumeration'
export * from './dao/reads'
export * from './dao/proposal-reads'
export * from './dao/writes'
