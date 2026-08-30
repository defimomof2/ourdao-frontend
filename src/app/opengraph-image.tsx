import { ImageResponse } from 'next/og'

// public/logo.png is 512x512 (square) — the wrong shape for a link-preview
// card (1200x630). Generating one here instead of hand-authoring a raster
// asset keeps it in sync with the brand mark/colors in code (OrbitMark /
// globals.css) rather than a second, driftable copy of the logo.
export const alt = 'OurDAO — Member-Owned Lending on Stellar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0e17 0%, #1e1b4b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="160" height="160" viewBox="0 0 512 512" style={{ marginBottom: 32 }}>
          <circle cx="256" cy="256" r="170" fill="none" stroke="#818cf8" strokeWidth="4" opacity={0.55} />
          <polygon
            points="256,86 376.21,135.79 426,256 376.21,376.21 256,426 135.79,376.21 86,256 135.79,135.79"
            fill="none"
            stroke="#818cf8"
            strokeWidth="9"
            strokeLinejoin="round"
          />
          <g fill="#a5b4fc">
            <circle cx="256" cy="86" r="22" />
            <circle cx="376.21" cy="135.79" r="22" />
            <circle cx="426" cy="256" r="22" />
            <circle cx="376.21" cy="376.21" r="22" />
            <circle cx="256" cy="426" r="22" />
            <circle cx="135.79" cy="376.21" r="22" />
            <circle cx="86" cy="256" r="22" />
            <circle cx="135.79" cy="135.79" r="22" />
          </g>
          <circle cx="256" cy="256" r="48" fill="#4f46e5" />
        </svg>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: '#ffffff' }}>
          OurDAO
        </div>
        <div style={{ display: 'flex', fontSize: 32, color: '#c7d2fe', marginTop: 16 }}>
          Member-Owned Lending on Stellar
        </div>
      </div>
    ),
    { ...size }
  )
}
