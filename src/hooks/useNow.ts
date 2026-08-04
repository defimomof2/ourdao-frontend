'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  const id = setInterval(callback, 30_000)
  return () => clearInterval(id)
}

/**
 * Wall-clock time in ms, ticking every 30s. Reading Date.now() directly
 * during render is impure (react-hooks/purity) — useSyncExternalStore is
 * the sanctioned place to read live external state instead. Returns null
 * on the server/first paint; consumers should treat that as "unknown yet".
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => Date.now(), () => null)
}
