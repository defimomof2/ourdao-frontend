<!--
Please read CONTRIBUTING.md before opening this PR.
PRs against an unassigned issue will be closed with a pointer back to it.
-->

## What this changes

<!-- One or two sentences. What behavior is different after this PR? -->

## Why

<!-- The diff shows what changed. Explain why this is the right change. -->

Closes #<!-- issue number -->

## Testing

<!-- Name the test(s) you added or updated, and what would break without this change.
     For a purely visual change, say so and attach before/after screenshots instead. -->

- [ ] Added or updated a test that fails without this change (or: visual-only, screenshots below)
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

## Frontend checklist

<!-- Delete any line that genuinely doesn't apply. -->

- [ ] No fabricated, placeholder, or sample user-facing content introduced
- [ ] Data fetching goes through TanStack Query, not `fetch`-in-`useEffect`
- [ ] No private key handling, seed phrase input, or in-app signing introduced
- [ ] Class composition uses `cn()`, not hand-concatenated class strings
- [ ] Verified in **both** light and dark mode
- [ ] No new `any` or `@ts-expect-error`

### Screenshots

<!-- Required for any visual change. Light and dark mode. Write "N/A" if not applicable. -->

N/A

### Contract interface changes

<!-- If this updates src/lib/dao-client.ts to match a contract change, name the ourdao-contracts commit. Write "None" if not applicable. -->

None

## Anything reviewers should look at closely

<!-- Optional. Point at the part you're least sure about. -->
