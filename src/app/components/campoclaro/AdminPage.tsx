import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { BarChart3, Check, ExternalLink, LogOut, Mail, Package, Save, Send, ShoppingBag, Trash2, UserCheck, X } from 'lucide-react'
import { Product } from './data'
import { api, Order, SiteContent } from '../../lib/api'
import { FALLBACK_SITE_CONTENT } from '../../hooks/useSiteContent'
import { TelegramStartLogin } from './TelegramStartLogin'

type AdminTab = 'orders' | 'products' | 'filters' | 'contacts' | 'newsletter'

const EMPTY_PRODUCT: Product & { active?: boolean; originalId?: string } = {
  id: '',
  name: '',
  category: '',
  description: '',
  longDescription: '',
  prices: { '1g': 0 },
  strains: [],
  thc: '',
  cbd: '',
  tags: [],
  gradient: 'linear-gradient(135deg, #1a1028 0%, #0a0f1f 60%, #050505 100%)',
  glowColor: 'rgba(214,178,94,0.12)',
  active: true,
}

const PRODUCT_PRESETS = [
  {
    label: 'Ice',
    gradient: 'linear-gradient(135deg, #071522 0%, #12384a 58%, #030608 100%)',
    glowColor: 'rgba(120,205,240,0.16)',
  },
  {
    label: 'Gold',
    gradient: 'linear-gradient(135deg, #1b1208 0%, #2d1d0c 58%, #080504 100%)',
    glowColor: 'rgba(240,201,106,0.18)',
  },
  {
    label: 'Green',
    gradient: 'linear-gradient(135deg, #061912 0%, #123525 58%, #030806 100%)',
    glowColor: 'rgba(126,220,164,0.14)',
  },
  {
    label: 'Noir',
    gradient: 'linear-gradient(135deg, #08080a 0%, #17131d 55%, #030304 100%)',
    glowColor: 'rgba(214,178,94,0.12)',
  },
  {
    label: 'Ruby',
    gradient: 'linear-gradient(135deg, #1b0609 0%, #351019 58%, #070203 100%)',
    glowColor: 'rgba(235,88,112,0.14)',
  },
  {
    label: 'Violet',
    gradient: 'linear-gradient(135deg, #120820 0%, #281640 58%, #050209 100%)',
    glowColor: 'rgba(170,126,235,0.14)',
  },
  {
    label: 'Citrus',
    gradient: 'linear-gradient(135deg, #151302 0%, #313107 58%, #050500 100%)',
    glowColor: 'rgba(220,218,93,0.14)',
  },
  {
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #03141a 0%, #0f3140 58%, #020608 100%)',
    glowColor: 'rgba(91,205,235,0.14)',
  },
]

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuovo',
  processing: 'In lavoro',
  shipped: 'In transito',
  completed: 'Completato',
  cancelled: 'Annullato',
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  new: { color: '#F0C96A', bg: 'rgba(214,178,94,0.1)', border: 'rgba(214,178,94,0.32)' },
  processing: { color: '#7DD3C7', bg: 'rgba(38,178,165,0.1)', border: 'rgba(38,178,165,0.28)' },
  shipped: { color: '#8AB4F8', bg: 'rgba(80,130,220,0.1)', border: 'rgba(80,130,220,0.28)' },
  completed: { color: '#6ECF95', bg: 'rgba(76,175,125,0.1)', border: 'rgba(76,175,125,0.28)' },
  cancelled: { color: '#E57373', bg: 'rgba(229,115,115,0.1)', border: 'rgba(229,115,115,0.28)' },
}

