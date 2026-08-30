import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// `globals: false` in vitest.config.ts means RTL's own auto-cleanup (which
// relies on detecting a global `afterEach`) never registers, so a page
// rendered in one test stays in the DOM for the next `it()` in the same
// file. Component tests that query by text/role need this explicit.
afterEach(() => {
  cleanup()
})
