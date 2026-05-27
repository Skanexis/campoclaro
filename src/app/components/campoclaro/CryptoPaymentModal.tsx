import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock3, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api, type CryptoPaymentOrder } from '../../lib/api'

function euro(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

function elapsedSince(createdAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 1000))
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${remainingSeconds}`
}

export function CryptoPaymentModal({
  order,
  open,
  onClose,
  onUpdate,
}: {
  order: CryptoPaymentOrder | null
  open: boolean
  onClose: () => void
  onUpdate?: (order: CryptoPaymentOrder) => void
}) {
  const [current, setCurrent] = useState<CryptoPaymentOrder | null>(order)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [txHash, setTxHash] = useState('')
  const [reporting, setReporting] = useState(false)
  const [message, setMessage] = useState('')
  const onUpdateRef = useRef(onUpdate)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    setCurrent(order)
    setMessage('')
    setTxHash('')
  }, [open, order?.id])

  useEffect(() => {
    if (!open || !current?.createdAt) return
    const update = () => setElapsed(elapsedSince(current.createdAt))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [open, current?.createdAt])

  useEffect(() => {
    if (!open || !order?.id) return
    const refresh = async () => {
      try {
        const status = await api.publicOrder(order.id)
        setCurrent(previous => previous ? { ...previous, ...status } : status)
        onUpdateRef.current?.(status)
      } catch {}
    }
    refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => window.clearInterval(interval)
  }, [open, order?.id])

  const details = useMemo(() => {
    if (!current) return null
    const expected = Number(current.cryptoExpectedAmount || 0)
    const paid = Number(current.cryptoPaidAmount || 0)
    const remaining = current.cryptoRemainingAmount || Math.max(0, expected - paid).toFixed(current.cryptoCurrency === 'BTC' ? 8 : current.cryptoCurrency === 'ETH' ? 6 : 2)
    const paidEur = current.cryptoPaidEur ?? Math.min(current.total, paid * Number(current.cryptoRateEur || 0))
    const remainingEur = current.cryptoRemainingEur ?? Math.max(0, current.total - paidEur)
    const complete = current.paymentStatus === 'paid_confirmed' || remainingEur <= 0
    const currency = current.cryptoCurrency || current.cryptoExpectedUnit || ''
    const qrValue = currency === 'BTC' && !complete
      ? `bitcoin:${current.cryptoWallet}?amount=${remaining}`
      : current.cryptoPaymentUri || current.cryptoWallet || ''
    return { expected, paid, remaining, paidEur, remainingEur, complete, currency, qrValue }
  }, [current])

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {})
    setMessage('Copiato.')
  }

  const reportPayment = async () => {
    if (!current) return
    setReporting(true)
    setMessage('')
    try {
      const updated = await api.reportCryptoPaid(current.id, txHash)
      setCurrent(updated)
      onUpdateRef.current?.(updated)
      setMessage('TX inviata. La verifica blockchain resta automatica.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossibile segnalare il pagamento.')
    } finally {
      setReporting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && current && details && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 380, background: 'rgba(0,0,0,0.76)', backdropFilter: 'blur(7px)' }}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Pagamento crypto"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="crypto-payment-modal"
            style={{
              position: 'fixed',
              zIndex: 381,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(760px, calc(100vw - 24px))',
              maxHeight: 'calc(100vh - 24px)',
              overflowY: 'auto',
              borderRadius: 14,
              border: '1px solid rgba(214,178,94,0.22)',
              background: '#0B0B0D',
              color: '#F5F5F5',
              padding: 22,
              boxSizing: 'border-box',
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", color: '#D6B25E', fontSize: '0.67rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 7 }}>Pagamento Crypto</div>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1.3rem', fontWeight: 700 }}>{details.complete ? 'Pagamento confermato' : details.paid > 0 ? 'Completa il pagamento' : 'Invia il pagamento'}</div>
                <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(245,245,245,0.4)', fontSize: '0.72rem' }}>{current.id}</div>
              </div>
              <button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', color: 'rgba(245,245,245,0.5)', cursor: 'pointer', height: 32 }}><X size={19} /></button>
            </header>

            <div className="crypto-payment-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
              <div style={{ padding: 14, background: '#fff', borderRadius: 10, alignSelf: 'start', textAlign: 'center' }}>
                {details.qrValue && <QRCodeSVG value={details.qrValue} size={190} level="M" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />}
                <div style={{ color: '#151515', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.66rem', marginTop: 10 }}>{details.currency} · {current.cryptoNetwork}</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(245,245,245,0.45)', fontFamily: "'Inter', sans-serif", fontSize: '0.73rem', marginBottom: 15 }}>
                  <Clock3 size={14} /> Tempo trascorso: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F5F5' }}>{elapsed}</span>
                </div>
                <div style={{ padding: '13px 14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: '0.67rem', color: 'rgba(245,245,245,0.38)', textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: 6 }}>Totale ordine</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.05rem', fontWeight: 700 }}>{euro(current.total)} <span style={{ color: '#D6B25E' }}>· {current.cryptoExpectedAmount} {details.currency}</span></div>
                </div>
                {details.paid > 0 && (
                  <div style={{ padding: '13px 14px', border: '1px solid rgba(110,207,149,0.18)', background: 'rgba(110,207,149,0.06)', borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: '0.67rem', color: '#6ECF95', textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: 6 }}>Ricevuto</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.92rem' }}>{euro(details.paidEur)} · {current.cryptoPaidAmount} {details.currency}</div>
                  </div>
                )}
                {!details.complete && (
                  <div style={{ padding: '13px 14px', border: '1px solid rgba(214,178,94,0.26)', background: 'rgba(214,178,94,0.08)', borderRadius: 8, marginBottom: 15 }}>
                    <div style={{ fontSize: '0.67rem', color: '#D6B25E', textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: 6 }}>{details.paid > 0 ? 'Da integrare' : 'Da inviare'}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.02rem', fontWeight: 700 }}>{euro(details.remainingEur)} · {details.remaining} {details.currency}</div>
                  </div>
                )}

                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245,245,245,0.35)', marginBottom: 6 }}>Wallet</div>
                <button type="button" onClick={() => copy(current.cryptoWallet || '')} style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '10px 11px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#F5F5F5', cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.cryptoWallet}</span><Copy size={14} />
                </button>
              </div>
            </div>

            {details.complete ? (
              <div style={{ marginTop: 18, padding: '12px 14px', border: '1px solid rgba(110,207,149,0.22)', background: 'rgba(110,207,149,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 9, color: '#6ECF95', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem' }}>
                <Check size={17} /> Pagamento rilevato e confermato automaticamente.
              </div>
            ) : (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.42)', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: 10 }}>La blockchain viene verificata automaticamente. Puoi anche comunicare il TX hash per facilitare il controllo.</div>
                <div className="crypto-tx-row" style={{ display: 'flex', gap: 8 }}>
                  <input value={txHash} onChange={event => setTxHash(event.target.value)} placeholder="TX hash (opzionale)" style={{ flex: 1, minWidth: 0, padding: '11px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#F5F5F5' }} />
                  <button type="button" disabled={reporting} onClick={reportPayment} style={{ padding: '0 16px', border: 0, borderRadius: 7, background: '#D6B25E', color: '#090909', fontWeight: 700, cursor: reporting ? 'wait' : 'pointer' }}>{reporting ? 'Invio...' : 'Segnala'}</button>
                </div>
              </div>
            )}
            {message && <div style={{ marginTop: 10, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}>{message}</div>}
            <style>{`
              @media (max-width: 620px) {
                .crypto-payment-modal { padding: 16px !important; }
                .crypto-payment-grid { grid-template-columns: 1fr !important; }
                .crypto-payment-grid > div:first-child { margin: 0 auto; }
                .crypto-tx-row { flex-direction: column; }
                .crypto-tx-row button { height: 44px; }
              }
            `}</style>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  )
}
