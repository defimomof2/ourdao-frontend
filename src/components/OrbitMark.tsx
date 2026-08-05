'use client'

import { useId } from 'react'

/** The OurDAO logomark: a ring of member-nodes around a shared spark. */
export function OrbitMark({ className }: { className?: string }) {
  const id = useId()
  const ringGradId = `${id}-ring`
  const starGradId = `${id}-star`

  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={ringGradId} x1="86" y1="86" x2="426" y2="426" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={starGradId} x1="178" y1="178" x2="334" y2="334" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c7d2fe" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="170" fill="none" stroke={`url(#${ringGradId})`} strokeWidth="3" opacity="0.3" />
      <polygon
        points="256,86 376.21,135.79 426,256 376.21,376.21 256,426 135.79,376.21 86,256 135.79,135.79"
        fill="none"
        stroke={`url(#${ringGradId})`}
        strokeWidth="5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <g fill={`url(#${ringGradId})`}>
        <circle cx="256" cy="86" r="17" />
        <circle cx="376.21" cy="135.79" r="17" />
        <circle cx="426" cy="256" r="17" />
        <circle cx="376.21" cy="376.21" r="17" />
        <circle cx="256" cy="426" r="17" />
        <circle cx="135.79" cy="376.21" r="17" />
        <circle cx="86" cy="256" r="17" />
        <circle cx="135.79" cy="135.79" r="17" />
      </g>
      <polygon
        points="256,178 277.21,234.79 334,256 277.21,277.21 256,334 234.79,277.21 178,256 234.79,234.79"
        fill={`url(#${starGradId})`}
      />
    </svg>
  )
}
