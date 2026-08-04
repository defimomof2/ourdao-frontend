import { useState, useEffect, useSyncExternalStore } from 'react'

// PWA BeforeInstallPrompt event interface. Not part of lib.dom (it's a
// Chromium-only extension), so it's declared here and merged into
// WindowEventMap below so addEventListener('beforeinstallprompt', ...) typechecks.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

// Breakpoint definitions (following Tailwind CSS conventions)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type Breakpoint = keyof typeof breakpoints

// Hook to detect current screen size
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<Breakpoint>('lg')
  const [width, setWidth] = useState<number>(1024)

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth
      setWidth(width)
      
      if (width < breakpoints.sm) {
        setScreenSize('sm')
      } else if (width < breakpoints.md) {
        setScreenSize('md')
      } else if (width < breakpoints.lg) {
        setScreenSize('lg')
      } else if (width < breakpoints.xl) {
        setScreenSize('xl')
      } else {
        setScreenSize('2xl')
      }
    }

    // Set initial size
    updateSize()

    // Add event listener
    window.addEventListener('resize', updateSize)
    
    // Cleanup
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return { screenSize, width }
}

// Hook to check if screen is mobile
export const useIsMobile = () => {
  const { screenSize } = useScreenSize()
  return screenSize === 'sm'
}

// Hook to check if screen is tablet
export const useIsTablet = () => {
  const { screenSize } = useScreenSize()
  return screenSize === 'md'
}

// Hook to check if screen is desktop
export const useIsDesktop = () => {
  const { screenSize } = useScreenSize()
  return ['lg', 'xl', '2xl'].includes(screenSize)
}

// Responsive grid utilities
export const getResponsiveGridCols = (mobile: number, tablet: number, desktop: number): string => {
  return `grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${desktop}`
}

// Responsive spacing utilities
export const getResponsiveSpacing = (mobile: string, desktop: string): string => {
  return `${mobile} lg:${desktop}`
}

// Responsive text sizes
export const getResponsiveTextSize = (mobile: string, desktop: string): string => {
  return `${mobile} lg:${desktop}`
}

// Responsive padding/margin
export const getResponsivePadding = (mobile: string, desktop: string): string => {
  return `${mobile} lg:${desktop}`
}

// Container width utilities
export const containerWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
} as const

export type ContainerWidth = keyof typeof containerWidths

// Touch gesture utilities for mobile
export const useTouchGestures = () => {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    return { isLeftSwipe, isRightSwipe }
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}

// Responsive image utilities
export const getResponsiveImageSizes = (mobile: string, tablet: string, desktop: string): string => {
  return `(max-width: ${breakpoints.sm}px) ${mobile}, (max-width: ${breakpoints.lg}px) ${tablet}, ${desktop}`
}

// Adaptive component sizing
export const useAdaptiveSize = (baseSize: number = 16) => {
  const { width } = useScreenSize()
  
  // Scale factor based on screen width
  const scaleFactor = Math.min(Math.max(width / 1024, 0.8), 1.2)
  
  return Math.round(baseSize * scaleFactor)
}

// Responsive table utilities
export const useResponsiveTable = (columns: string[]) => {
  const { screenSize } = useScreenSize()
  
  // On mobile, show only essential columns
  const visibleColumns = screenSize === 'sm' 
    ? columns.slice(0, 2) 
    : screenSize === 'md'
    ? columns.slice(0, 3)
    : columns

  const shouldShowColumn = (columnIndex: number): boolean => {
    return columnIndex < visibleColumns.length
  }

  const getMobileCardLayout = () => screenSize === 'sm'

  return {
    visibleColumns,
    shouldShowColumn,
    getMobileCardLayout
  }
}

// Network-aware loading for mobile
interface NetworkConnection extends EventTarget {
  effectiveType?: string
}

function getConnection(): NetworkConnection | undefined {
  if (typeof navigator === 'undefined') return undefined
  const nav = navigator as Navigator & {
    connection?: NetworkConnection
    mozConnection?: NetworkConnection
    webkitConnection?: NetworkConnection
  }
  return nav.connection || nav.mozConnection || nav.webkitConnection
}

