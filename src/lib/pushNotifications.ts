import { useCallback, useEffect, useState } from 'react'

// Shared shapes for backend-derived notifications/activity (see
// hooks/useNotifications.ts, which maps the indexer's rows onto these).
export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface ActivityItem {
  id: string
  type: 'loan' | 'vote' | 'proposal' | 'member' | 'treasury' | 'document'
  title: string
  description: string
  timestamp: Date
  user?: string
  metadata?: Record<string, unknown>
}

/** Thin wrapper around the browser Notification API: permission state +
 *  requesting it + firing a notification. The only real (non-mock) piece of
 *  the old lib/eventListener.ts. */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported('Notification' in window)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!supported) return false

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [supported])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return null

      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      })
    },
    [permission]
  )

  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
  }
}
