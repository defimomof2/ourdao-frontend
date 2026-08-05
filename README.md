# OurDAO Frontend

[![CI](https://github.com/ourdao/ourdao-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/ourdao/ourdao-frontend/actions/workflows/ci.yml)

A [Next.js](https://nextjs.org) web app for the **OurDAO** member-owned lending DAO on **Stellar Soroban**.

This frontend was ported from an EVM stack (wagmi / RainbowKit / ethers) to Stellar:

- **Wallet:** [Freighter](https://www.freighter.app/) via `@stellar/freighter-api`
- **Chain access:** `@stellar/stellar-sdk` (Soroban RPC — simulate for reads, prepare/sign/submit for writes)
- **Contract:** the [`ourdao-contracts`](https://github.com/ourdao/ourdao-contracts) Soroban DAO

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit values (all optional; testnet defaults)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Install the **Freighter** browser extension to connect a wallet.

## Configuration

All config is env-driven with public-testnet defaults (see `.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed OurDAO contract id (`C…`) | _(empty → read-only "not configured")_ |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Network passphrase | testnet |
| `NEXT_PUBLIC_IPFS_GATEWAY` | Gateway for document content hashes | Pinata |
| `NEXT_PUBLIC_BACKEND_URL` | [`ourdao-backend`](https://github.com/ourdao/ourdao-backend) indexer/API (loan history, notifications, admin log, events) | `http://localhost:4000` |

Without a `NEXT_PUBLIC_CONTRACT_ID` the UI runs and renders, but on-chain reads/writes are disabled until you point it at a deployed contract. Without a reachable backend, everything backend-derived (loan history, notifications, activity/admin logs) degrades to empty rather than erroring — see `src/lib/backend.ts`.

## Where the Stellar integration lives

| File | Role |
|---|---|
| `src/lib/stellar.ts` | Network config, RPC client, explorer URLs |
| `src/lib/wallet.tsx` | Freighter connect/disconnect/sign context (`useWallet`) |
| `src/lib/dao-client.ts` | Soroban read/invoke + typed wrappers for the contract's methods |
| `src/components/ConnectButton.tsx` | Freighter-backed drop-in for the old RainbowKit button |
| `src/hooks/useDAO.ts` | React-Query hooks the pages consume (unchanged surface) |

## Scripts

```bash
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm start       # serve the production build
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm test          # vitest
```

## Testing

Vitest + Testing Library, jsdom by default (pure-logic suites that don't need the DOM, like the Soroban ScVal builders, opt into the Node environment per-file via `// @vitest-environment node`). Coverage so far: `dao-client.ts`'s ScVal builders, `backend.ts`'s fetch wrappers (including its fail-soft-on-error behavior), `useDAO.ts`'s pure mapping helpers, and `useNotifications.ts`'s hooks (mocking `@/lib/wallet` and `@/lib/backend`, rendered against a real `QueryClientProvider`). CI runs lint, typecheck, test, and build on every push/PR — see `.github/workflows/ci.yml`.

## What's real vs. not

Most of the app is wired to the live contract + backend: registration, loan request/vote/repay, treasury propose/vote, staking, name registry, commit-reveal private voting, document content-hash attachment, notifications, admin actions (pause/unpause, add/remove admin, set consensus threshold), an admin/governance audit log, and loan defaults — `markLoanDefaulted` is exposed in `dao-client.ts`, and the dashboard's Recent Activity feed labels every real event (including `loan_dflt`) instead of the "Unknown event occurred" it showed for everything before. The loan detail page (`/loans/[id]`) reads the contract's real disbursed `Loan` (via `useLoan`) once a proposal is approved — actual status, due date, and outstanding balance, not the previous proposal-status guesswork that never reflected repayment or default. One known gap remains:

- **IPFS document storage** (`src/lib/ipfs.ts`) — the encryption (AES-GCM) is real, but the upload/download target (Infura's IPFS gateway) has been shut down. Needs a real pinning provider (Pinata/web3.storage) + API key before it actually stores anything.

`tsc --noEmit` is fully clean and enforced in CI. `next.config.ts` still sets `typescript.ignoreBuildErrors` — safe to remove now, kept since the CI gate already covers it (the `eslint.ignoreDuringBuilds` counterpart was removed outright in the Next 16 upgrade — that config key no longer exists).

Running on Next.js 16 (Turbopack by default) + React 19.2. The Next 16 bump pulled in `eslint-plugin-react-hooks` v7, which added stricter React Compiler-oriented rules (`purity`, `immutability`, `set-state-in-effect`) that flag 13 pre-existing call sites — mostly `Date.now()` read during render and browser API state synced in `useEffect` instead of via `useSyncExternalStore`. None of these are new bugs and none were introduced by the upgrade; they're downgraded to warnings in `eslint.config.mjs` pending a proper cleanup pass.
