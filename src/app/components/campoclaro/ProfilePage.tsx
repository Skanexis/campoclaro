import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { User, Package, Settings, ChevronRight, Clock, Check, Truck, Shield, LogOut, Fingerprint, Copy, LockKeyhole, Crown, Sparkles, ArrowLeft, RotateCcw } from 'lucide-react'
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { api, Order } from '../../lib/api'
import { CryptoPaymentModal } from './CryptoPaymentModal'
import { TelegramStartLogin } from './TelegramStartLogin'
import { useSiteContent } from '../../hooks/useSiteContent'
import { useCart } from '../../context/CartContext'

type SidebarSection = 'profile' | 'circle' | 'orders' | 'settings' | 'admin'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: ReactElement }> = {
  completed: { label: 'Completato', color: '#4CAF7D', icon: <Check size={12} /> },
  shipped: { label: 'In Transito', color: '#D6B25E', icon: <Truck size={12} /> },
  processing: { label: 'In Lavoro', color: '#D6B25E', icon: <Clock size={12} /> },
  new: { label: 'In Attesa', color: 'rgba(245,245,245,0.4)', icon: <Clock size={12} /> },
  cancelled: { label: 'Annullato', color: '#E57373', icon: <Clock size={12} /> },
}

const MEETUP_STATUS_CONFIG: Record<string, { label: string; color: string; icon: ReactElement }> = {
  new: { label: 'In Attesa', color: 'rgba(245,245,245,0.4)', icon: <Clock size={12} /> },
  processing: { label: 'Approvato', color: '#4CAF7D', icon: <Check size={12} /> },
  shipped: { label: 'Approvato', color: '#4CAF7D', icon: <Check size={12} /> },
  completed: { label: 'Approvato', color: '#4CAF7D', icon: <Check size={12} /> },
  cancelled: { label: 'Cancellato', color: '#E57373', icon: <Clock size={12} /> },
}

function TransitBadge({ label }: { label: string }) {
  return (
    <div className="transit-badge">
      <div className="transit-road">
        <div className="transit-line" />
        <Truck className="transit-truck" size={13} />
      </div>
      <span>{label}</span>
    </div>
  )
}