const panel: CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.052), rgba(255,255,255,0.018) 52%, rgba(38,178,165,0.028))',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  boxShadow: '0 18px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.055)',
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
}) {
  const common: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026))',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#F5F5F5',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.86rem',
    outline: 'none',
    padding: '10px 12px',
  }

  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 7, fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)' }}>
        {label}
      </span>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} style={{ ...common, resize: 'vertical' }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} style={common} />
      )}
    </label>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.new
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 24,
      padding: '3px 9px',
      borderRadius: 999,
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.68rem',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function AdminLogin({ onReady }: { onReady: () => void | Promise<void> }) {
  const [error, setError] = useState('')

  const devLogin = async () => {
    setError('')
    try {
      await api.devLogin()
      onReady()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev login unavailable')
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...panel, width: 'min(420px, 100%)', padding: 28, textAlign: 'center' }}>
        <UserCheck size={28} color="#D6B25E" />
        <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1.6rem', color: '#F5F5F5', margin: '16px 0 8px' }}>
          Admin
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.86rem', lineHeight: 1.6, color: 'rgba(245,245,245,0.42)', marginBottom: 22 }}>
          Apri il bot Telegram e premi Start per confermare il tuo account.
        </p>
        <TelegramStartLogin scope="admin" onAuthenticated={onReady} />
        {import.meta.env.DEV && (
          <button onClick={devLogin} style={{ marginTop: 12, width: '100%', padding: '12px 16px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontWeight: 700, cursor: 'pointer' }}>
            Dev Login
          </button>
        )}
        {error && <div style={{ marginTop: 14, color: '#E57373', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem' }}>{error}</div>}
      </div>
    </div>
  )
}

export function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState<AdminTab>('orders')
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pending: 0, newsletterSubscribers: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<(Product & { active?: boolean })[]>([])
  const [siteContent, setSiteContent] = useState<SiteContent>(FALLBACK_SITE_CONTENT)
  const [editing, setEditing] = useState<Product & { active?: boolean; originalId?: string }>(EMPTY_PRODUCT)
  const [message, setMessage] = useState('')
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [newsletterBody, setNewsletterBody] = useState('')
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'paid' | 'shipped' | 'completed' | 'meetup'>('all')

  const loadAdmin = async () => {
    const [statsData, orderData, productData, contentData] = await Promise.all([api.adminStats(), api.adminOrders(), api.adminProducts(), api.adminSiteContent()])
    setStats(statsData)
    setOrders(orderData)
    setTrackingDrafts(Object.fromEntries(orderData.map(order => [order.id, order.trackingNumber || ''])))
    setProducts(productData)
    setSiteContent(contentData)
  }

  useEffect(() => {
    api.me()
      .then(async ({ user }) => {
        if (user) {
          setAuthorized(true)
          await loadAdmin()
        }
      })
      .finally(() => setChecking(false))
  }, [])

  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products])
  const filteredOrders = useMemo(() => orders.filter(order => {
    if (orderFilter === 'all') return true
    if (orderFilter === 'paid') return order.paymentStatus === 'paid_reported' || order.paymentStatus === 'paid_confirmed'
    if (orderFilter === 'meetup') return order.delivery === 'meetup'
    return order.status === orderFilter
  }), [orders, orderFilter])

  const saveProduct = async () => {
    setMessage('')
    await api.saveSiteContent(siteContent)
    const saved = await api.saveProduct(editing)
    setMessage('Prodotto salvato')
    setEditing(saved)
    await loadAdmin()
  }

  const saveSiteContent = async () => {
    setMessage('')
    const saved = await api.saveSiteContent(siteContent)
    setSiteContent(saved)
    setMessage('Contatti salvati')
  }

  const updateInfoCard = (index: number, patch: Partial<SiteContent['infoCards'][number]>) => {
    setSiteContent(prev => ({
      ...prev,
      infoCards: prev.infoCards.map((card, i) => i === index ? { ...card, ...patch } : card),
    }))
  }

  const updateContact = (index: number, patch: Partial<SiteContent['contacts'][number]>) => {
    setSiteContent(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => i === index ? { ...contact, ...patch } : contact),
    }))
  }

  const updateFilterName = (index: number, value: string) => {
    setSiteContent(prev => {
      const oldValue = prev.productFilters[index]
      const productFilters = prev.productFilters.map((filter, i) => i === index ? value : filter)
      setEditing(product => ({
        ...product,
        filters: (product.filters || []).map(filter => filter === oldValue ? value : filter).filter(Boolean),
      }))
      return { ...prev, productFilters }
    })
  }

  const removeFilter = (index: number) => {
    setSiteContent(prev => {
      const removed = prev.productFilters[index]
      setEditing(product => ({
        ...product,
        filters: (product.filters || []).filter(filter => filter !== removed),
      }))
      return { ...prev, productFilters: prev.productFilters.filter((_, i) => i !== index) }
    })
  }

  const toggleProductFilter = (filter: string) => {
    setEditing(product => {
      const current = product.filters || []
      return {
        ...product,
        filters: current.includes(filter)
          ? current.filter(item => item !== filter)
          : [...current, filter],
      }
    })
  }

  const deleteProduct = async (id: string) => {
    await api.deleteProduct(id)
    setEditing(EMPTY_PRODUCT)
    await loadAdmin()
  }

  const updateOrderStatus = async (id: string, status: string) => {
    await api.updateOrderStatus(id, status)
    await loadAdmin()
  }

  const quickOrderStatus = async (id: string, status: string) => {
    setMessage('')
    await api.updateOrderStatus(id, status)
    await loadAdmin()
  }

  const saveOrderTracking = async (id: string) => {
    await api.updateOrderTracking(id, trackingDrafts[id] || '')
    await loadAdmin()
  }

  const saveOrderTrackingWithProvider = async (id: string, provider: string) => {
    await api.updateOrderTracking(id, trackingDrafts[id] || '', provider)
    await loadAdmin()
  }

  const sendNewsletter = async () => {
    setMessage('')
    setNewsletterSending(true)
    try {
      const result = await api.sendNewsletter(newsletterTitle, newsletterBody)
      setMessage(`Newsletter inviata: ${result.sent}/${result.subscribers}. Errori: ${result.failed}.`)
      setNewsletterTitle('')
      setNewsletterBody('')
      await loadAdmin()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Invio newsletter non riuscito')
    } finally {
      setNewsletterSending(false)
    }
  }

  const logout = async () => {
    await api.logout()
    setAuthorized(false)
  }

  if (checking) return <div style={{ minHeight: '100vh', paddingTop: 120, textAlign: 'center', color: 'rgba(245,245,245,0.5)' }}>Loading...</div>
  if (!authorized) return <AdminLogin onReady={async () => { setAuthorized(true); await loadAdmin() }} />

  return (
    <div className="cc-admin-page" style={{ minHeight: '100vh', padding: '96px 24px 80px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 10 }}>
              Back Office
            </div>
            <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#F5F5F5', margin: 0 }}>
              CAMPOCLARO Admin
            </h1>
          </div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(245,245,245,0.65)', cursor: 'pointer' }}>
            <LogOut size={15} /> Logout
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 22 }} className="admin-stats">
          {[
            { icon: <ShoppingBag size={18} />, label: 'Ordini', value: stats.orders },
            { icon: <Package size={18} />, label: 'Prodotti', value: stats.products },
            { icon: <BarChart3 size={18} />, label: 'Ricavi', value: `€${stats.revenue}` },
            { icon: <Mail size={18} />, label: 'Newsletter', value: stats.newsletterSubscribers || 0 },
          ].map(item => (
            <div key={item.label} className="admin-stat-card" style={{ ...panel, padding: 18 }}>
              <div style={{ color: '#D6B25E', marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.35rem', color: '#F5F5F5', fontWeight: 700 }}>{item.value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div className="admin-tabs" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[
            { id: 'orders', label: 'Ordini' },
            { id: 'products', label: 'Catalogo' },
            { id: 'filters', label: 'Filtri' },
            { id: 'contacts', label: 'Contatti' },
            { id: 'newsletter', label: 'Newsletter' },
          ].map(item => (
            <button key={item.id} className="admin-tab" onClick={() => setTab(item.id as AdminTab)} style={{ padding: '9px 18px', borderRadius: 20, background: tab === item.id ? 'rgba(214,178,94,0.16)' : 'transparent', border: tab === item.id ? '1px solid rgba(214,178,94,0.55)' : '1px solid rgba(255,255,255,0.08)', color: tab === item.id ? '#F0C96A' : 'rgba(245,245,245,0.58)', cursor: 'pointer' }}>
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <motion.div className="admin-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, overflow: 'hidden' }}>
            <div style={{ position: 'sticky', top: 84, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 14px', background: 'rgba(5,5,5,0.86)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(18px)' }}>
              {[
                ['all', 'Tutti'],
                ['new', 'Nuovi'],
                ['paid', 'Pagati'],
                ['shipped', 'Spediti'],
                ['completed', 'Completati'],
                ['meetup', 'Meetup'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrderFilter(value as typeof orderFilter)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 999,
                    background: orderFilter === value ? 'rgba(214,178,94,0.14)' : 'rgba(255,255,255,0.025)',
                    border: orderFilter === value ? '1px solid rgba(214,178,94,0.42)' : '1px solid rgba(255,255,255,0.075)',
                    color: orderFilter === value ? '#D6B25E' : 'rgba(245,245,245,0.54)',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: 32, color: 'rgba(245,245,245,0.38)', fontFamily: "'Inter', sans-serif" }}>Nessun ordine.</div>
            ) : filteredOrders.map(order => (
              <div key={order.id} className="admin-list-row" style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.1fr auto', gap: 14, alignItems: 'start' }} className="admin-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#D6B25E' }}>{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.35)', fontSize: '0.76rem' }}>
                      {new Date(order.createdAt).toLocaleString('it-IT')} · {order.delivery} · {order.payment} · notifiche {order.notificationsEnabled === false ? 'off' : 'on'}
                    </div>
                    {order.courier && (
                      <div style={{ marginTop: 6, fontFamily: "'Inter', sans-serif", color: '#D6B25E', fontSize: '0.76rem' }}>
                        Corriere scelto: {order.courier}
                      </div>
                    )}
                    {order.payment === 'crypto' && order.cryptoWallet && (
                      <div style={{ marginTop: 7, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(245,245,245,0.46)', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                        {order.cryptoCurrency} {order.cryptoNetwork} · {order.paymentStatus || 'awaiting_crypto'} · {order.cryptoWallet}
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                      {order.items.map(item => (
                        <div key={`${item.id}-${item.weight}-${item.strain || 'default'}`} style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.62)', fontSize: '0.84rem', marginBottom: 4 }}>
                          {item.name} {item.weight}{item.strain ? ` · ${item.strain}` : ''} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.42)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    {order.address?.via || order.address?.city ? `${order.address.via || ''}, ${order.address.city || ''} ${order.address.cap || ''}` : 'Ritiro / dettagli privati'}
                    {order.address?.notes && <div>{order.address.notes}</div>}
                    {Number(order.fees || 0) > 0 && <div>Supplemento CCPP: €{order.fees}</div>}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={trackingDrafts[order.id] || ''}
                        onChange={e => setTrackingDrafts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        placeholder="Tracking number"
                        style={{
                          minWidth: 180,
                          flex: 1,
                          background: 'rgba(255,255,255,0.035)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          color: '#F5F5F5',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.78rem',
                          outline: 'none',
                          padding: '8px 10px',
                        }}
                      />
                      <button onClick={() => saveOrderTracking(order.id)} style={{ padding: '8px 10px', background: 'rgba(214,178,94,0.1)', border: '1px solid rgba(214,178,94,0.3)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer', fontSize: '0.75rem' }}>
                        Salva track
                      </button>
                      {['UPS', 'InPost', 'SEUR', 'GLS'].map(provider => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => saveOrderTrackingWithProvider(order.id, provider)}
                          style={{ padding: '8px 9px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(245,245,245,0.58)', cursor: 'pointer', fontSize: '0.72rem' }}
                        >
                          {provider}
                        </button>
                      ))}
                      {order.trackingUrl && (
                        <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#D6B25E', textDecoration: 'none', fontSize: '0.75rem' }}>
                          <ExternalLink size={13} /> {order.trackingProvider || 'Track'}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)} style={{ background: '#111', color: '#F5F5F5', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 10px' }}>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" title="Completato" onClick={() => quickOrderStatus(order.id, 'completed')} style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid rgba(76,175,125,0.28)', background: 'rgba(76,175,125,0.1)', color: '#6ECF95', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={15} />
                    </button>
                    <button type="button" title="Annulla" onClick={() => quickOrderStatus(order.id, 'cancelled')} style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid rgba(229,115,115,0.28)', background: 'rgba(229,115,115,0.1)', color: '#E57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={15} />
                    </button>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#D6B25E' }}>€{order.total}</div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }} className="admin-products">
            <div className="admin-product-list" style={{ ...panel, overflow: 'hidden' }}>
              <button onClick={() => setEditing(EMPTY_PRODUCT)} style={{ width: '100%', padding: 14, background: 'rgba(214,178,94,0.08)', border: 'none', color: '#D6B25E', cursor: 'pointer', textAlign: 'left' }}>
                + Nuovo prodotto
              </button>
              {sortedProducts.map(product => (
                <button key={product.id} className="admin-product-item" onClick={() => setEditing({ ...product, originalId: product.id })} style={{ width: '100%', padding: 14, background: (editing.originalId || editing.id) === product.id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#F5F5F5', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700 }}>{product.name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.34)', fontSize: '0.74rem', marginTop: 4 }}>{product.category}</div>
                </button>
              ))}
            </div>

            <div className="admin-form-panel" style={{ ...panel, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="admin-form">
                <Field label="ID prodotto" value={editing.id} onChange={v => setEditing(p => ({ ...p, id: v }))} />
                <Field label="Nome" value={editing.name} onChange={v => setEditing(p => ({ ...p, name: v }))} />
                <Field label="Categoria" value={editing.category} onChange={v => setEditing(p => ({ ...p, category: v }))} />
                <Field label="Prezzi JSON" value={JSON.stringify(editing.prices)} onChange={v => {
                  try { setEditing(p => ({ ...p, prices: JSON.parse(v) })) } catch {}
                }} />
                <Field label="Strains" value={(editing.strains || []).join(', ')} onChange={v => setEditing(p => ({ ...p, strains: v.split(',').map(s => s.trim()).filter(Boolean) }))} />
                <Field label="Card badges max 2" value={editing.tags.slice(0, 2).join(', ')} onChange={v => setEditing(p => ({ ...p, tags: v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2) }))} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 10 }}>
                    Visual preset
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10 }}>
                  {PRODUCT_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditing(p => ({ ...p, gradient: preset.gradient, glowColor: preset.glowColor }))}
                      style={{
                        minHeight: 74,
                        padding: 12,
                        background: preset.gradient,
                        border: editing.gradient === preset.gradient ? '1px solid rgba(214,178,94,0.75)' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        color: '#F5F5F5',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: editing.gradient === preset.gradient ? `0 0 30px ${preset.glowColor}` : 'none',
                      }}
                    >
                      <span style={{ display: 'block', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.92rem', marginBottom: 18 }}>
                        {preset.label}
                      </span>
                      <span style={{ display: 'block', width: 34, height: 3, borderRadius: 3, background: '#D6B25E', opacity: 0.75 }} />
                    </button>
                  ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setEditing(p => ({ ...p, active: p.active === false }))}
                    style={{
                      padding: '8px 12px',
                      background: editing.active === false ? 'rgba(229,115,115,0.08)' : 'rgba(214,178,94,0.08)',
                      border: editing.active === false ? '1px solid rgba(229,115,115,0.24)' : '1px solid rgba(214,178,94,0.24)',
                      borderRadius: 6,
                      color: editing.active === false ? '#E57373' : '#D6B25E',
                      cursor: 'pointer',
                    }}
                  >
                    {editing.active === false ? 'Nascosto' : 'Attivo'}
                  </button>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 9 }}>
                    Filtri prodotto
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {siteContent.productFilters.length === 0 ? (
                      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.34)', fontSize: '0.8rem' }}>
                        Crea prima un filtro nella sezione Contatti.
                      </div>
                    ) : siteContent.productFilters.map(filter => {
                      const selected = (editing.filters || []).includes(filter)
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => toggleProductFilter(filter)}
                          style={{
                            padding: '8px 12px',
                            background: selected ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.03)',
                            border: selected ? '1px solid rgba(214,178,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 20,
                            color: selected ? '#D6B25E' : 'rgba(245,245,245,0.5)',
                            cursor: 'pointer',
                          }}
                        >
                          {filter}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}><Field label="Descrizione breve" value={editing.description} onChange={v => setEditing(p => ({ ...p, description: v }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}><Field label="Descrizione lunga" value={editing.longDescription} onChange={v => setEditing(p => ({ ...p, longDescription: v }))} textarea /></div>
                <div style={{ gridColumn: '1 / -1', ...panel, padding: 14, background: editing.gradient }}>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>{editing.name || 'Preview prodotto'}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {editing.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ padding: '3px 8px', background: 'rgba(5,5,5,0.66)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, fontSize: '0.6rem', color: 'rgba(245,245,245,0.55)' }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.48)' }}>{editing.description || 'Descrizione breve...'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
                <button onClick={saveProduct} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'linear-gradient(135deg, #D6B25E, #F0C96A)', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                  <Save size={16} /> Salva
                </button>
                {editing.id && (
                  <button onClick={() => deleteProduct(editing.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                    <Trash2 size={16} /> Elimina
                  </button>
                )}
              </div>
              {message && <div style={{ marginTop: 14, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
            </div>
          </motion.div>
        )}

        {tab === 'filters' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 6 }}>
                  Filtri catalogo
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: 'rgba(245,245,245,0.44)', lineHeight: 1.55 }}>
                  Crea qui le categorie filtro visibili nel catalogo. Poi assegnale ai prodotti nella scheda Catalogo.
                </div>
              </div>
              <button
                onClick={() => setSiteContent(p => ({ ...p, productFilters: [...p.productFilters, `Filtro ${p.productFilters.length + 1}`] }))}
                style={{ padding: '10px 14px', background: 'rgba(214,178,94,0.1)', border: '1px solid rgba(214,178,94,0.32)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Nuovo filtro
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {siteContent.productFilters.length === 0 ? (
                <div className="admin-empty-state" style={{ padding: 24, borderRadius: 8, color: 'rgba(245,245,245,0.38)', fontFamily: "'Inter', sans-serif" }}>
                  Nessun filtro. Crea il primo filtro per organizzare il catalogo.
                </div>
              ) : siteContent.productFilters.map((filter, i) => (
                <div key={i} className="admin-contact-card admin-filter-row" style={{ ...panel, padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <Field label={`Filtro ${i + 1}`} value={filter} onChange={v => updateFilterName(i, v)} />
                  <button
                    onClick={() => removeFilter(i)}
                    style={{ height: 39, padding: '0 12px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.22)', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>

            <button onClick={saveSiteContent} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'linear-gradient(135deg, #D6B25E, #F0C96A)', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={16} /> Salva filtri
            </button>
            {message && <div style={{ marginTop: 14, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
          </motion.div>
        )}

        {tab === 'contacts' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="admin-form">
              <Field label="Titolo home" value={siteContent.welcomeTitle} onChange={v => setSiteContent(p => ({ ...p, welcomeTitle: v }))} />
              <Field label="Sottotitolo home" value={siteContent.welcomeSubtitle} onChange={v => setSiteContent(p => ({ ...p, welcomeSubtitle: v }))} />
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, marginTop: 4 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 14 }}>
                  Info sulla home
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }} className="admin-form">
                  {siteContent.infoCards.map((card, i) => (
                    <div key={i} className="admin-contact-card" style={{ ...panel, padding: 14 }}>
                      <Field label={`Titolo ${i + 1}`} value={card.title} onChange={v => updateInfoCard(i, { title: v })} />
                      <div style={{ marginTop: 12 }}>
                        <Field label={`Testo ${i + 1}`} value={card.body} onChange={v => updateInfoCard(i, { body: v })} textarea />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)' }}>
                    Filtri catalogo
                  </div>
                  <button
                    onClick={() => setSiteContent(p => ({ ...p, productFilters: [...p.productFilters, `Filtro ${p.productFilters.length + 1}`] }))}
                    style={{ padding: '8px 12px', background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.24)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer' }}
                  >
                    + Filtro
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                  {siteContent.productFilters.map((filter, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                      <Field label={`Filtro ${i + 1}`} value={filter} onChange={v => updateFilterName(i, v)} />
                      <button
                        onClick={() => removeFilter(i)}
                        style={{ height: 39, padding: '0 12px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.22)', borderRadius: 6, cursor: 'pointer' }}
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>

                <Field label="Titolo pagina contatti" value={siteContent.contactsTitle} onChange={v => setSiteContent(p => ({ ...p, contactsTitle: v }))} />
                <div style={{ marginTop: 12 }}>
                  <Field label="Intro contatti" value={siteContent.contactsIntro} onChange={v => setSiteContent(p => ({ ...p, contactsIntro: v }))} textarea />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)' }}>
                    Link contatti
                  </div>
                  <button onClick={() => setSiteContent(p => ({ ...p, contacts: [...p.contacts, { label: '', value: '', url: '' }] }))} style={{ padding: '8px 12px', background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.24)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer' }}>
                    + Link
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {siteContent.contacts.map((contact, i) => (
                    <div key={i} className="admin-contact-card" style={{ ...panel, padding: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="admin-form">
                        <Field label="Nome" value={contact.label} onChange={v => updateContact(i, { label: v })} />
                        <Field label="Testo visibile" value={contact.value} onChange={v => updateContact(i, { value: v })} />
                        <div style={{ gridColumn: '1 / -1' }}>
                          <Field label="URL" value={contact.url} onChange={v => updateContact(i, { url: v })} />
                        </div>
                      </div>
                      <button onClick={() => setSiteContent(p => ({ ...p, contacts: p.contacts.filter((_, index) => index !== i) }))} style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.22)', borderRadius: 6, cursor: 'pointer' }}>
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <button onClick={saveSiteContent} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'linear-gradient(135deg, #D6B25E, #F0C96A)', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={16} /> Salva contatti
              </button>
              {message && <div style={{ color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
            </div>
          </motion.div>
        )}

        {tab === 'newsletter' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }} className="admin-products">
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 14 }}>
                  Nuova Newsletter
                </div>
                <Field label="Titolo" value={newsletterTitle} onChange={setNewsletterTitle} />
                <div style={{ marginTop: 14 }}>
                  <Field label="Messaggio" value={newsletterBody} onChange={setNewsletterBody} textarea />
                </div>
                <button
                  type="button"
                  disabled={newsletterSending}
                  onClick={sendNewsletter}
                  style={{
                    marginTop: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #D6B25E, #F0C96A)',
                    color: '#050505',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: newsletterSending ? 'wait' : 'pointer',
                    opacity: newsletterSending ? 0.7 : 1,
                  }}
                >
                  <Send size={16} /> {newsletterSending ? 'Invio...' : 'Invia Newsletter'}
                </button>
                {message && <div style={{ marginTop: 14, color: message.includes('Errori') || message.includes('inviata') ? '#D6B25E' : '#E57373', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
              </div>

              <div style={{ ...panel, padding: 16 }}>
                <div style={{ color: '#D6B25E', marginBottom: 12 }}>
                  <Mail size={20} />
                </div>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F5F5F5', marginBottom: 8 }}>
                  Destinatari attivi
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.6rem', color: '#D6B25E', marginBottom: 10 }}>
                  {stats.newsletterSubscribers || 0}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(245,245,245,0.42)', lineHeight: 1.55 }}>
                  Il messaggio viene inviato solo agli utenti Telegram che hanno attivato Newsletter nelle impostazioni del profilo.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .admin-stats,
          .admin-row,
          .admin-products,
          .admin-filter-row,
          .admin-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