function subscribeToConnection(callback: () => void) {
  const connection = getConnection()
  if (!connection) return () => {}
  connection.addEventListener('change', callback)
  return () => connection.removeEventListener('change', callback)
}

export const useNetworkAware = () => {
  const connectionType = useSyncExternalStore(
    subscribeToConnection,
    () => getConnection()?.effectiveType || 'unknown',
    () => 'unknown'
  )
  const isSlowConnection = ['slow-2g', '2g'].includes(connectionType)

  return {
    connectionType,
    isSlowConnection,
    shouldOptimize: isSlowConnection
  }
}

// Progressive Web App utilities
function subscribeToStandaloneDisplayMode(callback: () => void) {
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

export const usePWA = () => {
  // Reading matchMedia() during render is impure; useSyncExternalStore is
  // the sanctioned way to read this kind of live external state instead.
  const isStandalone = useSyncExternalStore(
    subscribeToStandaloneDisplayMode,
    () => window.matchMedia('(display-mode: standalone)').matches,
    () => false
  )
  const [isInstallable, setIsInstallable] = useState(false)
  // display-mode doesn't flip to "standalone" within the same tab right
  // after accepting the install prompt (only on the next standalone
  // launch), so track that transition separately for immediate feedback.
  const [justInstalled, setJustInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setJustInstalled(true)
      setIsInstallable(false)
    }

    setDeferredPrompt(null)
    return outcome === 'accepted'
  }

  return {
    isInstallable,
    isInstalled: isStandalone || justInstalled,
    promptInstall
  }
}

// Responsive card layout utilities
export const useResponsiveCardLayout = () => {
  const { screenSize } = useScreenSize()

  const getCardGridClass = (itemCount: number): string => {
    if (screenSize === 'sm') {
      return 'grid-cols-1'
    } else if (screenSize === 'md') {
      return itemCount <= 2 ? 'grid-cols-2' : 'grid-cols-2'
    } else {
      return itemCount <= 2 ? 'grid-cols-2' : itemCount <= 3 ? 'grid-cols-3' : 'grid-cols-4'
    }
  }

  const getCardSize = (): 'compact' | 'normal' | 'large' => {
    if (screenSize === 'sm') return 'compact'
    if (screenSize === 'md') return 'normal'
    return 'large'
  }

  return {
    getCardGridClass,
    getCardSize
  }
}

// Modal responsive utilities
export const useResponsiveModal = () => {
  const { screenSize } = useScreenSize()

  const getModalSize = (): string => {
    if (screenSize === 'sm') {
      return 'w-full h-full m-0 rounded-none' // Fullscreen on mobile
    } else if (screenSize === 'md') {
      return 'w-11/12 max-w-lg rounded-lg'
    } else {
      return 'w-full max-w-2xl rounded-lg'
    }
  }

  const getModalPosition = (): string => {
    if (screenSize === 'sm') {
      return 'inset-0' // Fullscreen positioning
    } else {
      return 'inset-4 m-auto'
    }
  }

  const shouldUseDrawer = (): boolean => {
    return screenSize === 'sm'
  }

  return {
    getModalSize,
    getModalPosition,
    shouldUseDrawer
  }
}

// Form responsive utilities
export const useResponsiveForm = () => {
  const { screenSize } = useScreenSize()

  const getFormLayout = (): 'single-column' | 'two-column' | 'three-column' => {
    if (screenSize === 'sm') return 'single-column'
    if (screenSize === 'md') return 'two-column'
    return 'three-column'
  }

  const getFieldSpacing = (): string => {
    if (screenSize === 'sm') return 'space-y-4'
    return 'space-y-6'
  }

  const getButtonSize = (): 'sm' | 'md' | 'lg' => {
    if (screenSize === 'sm') return 'md'
    return 'lg'
  }

  return {
    getFormLayout,
    getFieldSpacing,
    getButtonSize
  }
}