function OrderTimeline({ order }: { order: Order }) {
  const steps = [
    { label: 'Ordine Ricevuto', done: true },
    { label: 'Confermato', done: order.status !== 'new' && order.status !== 'cancelled' },
    { label: 'In Transito', done: order.status === 'shipped' || order.status === 'completed' },
    { label: 'Consegnato', done: order.status === 'completed' },
  ]

  return (
    <div className="profile-order-timeline" style={{ display: 'flex', gap: 0, marginTop: 16 }}>
      {steps.map((step, i) => (
        <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {i < steps.length - 1 && (
            <div style={{
              position: 'absolute',
              top: 7,
              left: '50%',
              right: '-50%',
              height: 1,
              background: step.done && steps[i + 1].done ? '#D6B25E' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          )}
          <div style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: step.done ? '#D6B25E' : 'rgba(255,255,255,0.08)',
            border: step.done ? '2px solid rgba(214,178,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
            marginBottom: 6,
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s',
          }} />
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6rem',
            letterSpacing: '0.05em',
            color: step.done ? 'rgba(245,245,245,0.5)' : 'rgba(245,245,245,0.2)',
            textAlign: 'center',
            lineHeight: 1.3,
          }}>
            {step.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function OrderPassport({ order }: { order: Order }) {
  const passportId = order.passportId || `CP-${order.id.replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase()}`
  const verificationCode = order.verificationCode || order.id.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()
  const passportValue = JSON.stringify({
    passportId,
    orderId: order.id,
    status: order.status,
    total: order.total,
  })
  const paymentLabel = order.payment === 'crypto'
    ? order.paymentStatus === 'paid_confirmed' ? 'Crypto verificato' : 'Crypto in verifica'
    : 'CCPP'

  const copyPassport = () => {
    navigator.clipboard?.writeText(`${passportId} / ${verificationCode}`).catch(() => {})
  }

  return (
    <div className="profile-passport" style={{
      marginTop: 16,
      marginBottom: 16,
      padding: 14,
      borderRadius: 9,
      border: '1px solid rgba(214,178,94,0.18)',
      background: '#0b0b0c',
      boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <Fingerprint size={16} color="#D6B25E" />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D6B25E' }}>
              Campo Passport
            </span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.92rem', color: '#F5F5F5', overflowWrap: 'anywhere', marginBottom: 7 }}>
            {passportId}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[
              { label: 'Verify', value: verificationCode },
              { label: 'Payment', value: paymentLabel },
              { label: 'Delivery', value: order.delivery === 'meetup' ? 'Meetup' : order.courier || 'Ship' },
            ].map(item => (
              <div key={item.label} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.26)', marginBottom: 3 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: item.label === 'Payment' ? '#D6B25E' : 'rgba(245,245,245,0.68)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 92, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 82, height: 82, padding: 6, borderRadius: 8, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={passportValue} size={70} bgColor="#F5F5F5" fgColor="#050505" />
          </div>
          <button
            type="button"
            onClick={copyPassport}
            title="Copia Passport"
            style={{ width: 32, height: 28, borderRadius: 6, border: '1px solid rgba(214,178,94,0.22)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Copy size={13} />
          </button>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(245,245,245,0.36)', fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', lineHeight: 1.45 }}>
        <LockKeyhole size={14} color="#D6B25E" style={{ flexShrink: 0 }} />
        Stato, pagamento e tracking restano collegati a questo ID nella tua area privata.
      </div>
    </div>
  )
}

function OrderCard({ order, onOpenPayment }: { order: Order; onOpenPayment: (order: Order) => void }) {
  const [expanded, setExpanded] = useState(false)
  const statuses = order.delivery === 'meetup' ? MEETUP_STATUS_CONFIG : STATUS_CONFIG
  const status = statuses[order.status] || statuses.new
  const paymentPending = order.payment === 'crypto' && order.paymentStatus !== 'paid_confirmed'

  return (
    <motion.div
      layout
      className="profile-order-card"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <button
        className="profile-order-header"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: '#D6B25E', marginBottom: 3 }}>
              {order.id}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.3)' }}>
              {new Date(order.createdAt).toLocaleDateString('it-IT')} · {order.delivery === 'ship' ? 'Spedizione' : 'Meetup'}
            </div>
          </div>
        </div>
        <div className="profile-order-summary" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {order.status === 'shipped' ? (
            <TransitBadge label={status.label} />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              background: `${status.color}15`,
              border: `1px solid ${status.color}30`,
              borderRadius: 20,
              color: status.color,
            }}>
              {status.icon}
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                {status.label}
              </span>
            </div>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 700, color: '#F5F5F5' }}>
            €{order.total}
          </span>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={14} color="rgba(245,245,245,0.3)" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="profile-order-details" style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <OrderPassport order={order} />
              <div style={{ paddingTop: 16, marginBottom: 12 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: 'rgba(245,245,245,0.55)' }}>
                      {item.name} · {item.weight}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: '#D6B25E' }}>
                      €{Number(item.price) * Number(item.quantity || 1)}
                    </span>
                  </div>
                ))}
                {order.delivery === 'meetup' && order.paymentDueEur != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)' }}>{order.paymentDescription || 'Acconto Meetup'}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: '#D6B25E' }}>€{order.paymentDueEur}</span>
                  </div>
                )}
              </div>
              {order.delivery !== 'meetup' && <OrderTimeline order={order} />}
              {paymentPending && (
                <button
                  type="button"
                  onClick={() => onOpenPayment(order)}
                  style={{
                    marginTop: 16,
                    padding: '10px 13px',
                    background: 'rgba(214,178,94,0.09)',
                    border: '1px solid rgba(214,178,94,0.28)',
                    borderRadius: 6,
                    color: '#D6B25E',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {order.paymentStatus === 'partially_paid' && order.cryptoRemainingEur != null
                    ? `Completa pagamento · €${order.cryptoRemainingEur}`
                    : 'Apri pagamento crypto'}
                </button>
              )}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{
                  marginTop: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  background: 'rgba(214,178,94,0.08)',
                  border: '1px solid rgba(214,178,94,0.2)',
                  borderRadius: 6,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.76rem',
                  color: '#D6B25E',
                  textDecoration: 'none',
                }}>
                  Monitora {order.trackingProvider ? `su ${order.trackingProvider}` : 'spedizione'} · {order.trackingNumber}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ProfileTelegramLogin({ onReady }: { onReady: () => Promise<void> }) {
  return (
    <div style={{ padding: '20px', background: 'rgba(214,178,94,0.04)', border: '1px solid rgba(214,178,94,0.14)', borderRadius: 8, marginBottom: 20 }}>
      <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: 6 }}>
        Accedi con Telegram
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.45)', lineHeight: 1.5, marginBottom: 14 }}>
        Apri il bot, premi Start e visualizza ordini, tracking e preferenze reali.
      </div>
      <TelegramStartLogin scope="customer" onAuthenticated={onReady} />
    </div>
  )
}

