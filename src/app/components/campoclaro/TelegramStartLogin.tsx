import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'

type LoginScope = 'admin' | 'customer'

export function TelegramStartLogin({
  scope,
  onAuthenticated,
  compact = false,
}: {
  scope: LoginScope
  onAuthenticated: (user?: { id: string; firstName?: string; lastName?: string; username?: string }) => void | Promise<void>
  compact?: boolean
}) {
  const [requestId, setRequestId] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState('')
  const onAuthenticatedRef = useRef(onAuthenticated)

  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated
  }, [onAuthenticated])

  useEffect(() => {
    if (!requestId) return
    let cancelled = false

    const checkStatus = async () => {
      try {
        const result = scope === 'admin'
          ? await api.pollAdminTelegramLogin(requestId)
          : await api.pollCustomerTelegramLogin(requestId)
        if (!cancelled && result.status === 'complete') {
          setRequestId('')
          setWaiting(false)
          await onAuthenticatedRef.current(result.user)
        }
      } catch (err) {
        if (!cancelled) {
          setRequestId('')
          setWaiting(false)
          setError(err instanceof Error ? err.message : 'Accesso Telegram non riuscito')
        }
      }
    }

    const interval = window.setInterval(checkStatus, 1800)
    checkStatus()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [requestId, scope])

  const openTelegram = async () => {
    setError('')
    const telegramWindow = window.open('about:blank', '_blank')
    if (telegramWindow) telegramWindow.opener = null
    try {
      const result = scope === 'admin'
        ? await api.beginAdminTelegramLogin()
        : await api.beginCustomerTelegramLogin()
      setRequestId(result.requestId)
      setWaiting(true)
      if (telegramWindow) telegramWindow.location.href = result.botUrl
      else window.location.href = result.botUrl
    } catch (err) {
      telegramWindow?.close()
      setError(err instanceof Error ? err.message : 'Accesso Telegram non disponibile')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openTelegram}
        disabled={waiting}
        style={{
          width: compact ? 'auto' : '100%',
          minHeight: compact ? 36 : 44,
          padding: compact ? '8px 13px' : '12px 16px',
          borderRadius: 6,
          border: '1px solid rgba(214,178,94,0.35)',
          background: waiting ? 'rgba(214,178,94,0.08)' : 'linear-gradient(135deg, #D6B25E, #F0C96A)',
          color: waiting ? '#D6B25E' : '#050505',
          fontFamily: "'Inter', sans-serif",
          fontSize: compact ? '0.74rem' : '0.82rem',
          fontWeight: 700,
          cursor: waiting ? 'wait' : 'pointer',
        }}
      >
        {waiting ? 'Attendo /start nel bot...' : 'Accedi tramite bot'}
      </button>
      {waiting && (
        <div style={{ marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.45)' }}>
          Apri Telegram, premi Start e torna qui.
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, color: '#E57373', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}
