import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { User, Package, Settings, ChevronRight, Clock, Check, Truck, Shield, LogOut } from 'lucide-react'
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { api, Order } from '../../lib/api'
import { TelegramStartLogin } from './TelegramStartLogin'

type SidebarSection = 'profile' | 'orders' | 'settings' | 'admin'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: ReactElement }> = {
  completed: { label: 'Completato', color: '#4CAF7D', icon: <Check size={12} /> },
  shipped: { label: 'In Transito', color: '#D6B25E', icon: <Truck size={12} /> },
  processing: { label: 'In Lavoro', color: '#D6B25E', icon: <Clock size={12} /> },
  new: { label: 'In Attesa', color: 'rgba(245,245,245,0.4)', icon: <Clock size={12} /> },
  cancelled: { label: 'Annullato', color: '#E57373', icon: <Clock size={12} /> },
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
    <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
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

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new

  return (
    <motion.div
      layout
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <button
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
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
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
              </div>
              <OrderTimeline order={order} />
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
  const [user, setUser] = useState<null | { id: string; username?: string; firstName?: string; role?: string }>(null)
  const [customerSignedIn, setCustomerSignedIn] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationPreferences()
  const [confirmOrders, setConfirmOrders] = useState(true)
  const [newsletterEnabled, setNewsletterEnabled] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const isAdmin = user?.role === 'admin'

  const loadDashboard = async () => {
    const [customerResult, adminResult, ordersResult, newsletterResult] = await Promise.allSettled([
      api.customerMe(),
      api.me(),
      api.customerOrders(),
      api.newsletterPreference(),
    ])
    const customer = customerResult.status === 'fulfilled' ? customerResult.value.user : null
    const admin = adminResult.status === 'fulfilled' ? adminResult.value.user : null
    setCustomerSignedIn(Boolean(customer))
    setUser(customer ? { ...customer, role: admin?.role } : admin)
    setOrders(ordersResult.status === 'fulfilled' ? ordersResult.value : [])
    setNewsletterEnabled(newsletterResult.status === 'fulfilled' ? newsletterResult.value.enabled : false)
  }

  useEffect(() => {
    let cancelled = false
    loadDashboard().catch(() => {
      if (!cancelled) {
        setUser(null)
        setCustomerSignedIn(false)
        setOrders([])
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
    window.sessionStorage.removeItem('cc-telegram-login-customer')
    window.sessionStorage.removeItem('cc-telegram-login-admin')
  }

  const navItems = [
    { id: 'profile' as SidebarSection, label: 'Profilo', icon: <User size={16} /> },
    { id: 'orders' as SidebarSection, label: 'Ordini', icon: <Package size={16} /> },
    { id: 'settings' as SidebarSection, label: 'Impostazioni', icon: <Settings size={16} /> },
    ...(isAdmin ? [{ id: 'admin' as SidebarSection, label: 'Admin', icon: <Shield size={16} /> }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', paddingTop: 72 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 40, display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16 }}
        >
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 10 }}>
              Area Privata
            </div>
            <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              Dashboard
            </h1>
          </div>
          {customerSignedIn && (
            <button
              type="button"
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(245,245,245,0.65)', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              <LogOut size={15} /> Logout
            </button>
          )}
        </motion.div>

        {/* Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }} className="profile-grid">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="profile-sidebar"
          >
            {/* Avatar */}
            <div style={{
              padding: '20px',
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
                background: 'linear-gradient(135deg, rgba(214,178,94,0.2), rgba(240,201,106,0.1))',
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
            <div style={{
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
                    padding: '13px 16px',
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
          >
            {!customerSignedIn && <ProfileTelegramLogin onReady={loadDashboard} />}
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
                  <div style={{
                    padding: '24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 20 }}>
                      Informazioni Account
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {[
                        { label: 'Username', value: user?.username ? `@${user.username}` : user?.firstName || 'Utente' },
                        { label: 'Stato', value: customerSignedIn ? (isAdmin ? 'Admin' : 'Membro Attivo') : 'Non autenticato' },
                        { label: 'Telegram ID', value: customerSignedIn ? user?.id || '-' : '-' },
                        { label: 'Ordini Totali', value: customerSignedIn ? String(orders.length) : '-' },
                      ].map(field => (
                        <div key={field.label} style={{
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 6,
                        }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.25)', marginBottom: 6 }}>
                            {field.label}
                          </div>
                          <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5' }}>
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Spesa Totale', value: customerSignedIn ? `€${orderStats.total}` : '-' },
                      { label: 'Ordini Completati', value: customerSignedIn ? String(orderStats.completed) : '-' },
                      { label: 'In Transito', value: customerSignedIn ? String(orderStats.shipping) : '-' },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        style={{
                          padding: '16px',
                          background: 'rgba(214,178,94,0.04)',
                          border: '1px solid rgba(214,178,94,0.1)',
                          borderRadius: 8,
                          textAlign: 'center' as const,
                        }}
                      >
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.2rem', fontWeight: 700, color: '#D6B25E', marginBottom: 4 }}>
                          {stat.value}
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ORDERS */}
              {active === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 20 }}>
                    Storico Ordini
                  </div>
                  {!customerSignedIn ? (
                    <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: '0.84rem' }}>Accedi con Telegram per vedere gli ordini.</div>
                  ) : orders.length === 0 ? (
                    <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: '0.84rem' }}>Nessun ordine trovato.</div>
                  ) : orders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
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
                  <div style={{
                    padding: '24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 20 }}>
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 0',
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
                    <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                          background: 'linear-gradient(135deg, #D6B25E, #F0C96A)',
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

      {/* Mobile: Tabs below header */}
      <style>{`
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-sidebar {
            display: flex !important;
            gap: 8px !important;
          }
          .profile-sidebar > div:first-child {
            display: none !important;
          }
          .profile-sidebar > div:last-child {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            background: rgba(255,255,255,0.02) !important;
          }
          .profile-sidebar > div:last-child button {
            flex: 1 !important;
            justify-content: center !important;
            border-left: none !important;
            border-bottom: 2px solid transparent !important;
          }
        }
        .transit-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 11px 4px 7px;
          border-radius: 20px;
          color: #D6B25E;
          background: linear-gradient(90deg, rgba(214,178,94,0.09), rgba(214,178,94,0.18), rgba(214,178,94,0.09));
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
          background: repeating-linear-gradient(90deg, rgba(214,178,94,0.3) 0 5px, transparent 5px 9px);
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
