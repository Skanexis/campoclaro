import { useEffect, useRef, useState } from 'react'
import { api, type TelegramLoginStart } from '../../lib/api'

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
  const storageKey = `cc-telegram-login-${scope}`
  const [requestId, setRequestId] = useState(() => window.sessionStorage.getItem(storageKey) || '')
  const [waiting, setWaiting] = useState(() => Boolean(window.sessionStorage.getItem(storageKey)))
  const [botUrl, setBotUrl] = useState('')
  const [preparedLogin, setPreparedLogin] = useState<TelegramLoginStart | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [prepareAttempted, setPrepareAttempted] = useState(false)
  const [error, setError] = useState('')
  const onAuthenticatedRef = useRef(onAuthenticated)

  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated
  }, [onAuthenticated])

  useEffect(() => {
    if (requestId) window.sessionStorage.setItem(storageKey, requestId)
    else window.sessionStorage.removeItem(storageKey)
  }, [requestId, storageKey])

  const prepareLogin = async () => {
    setError('')
    setPreparing(true)
    setPrepareAttempted(true)
    try {
      const result = scope === 'admin'
        ? await api.beginAdminTelegramLogin()
        : await api.beginCustomerTelegramLogin()
      setPreparedLogin(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso Telegram non disponibile')
    } finally {
      setPreparing(false)
    }
  }

  useEffect(() => {
    if (requestId || preparedLogin || preparing || prepareAttempted) return
    prepareLogin()
  }, [prepareAttempted, preparedLogin, preparing, requestId, scope])

  useEffect(() => {
    if (!preparedLogin) return
    const refreshInMs = Math.max(0, new Date(preparedLogin.expiresAt).getTime() - Date.now() - 15000)
    const timeout = window.setTimeout(() => {
      setPreparedLogin(null)
      setPrepareAttempted(false)
    }, refreshInMs)
    return () => window.clearTimeout(timeout)
  }, [preparedLogin])

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
          setBotUrl('')
          await onAuthenticatedRef.current(result.user)
        }
      } catch (err) {
        if (!cancelled) {
          setRequestId('')
          setWaiting(false)
          setBotUrl('')
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

  const activateLogin = () => {
    if (!preparedLogin) return
    setError('')
    setRequestId(preparedLogin.requestId)
    setWaiting(true)
    setBotUrl(preparedLogin.botUrl)
    setPreparedLogin(null)
  }

  return (
    <div>
      {waiting ? (
        <button type="button" disabled style={{ width: compact ? 'auto' : '100%', minHeight: compact ? 36 : 44, padding: compact ? '8px 13px' : '12px 16px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.35)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: compact ? '0.74rem' : '0.82rem', fontWeight: 700, cursor: 'wait' }}>
          Attendo /start nel bot...
        </button>
      ) : preparedLogin ? (
        <a href={preparedLogin.botUrl} target="_blank" rel="noopener noreferrer" onClick={activateLogin} style={{ boxSizing: 'border-box', width: compact ? 'auto' : '100%', minHeight: compact ? 36 : 44, padding: compact ? '8px 13px' : '12px 16px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.35)', background: 'linear-gradient(135deg, #D6B25E, #F0C96A)', color: '#050505', fontFamily: "'Inter', sans-serif", fontSize: compact ? '0.74rem' : '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          Accedi tramite bot
        </a>
      ) : (
        <button type="button" onClick={prepareLogin} disabled={preparing} style={{ width: compact ? 'auto' : '100%', minHeight: compact ? 36 : 44, padding: compact ? '8px 13px' : '12px 16px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.35)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: compact ? '0.74rem' : '0.82rem', fontWeight: 700, cursor: preparing ? 'wait' : 'pointer' }}>
          {preparing ? 'Preparazione...' : 'Riprova accesso'}
        </button>
      )}
      {waiting && (
        <>
          <div style={{ marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.45)' }}>
            Premi Start nel bot, questa pagina completera automaticamente l'accesso.
          </div>
          {botUrl && (
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', marginTop: 10, padding: '7px 11px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.28)', color: '#D6B25E', textDecoration: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.74rem' }}
            >
              Apri Telegram
            </a>
          )}
        </>
      )}
      {error && (
        <div style={{ marginTop: 8, color: '#E57373', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}
