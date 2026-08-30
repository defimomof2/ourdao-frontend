import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: false,
    // Multi-step component tests (AppShell + several re-renders per step)
    // routinely exceed the 5s default under jsdom.
    testTimeout: 15000,
  },
})
