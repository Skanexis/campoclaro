import { useEffect, useState } from 'react'

const STORAGE_KEY = 'campoclaro-notifications-enabled'

function readStoredPreference() {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === null) return true
  return value === 'true'
}

export function useNotificationPreferences() {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(readStoredPreference)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(notificationsEnabled))
  }, [notificationsEnabled])

  return {
    notificationsEnabled,
    setNotificationsEnabled: setNotificationsEnabledState,
  }
}