export function ProfilePage() {
  const [active, setActive] = useState<SidebarSection>('profile')
  const siteContent = useSiteContent()
  const [user, setUser] = useState<null | { id: string; username?: string; firstName?: string; role?: string; circleManualXp?: number; referralXp?: number }>(null)
  const [customerSignedIn, setCustomerSignedIn] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationPreferences()
  const [confirmOrders, setConfirmOrders] = useState(true)
  const [newsletterEnabled, setNewsletterEnabled] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [referral, setReferral] = useState({ code: '', canCreate: false, referredBy: '', referralXp: 0, discountAvailable: false, discountUsedAt: '' })
  const [friendCodeInput, setFriendCodeInput] = useState('')
  const [referralMessage, setReferralMessage] = useState('')
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const { addItem, clearCart } = useCart()
  const isAdmin = user?.role === 'admin'

  const loadDashboard = async () => {
    const [customerResult, adminResult, ordersResult, newsletterResult, referralResult] = await Promise.allSettled([
      api.customerMe(),
      api.me(),
      api.customerOrders(),
      api.newsletterPreference(),
      api.customerReferral(),
    ])
    const customer = customerResult.status === 'fulfilled' ? customerResult.value.user : null
    const admin = adminResult.status === 'fulfilled' ? adminResult.value.user : null
    setCustomerSignedIn(Boolean(customer))
    setUser(customer ? { ...customer, role: admin?.role } : admin)
    setOrders(ordersResult.status === 'fulfilled' ? ordersResult.value : [])
    setNewsletterEnabled(newsletterResult.status === 'fulfilled' ? newsletterResult.value.enabled : false)
    if (referralResult.status === 'fulfilled') setReferral(referralResult.value)
    setCheckingAuth(false)
  }

  useEffect(() => {
    let cancelled = false
    loadDashboard().catch(() => {
      if (!cancelled) {
        setUser(null)
        setCustomerSignedIn(false)
        setOrders([])
        setCheckingAuth(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const orderStats = useMemo(() => ({
    total: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    completed: orders.filter(order => order.status === 'completed').length,
    shipping: orders.filter(order => order.status === 'shipped').length,
  }), [orders])

  const circle = useMemo(() => {
    const config = siteContent.circle
    const completed = orders.filter(order => order.status === 'completed').length
    const paid = orders.filter(order => order.paymentStatus === 'paid_confirmed').length
    const totalOrders = orders.length
    const productBoost = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + Number(order.circleScoreAward || 0), 0)
    const score = completed * config.orderCompletedPoints
      + paid * config.paymentVerifiedPoints
      + (notificationsEnabled ? config.notificationsPoints : 0)
      + (totalOrders > 1 ? config.recurringCustomerPoints : 0)
      + productBoost
      + Math.max(0, Number(user?.circleManualXp || 0))
      + Math.max(0, Number(referral.referralXp || user?.referralXp || 0))
    const levels = [...config.levels].sort((a, b) => a.minScore - b.minScore)
    const current = [...levels].reverse().find(level => score >= level.minScore) || levels[0]
    const next = levels.find(level => level.minScore > score) || null
    const progress = next && current ? Math.min(100, Math.round(((score - current.minScore) / Math.max(1, next.minScore - current.minScore)) * 100)) : 100
    return { config, score, levels, current, next, progress }
  }, [orders, notificationsEnabled, siteContent.circle, user?.circleManualXp, user?.referralXp, referral.referralXp])
  const hasFastReorder = (circle.current?.perks || []).some(perk => /fast\s*reorder/i.test(perk))
  const lastOrder = orders[0]

  const repeatLastOrder = () => {
    if (!lastOrder?.items?.length) return
    clearCart()
    lastOrder.items.forEach(item => {
      addItem({
        id: String(item.productId || item.id || ''),
        name: item.name,
        weight: item.weight,
        strain: item.strain || undefined,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      })
    })
  }

  const createReferralCode = async () => {
    setReferralMessage('')
    try {
      await api.createReferralCode()
      await loadDashboard()
      setReferralMessage('Codice amico creato.')
    } catch (error) {
      setReferralMessage(error instanceof Error ? error.message : 'Codice non disponibile.')
    }
  }

  const applyReferralCode = async () => {
    setReferralMessage('')
    try {
      await api.applyReferralCode(friendCodeInput)
      setFriendCodeInput('')
      await loadDashboard()
      setReferralMessage('+60 XP e sconto 5% attivati.')
    } catch (error) {
      setReferralMessage(error instanceof Error ? error.message : 'Codice non valido.')
    }
  }

  const copyReferralCode = () => {
    if (!referral.code) return
    navigator.clipboard?.writeText(referral.code).then(() => setReferralMessage('Codice copiato.')).catch(() => {})
  }

  const toggleNewsletter = async () => {
    const next = !newsletterEnabled
    setNewsletterMessage('')
    setNewsletterEnabled(next)
    try {
      const saved = await api.saveNewsletterPreference(next)
      setNewsletterEnabled(saved.enabled)
      setNewsletterMessage(saved.enabled ? 'Newsletter attiva.' : 'Newsletter disattivata.')
    } catch (error) {
      setNewsletterEnabled(!next)
      setNewsletterMessage(error instanceof Error ? error.message : 'Accesso Telegram richiesto.')
    }
  }

  const logout = async () => {
    await api.logout()
    setActive('profile')
    setUser(null)
    setCustomerSignedIn(false)
    setOrders([])
    setNewsletterEnabled(false)
    setNewsletterMessage('')
    setReferral({ code: '', canCreate: false, referredBy: '', referralXp: 0, discountAvailable: false, discountUsedAt: '' })
    setFriendCodeInput('')
    setReferralMessage('')
    window.sessionStorage.removeItem('cc-telegram-login-customer')
    window.sessionStorage.removeItem('cc-telegram-login-admin')
  }

  const navItems = [
    { id: 'profile' as SidebarSection, label: 'Profilo', icon: <User size={16} /> },
    { id: 'orders' as SidebarSection, label: 'Ordini', icon: <Package size={16} /> },
    { id: 'settings' as SidebarSection, label: 'Impostazioni', icon: <Settings size={16} /> },
    ...(isAdmin ? [{ id: 'admin' as SidebarSection, label: 'Admin', icon: <Shield size={16} /> }] : []),
  ]

  if (checkingAuth) {
    return (
      <div className="cc-profile-page" style={{ minHeight: '100dvh', paddingTop: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '92px 18px 28px' }}>
        <div style={{ width: 'min(420px, 100%)', padding: 18, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#0b0b0c', color: 'rgba(245,245,245,0.45)', fontFamily: "'Inter', sans-serif", fontSize: '0.84rem', textAlign: 'center' }}>
          Verifica accesso...
        </div>
      </div>
    )
  }

  if (!customerSignedIn) {
    return (
      <div className="cc-profile-page" style={{ minHeight: '100dvh', paddingTop: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '92px 18px 28px' }}>
        <div style={{ width: 'min(440px, 100%)' }}>
          <ProfileTelegramLogin onReady={loadDashboard} />
        </div>
      </div>
    )
  }

  return (
    <div className="cc-profile-page" style={{ height: '100dvh', paddingTop: 72, overflow: 'hidden' }}>
      <div className="profile-container" style={{ maxWidth: 1100, height: '100%', margin: '0 auto', padding: '22px 24px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="profile-header"
          style={{ marginBottom: 18, display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}
        >
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 10 }}>
              Area Privata
            </div>
            <h1 className="profile-title" style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(1.45rem, 3vw, 2rem)', fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>
              Dashboard
            </h1>
          </div>
          {customerSignedIn && (
            <button
              className="profile-logout"
              type="button"
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(245,245,245,0.65)', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              <LogOut size={15} /> Logout
            </button>
          )}
        </motion.div>

        {/* Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 18, flex: '1 1 auto', minHeight: 0 }} className="profile-grid">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="profile-sidebar"
          >
            {/* Avatar */}
            <div style={{
              padding: '14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(214,178,94,0.1)',
                border: '1px solid rgba(214,178,94,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={16} color="#D6B25E" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5' }}>
                  {user?.firstName || user?.username || 'Utente'}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: 'rgba(245,245,245,0.3)' }}>
                  {isAdmin ? 'Admin' : 'Membro'}
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="profile-tabs" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {navItems.map(item => (
                <motion.button
                  key={item.id}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActive(item.id)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: active === item.id ? 'rgba(214,178,94,0.06)' : 'transparent',
                    border: 'none',
                    borderLeft: active === item.id ? '2px solid #D6B25E' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: active === item.id ? '#D6B25E' : 'rgba(245,245,245,0.45)',
                    transition: 'all 0.2s',
                    textAlign: 'left' as const,
                  }}
                >
                  {item.icon}
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="profile-content"
            style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain' }}
          >
            <AnimatePresence mode="wait">
              {/* PROFILE */}
              {active === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActive('circle')}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActive('circle')
                      }
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ padding: 16, borderRadius: 8, border: '1px solid rgba(214,178,94,0.18)', background: '#0b0b0c' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(214,178,94,0.12)', border: '1px solid rgba(214,178,94,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Crown size={17} color="#D6B25E" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 3 }}>
                              CAMPO Circle
                            </div>
                            <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1rem', fontWeight: 800, color: '#F5F5F5' }}>
                              {circle.current?.label || 'Guest'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.92rem', fontWeight: 800, color: '#D6B25E' }}>
                              {customerSignedIn ? circle.score : '-'} XP
                            </div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.56rem', color: 'rgba(245,245,245,0.34)' }}>
                              progresso
                            </div>
                          </div>
                          <ChevronRight size={16} color="rgba(245,245,245,0.38)" />
                        </div>
                      </div>
                      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${customerSignedIn ? circle.progress : 0}%`, height: '100%', borderRadius: 999, background: '#D6B25E' }} />
                      </div>
                      {(!notificationsEnabled || orders.length === 0) && (
                        <div style={{ display: 'grid', gap: 7 }}>
                          {!notificationsEnabled && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={event => { event.preventDefault(); event.stopPropagation(); setNotificationsEnabled(true) }}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setNotificationsEnabled(true)
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 7, background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(214,178,94,0.14)' }}
                            >
                              <span style={{ color: 'rgba(245,245,245,0.64)', fontSize: '0.76rem' }}>Attiva notifiche ordine</span>
                              <span style={{ color: '#D6B25E', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem' }}>+XP</span>
                            </div>
                          )}
                          {orders.length === 0 && (
                            <Link
                              to="/catalogo"
                              onClick={event => event.stopPropagation()}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 7, background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}
                            >
                              <span style={{ color: 'rgba(245,245,245,0.64)', fontSize: '0.76rem' }}>Completa il primo ordine</span>
                              <span style={{ color: '#D6B25E', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem' }}>+120 XP</span>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="profile-account-panel" style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 12 }}>
                      Informazioni Account
                    </div>
                    <div className="profile-account-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Username', value: user?.username ? `@${user.username}` : user?.firstName || 'Utente' },
                        { label: 'Stato', value: customerSignedIn ? (isAdmin ? 'Admin' : 'Membro Attivo') : 'Non autenticato' },
                        { label: 'Telegram ID', value: customerSignedIn ? user?.id || '-' : '-' },
                        { label: 'Ordini Totali', value: customerSignedIn ? String(orders.length) : '-' },
                      ].map(field => (
                        <div key={field.label} style={{
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 6,
                        }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.25)', marginBottom: 4 }}>
                            {field.label}
                          </div>
                          <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.84rem', color: '#F5F5F5' }}>
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="profile-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Spesa Totale', value: customerSignedIn ? `€${orderStats.total}` : '-' },
                      { label: 'Ordini Completati', value: customerSignedIn ? String(orderStats.completed) : '-' },
                      { label: 'In Transito', value: customerSignedIn ? String(orderStats.shipping) : '-' },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        style={{
                          padding: '12px',
                          background: 'rgba(214,178,94,0.04)',
                          border: '1px solid rgba(214,178,94,0.1)',
                          borderRadius: 8,
                          textAlign: 'center' as const,
                        }}
                      >
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', fontWeight: 700, color: '#D6B25E', marginBottom: 3 }}>
                          {stat.value}
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {active === 'circle' && (
                <motion.div
                  key="circle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    onClick={() => setActive('profile')}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(245,245,245,0.58)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.76rem' }}
                  >
                    <ArrowLeft size={14} /> Profilo
                  </button>
                  <div style={{ padding: 18, background: '#0b0b0c', border: '1px solid rgba(214,178,94,0.16)', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D6B25E', marginBottom: 7 }}>
                          <Crown size={18} />
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>CAMPO Circle</span>
                        </div>
                        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1.45rem', fontWeight: 800, color: '#F5F5F5' }}>
                          {circle.current?.label || 'Guest'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.35rem', fontWeight: 800, color: '#D6B25E' }}>
                          {customerSignedIn ? circle.score : '-'}
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.32)' }}>
                          Score
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 9 }}>
                      <div style={{ width: `${customerSignedIn ? circle.progress : 0}%`, height: '100%', borderRadius: 999, background: '#D6B25E' }} />
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(245,245,245,0.46)', lineHeight: 1.5 }}>
                      {circle.next
                        ? `Continua a completare ordini per raggiungere ${circle.next.label}.`
                        : 'Hai sbloccato il livello massimo.'}
                    </div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: '#F5F5F5', marginBottom: 8 }}>
                      <Sparkles size={15} color="#D6B25E" /> Privilegi attivi
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(circle.current?.perks || []).length ? circle.current?.perks.map(perk => (
                        <span key={perk} style={{ padding: '5px 8px', borderRadius: 999, background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.14)', color: '#D6B25E', fontSize: '0.68rem' }}>
                          {perk}
                        </span>
                      )) : (
                        <span style={{ color: 'rgba(245,245,245,0.36)', fontSize: '0.78rem' }}>Nessun privilegio attivo.</span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: '#F5F5F5', marginBottom: 8 }}>
                      Come salire di livello
                    </div>
                    {[
                      'Invita amici',
                      'Fai ordini regolari',
                      'Paga gli ordini con crypto',
                      'Ordini grandi: da 1 a 8 kg +10 punti/kg, oltre 8 kg +8 punti/kg',
                    ].map(item => (
                      <div key={item} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(245,245,245,0.58)', fontSize: '0.78rem', lineHeight: 1.45 }}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: '#F5F5F5', marginBottom: 4 }}>
                          Codice amico
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,245,0.42)', lineHeight: 1.45 }}>
                          Il tuo amico riceve +60 XP e 5% sul primo ordine fino a 300g. Tu ricevi +80 XP.
                        </div>
                      </div>
                      {referral.discountAvailable && (
                        <span style={{ padding: '5px 8px', borderRadius: 999, background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.14)', color: '#D6B25E', fontSize: '0.66rem', flexShrink: 0 }}>
                          Sconto 5% attivo
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="profile-account-grid">
                      <div style={{ display: 'grid', gap: 8 }}>
                        {referral.code ? (
                          <button
                            type="button"
                            onClick={copyReferralCode}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 7, border: '1px solid rgba(214,178,94,0.18)', background: 'rgba(214,178,94,0.07)', color: '#D6B25E', cursor: 'pointer' }}
                          >
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>{referral.code}</span>
                            <Copy size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={createReferralCode}
                            disabled={!referral.canCreate}
                            style={{ padding: '10px 12px', borderRadius: 7, border: referral.canCreate ? '1px solid rgba(214,178,94,0.22)' : '1px solid rgba(255,255,255,0.08)', background: referral.canCreate ? 'rgba(214,178,94,0.08)' : 'rgba(255,255,255,0.025)', color: referral.canCreate ? '#D6B25E' : 'rgba(245,245,245,0.34)', cursor: referral.canCreate ? 'pointer' : 'not-allowed', fontWeight: 800 }}
                          >
                            Crea codice
                          </button>
                        )}
                        {!referral.canCreate && !referral.code && (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(245,245,245,0.34)' }}>Disponibile dal primo livello Circle.</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <input
                          value={friendCodeInput}
                          onChange={event => setFriendCodeInput(event.target.value.toUpperCase())}
                          disabled={Boolean(referral.referredBy)}
                          placeholder={referral.referredBy ? 'Codice gia usato' : 'Inserisci codice'}
                          style={{ flex: 1, minWidth: 0, padding: '10px 11px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: '#101011', color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem' }}
                        />
                        <button
                          type="button"
                          onClick={applyReferralCode}
                          disabled={Boolean(referral.referredBy) || !friendCodeInput.trim()}
                          style={{ padding: '0 12px', borderRadius: 7, border: '1px solid rgba(214,178,94,0.2)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', cursor: referral.referredBy || !friendCodeInput.trim() ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: referral.referredBy || !friendCodeInput.trim() ? 0.5 : 1 }}
                        >
                          Usa
                        </button>
                      </div>
                    </div>
                    {referralMessage && (
                      <div style={{ marginTop: 9, fontSize: '0.74rem', color: referralMessage.includes('non') || referralMessage.includes('gia') ? '#E57373' : '#D6B25E' }}>
                        {referralMessage}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    {circle.levels.map(level => {
                      const unlocked = circle.score >= level.minScore
                      return (
                        <div key={level.id} style={{ padding: 12, borderRadius: 8, background: unlocked ? 'rgba(214,178,94,0.055)' : 'rgba(255,255,255,0.018)', border: unlocked ? '1px solid rgba(214,178,94,0.16)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: unlocked ? '#D6B25E' : 'rgba(245,245,245,0.55)' }}>
                              <Sparkles size={14} /> {level.label}
                            </div>
                            <span style={{ fontSize: '0.66rem', color: unlocked ? '#D6B25E' : 'rgba(245,245,245,0.32)' }}>
                              {unlocked ? 'Sbloccato' : 'Da sbloccare'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,245,0.42)', lineHeight: 1.45, marginBottom: 8 }}>
                            {level.description}
                          </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(level.perks || []).map(perk => (
                            <span key={perk} style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)', color: unlocked ? '#D6B25E' : 'rgba(245,245,245,0.35)', fontSize: '0.66rem' }}>
                              {perk}
                            </span>
                          ))}
                          {level.freeDeliveryAccess && !(level.perks || []).some(perk => /free\s*(delivery|shipping)|spedizione\s*gratis/i.test(perk)) && (
                            <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)', color: unlocked ? '#D6B25E' : 'rgba(245,245,245,0.35)', fontSize: '0.66rem' }}>
                              Free delivery
                            </span>
                          )}
                        </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ORDERS */}
              {active === 'orders' && (
                <motion.div
                  className="profile-orders-section"
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 12, flexShrink: 0 }}>
                    Storico Ordini
                  </div>
                  {hasFastReorder && lastOrder && (
                    <button
                      type="button"
                      onClick={repeatLastOrder}
                      style={{ marginBottom: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 12px', borderRadius: 8, border: '1px solid rgba(214,178,94,0.18)', background: 'rgba(214,178,94,0.07)', color: '#D6B25E', cursor: 'pointer' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: '0.86rem' }}>
                        <RotateCcw size={15} /> Ripeti ultimo ordine
                      </span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: 'rgba(245,245,245,0.46)' }}>
                        {lastOrder.items.length} prodotti
                      </span>
                    </button>
                  )}
                  <div className="profile-orders-list">
                    {!customerSignedIn ? (
                      <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: '0.84rem' }}>Accedi con Telegram per vedere gli ordini.</div>
                    ) : orders.length === 0 ? (
                      <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: '0.84rem' }}>Nessun ordine trovato.</div>
                    ) : orders.map(order => (
                      <OrderCard key={order.id} order={order} onOpenPayment={setPaymentOrder} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* SETTINGS */}
              {active === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="profile-settings-panel" style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 12 }}>
                      Preferenze
                    </div>
                    {[
                      {
                        label: 'Notifiche Ordini',
                        description: 'Solo aggiornamenti sul tuo ordine. Puoi disattivarle in qualsiasi momento.',
                        enabled: notificationsEnabled,
                        onToggle: () => setNotificationsEnabled(v => !v),
                      },
                      {
                        label: 'Newsletter',
                        description: 'Novità e comunicazioni inviate dal bot Telegram solo se attive.',
                        enabled: newsletterEnabled,
                        onToggle: toggleNewsletter,
                      },
                      {
                        label: 'Conferma Ordine',
                        description: 'Chiedi conferma prima di inviare ogni ordine',
                        enabled: confirmOrders,
                        onToggle: () => setConfirmOrders(v => !v),
                      },
                    ].map((setting, i) => (
                      <div
                        key={i}
                        className="profile-setting-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: '0.88rem', color: '#F5F5F5', marginBottom: 3 }}>
                            {setting.label}
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: 'rgba(245,245,245,0.35)' }}>
                            {setting.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!setting.onToggle}
                          aria-pressed={setting.enabled}
                          onClick={setting.onToggle}
                          style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          background: setting.enabled ? 'rgba(214,178,94,0.3)' : 'rgba(255,255,255,0.08)',
                          border: setting.enabled ? '1px solid rgba(214,178,94,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          position: 'relative',
                          cursor: setting.onToggle ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          opacity: setting.onToggle ? 1 : 0.55,
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: 3,
                            left: setting.enabled ? 21 : 3,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: setting.enabled ? '#D6B25E' : 'rgba(245,245,245,0.3)',
                            transition: 'left 0.2s ease, background 0.2s ease',
                          }} />
                        </button>
                      </div>
                    ))}
                    {newsletterMessage && (
                      <div style={{ marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: '0.76rem', color: newsletterMessage.includes('richiesto') ? '#E57373' : '#D6B25E' }}>
                        {newsletterMessage}
                      </div>
                    )}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <Link to="/privacy" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#D6B25E', textDecoration: 'none' }}>
                        Privacy Policy
                      </Link>
                      <Link to="/terms" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#D6B25E', textDecoration: 'none' }}>
                        Termini e Notifiche
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              {active === 'admin' && isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{
                    padding: '24px',
                    background: 'rgba(214,178,94,0.04)',
                    border: '1px solid rgba(214,178,94,0.12)',
                    borderRadius: 8,
                  }}>
                    <div style={{ color: '#D6B25E', marginBottom: 14 }}>
                      <Shield size={22} />
                    </div>
                    <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: '#F5F5F5', marginBottom: 8 }}>
                      Back Office
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: 'rgba(245,245,245,0.45)', lineHeight: 1.6, marginBottom: 18 }}>
                      Gestione ordini, catalogo, tracking e contatti ufficiali.
                    </div>
                    <Link to="/admin" style={{ textDecoration: 'none' }}>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(214,178,94,0.18)' }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '12px 18px',
                          background: '#D6B25E',
                          color: '#050505',
                          border: 'none',
                          borderRadius: 6,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Apri Admin
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <CryptoPaymentModal
        order={paymentOrder}
        open={Boolean(paymentOrder)}
        onClose={() => setPaymentOrder(null)}
        onUpdate={updated => {
          setPaymentOrder(previous => previous ? { ...previous, ...updated } : previous)
          setOrders(previous => previous.map(order => order.id === updated.id ? { ...order, ...updated } : order))
        }}
      />

      {/* Mobile: Tabs below header */}
      <style>{`
        .profile-content > div,
        .profile-content > div > div {
          min-height: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .profile-orders-section {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .profile-orders-list {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding-right: 8px;
        }
        .profile-order-card {
          margin-bottom: 8px !important;
        }
        @media (max-width: 768px) {
          .cc-profile-page {
            overflow-x: hidden;
            padding-top: 58px !important;
          }
          .profile-container {
            box-sizing: border-box;
            max-width: 100% !important;
            height: 100% !important;
            padding: 8px 10px calc(68px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .profile-header {
            align-items: flex-start !important;
            gap: 10px !important;
            margin-bottom: 8px !important;
          }
          .profile-header > div:first-child > div:first-child {
            margin-bottom: 4px !important;
            font-size: 0.58rem !important;
          }
          .profile-title {
            font-size: clamp(1.22rem, 7vw, 1.55rem) !important;
          }
          .profile-logout {
            flex-shrink: 0;
            padding: 7px 9px !important;
            font-size: 0.7rem !important;
          }
          .profile-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto minmax(0, 1fr);
            gap: 8px !important;
            min-width: 0;
          }
          .profile-sidebar {
            min-width: 0;
          }
          .profile-sidebar > div:first-child {
            display: none !important;
          }
          .profile-tabs {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100% !important;
            background: rgba(255,255,255,0.02) !important;
          }
          .profile-tabs button {
            min-width: 0;
            justify-content: center !important;
            border-left: none !important;
            border-bottom: 2px solid transparent !important;
            padding: 8px 6px !important;
          }
          .profile-tabs button span {
            font-size: 0.72rem !important;
          }
          .profile-content {
            min-width: 0;
            min-height: 0;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .profile-account-panel {
            padding: 10px !important;
            margin-bottom: 8px !important;
          }
          .profile-account-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .profile-account-grid > div {
            padding: 8px !important;
          }
          .profile-account-grid > div > div:last-child {
            overflow-wrap: anywhere;
            font-size: 0.76rem !important;
          }
          .profile-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .profile-stats > div {
            padding: 8px 5px !important;
          }
          .profile-stats > div > div:first-child {
            font-size: 0.86rem !important;
          }
          .profile-stats > div > div:last-child {
            font-size: 0.52rem !important;
          }
          .profile-order-header {
            align-items: flex-start !important;
            flex-direction: column;
            padding: 10px !important;
          }
          .profile-order-summary {
            box-sizing: border-box;
            justify-content: space-between;
            width: 100%;
            gap: 8px !important;
          }
          .profile-order-details {
            padding: 0 10px 10px !important;
          }
          .profile-order-details a {
            box-sizing: border-box;
            max-width: 100%;
            overflow-wrap: anywhere;
          }
          .profile-order-timeline {
            gap: 4px !important;
          }
          .profile-settings-panel {
            padding: 10px !important;
          }
          .profile-setting-row {
            gap: 10px;
            padding: 8px 0 !important;
          }
          .profile-setting-row > div:first-child {
            min-width: 0;
          }
          .profile-setting-row > div:first-child > div:first-child {
            font-size: 0.8rem !important;
          }
          .profile-setting-row > div:first-child > div:last-child {
            font-size: 0.66rem !important;
            line-height: 1.35 !important;
          }
        }
        @media (max-width: 340px) {
          .profile-account-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-tabs button span {
            display: none;
          }
        }
        .transit-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 11px 4px 7px;
          border-radius: 20px;
          color: #D6B25E;
          background: rgba(214,178,94,0.09);
          border: 1px solid rgba(214,178,94,0.32);
          box-shadow: 0 0 22px rgba(214,178,94,0.08);
          overflow: hidden;
        }
        .transit-badge span {
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .transit-road {
          position: relative;
          width: 34px;
          height: 16px;
          overflow: hidden;
        }
        .transit-line {
          position: absolute;
          left: 1px;
          right: 1px;
          bottom: 2px;
          height: 1px;
          background: rgba(214,178,94,0.28);
          animation: roadMove 0.55s linear infinite;
        }
        .transit-truck {
          position: absolute;
          left: 9px;
          top: 1px;
          color: #D6B25E;
          filter: drop-shadow(0 0 5px rgba(214,178,94,0.45));
          animation: truckBob 0.7s ease-in-out infinite;
        }
        @keyframes roadMove {
          from { transform: translateX(0); }
          to { transform: translateX(-9px); }
        }
        @keyframes truckBob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-2px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
