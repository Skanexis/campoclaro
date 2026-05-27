import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { BarChart3, Check, ExternalLink, Film, ImageIcon, LogOut, Mail, Package, Save, Send, ShoppingBag, Trash2, Upload, UserCheck, X } from 'lucide-react'
import { Product } from './data'
import { api, Order, SiteContent } from '../../lib/api'
import { FALLBACK_SITE_CONTENT } from '../../hooks/useSiteContent'
import { TelegramStartLogin } from './TelegramStartLogin'

type AdminTab = 'orders' | 'products' | 'filters' | 'contacts' | 'newsletter'
type ProductMediaKey = 'images' | 'videos'

const EMPTY_PRODUCT: Product & { active?: boolean; originalId?: string } = {
  id: '',
  name: '',
  category: '',
  description: '',
  longDescription: '',
  prices: {},
  strains: [],
  images: [],
  videos: [],
  thc: '',
  cbd: '',
  tags: [],
  gradient: 'linear-gradient(135deg, #1a1028 0%, #0a0f1f 60%, #050505 100%)',
  glowColor: 'rgba(214,178,94,0.12)',
  active: true,
}

function formatPrices(prices: Record<string, number>) {
  return Object.entries(prices).map(([weight, price]) => `${weight}: ${price}`).join(', ')
}

function parsePrices(value: string) {
  return Object.fromEntries(
    value
      .split(/[,;\n]+/)
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => {
        const match = entry.match(/^(.+?)\s*(?::|=|-|\s)\s*(?:EUR|€)?\s*(\d+(?:[.]\d+)?)\s*(?:EUR|€)?\s*$/i)
        return match ? [match[1].trim(), Number(match[2])] : null
      })
      .filter((entry): entry is [string, number] => Boolean(entry && Number.isFinite(entry[1])))
  )
}

function parseCommaList(value: string) {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
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

const MEETUP_STATUS_LABELS: Record<string, string> = {
  new: 'In attesa',
  processing: 'Approvato',
  shipped: 'Approvato',
  completed: 'Approvato',
  cancelled: 'Cancellato',
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

function StatusBadge({ status, meetup = false }: { status: string; meetup?: boolean }) {
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
      {(meetup ? MEETUP_STATUS_LABELS[status] : STATUS_LABELS[status]) || status}
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
  const [pricesInput, setPricesInput] = useState('')
  const [message, setMessage] = useState('')
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [newsletterBody, setNewsletterBody] = useState('')
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [mediaUploading, setMediaUploading] = useState<ProductMediaKey | ''>('')
  const [removedMedia, setRemovedMedia] = useState<string[]>([])
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
    if (mediaUploading) {
      setMessage('Attendi la fine del caricamento media.')
      return
    }
    if (Object.keys(editing.prices).length === 0) {
      setMessage('Inserisci i prezzi, ad esempio: 100g: 500, 500g: 2400')
      return
    }
    try {
      await api.saveSiteContent(siteContent)
      const saved = await api.saveProduct(editing)
      await Promise.all(removedMedia.map(url => api.deleteProductMedia(url).catch(() => undefined)))
      setMessage('Prodotto salvato')
      setEditing(saved)
      setPricesInput(formatPrices(saved.prices))
      setRemovedMedia([])
      await loadAdmin()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Salvataggio non riuscito')
    }
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
    await Promise.all([...(editing.images || []), ...(editing.videos || [])].map(url => api.deleteProductMedia(url).catch(() => undefined)))
    await api.deleteProduct(id)
    setEditing({ ...EMPTY_PRODUCT })
    setPricesInput('')
    setRemovedMedia([])
    await loadAdmin()
  }

  const startNewProduct = () => {
    setEditing({ ...EMPTY_PRODUCT, prices: {}, strains: [], tags: [] })
    setPricesInput('')
    setRemovedMedia([])
  }

  const selectProduct = (product: Product & { active?: boolean }) => {
    setEditing({ ...product, originalId: product.id })
    setPricesInput(formatPrices(product.prices))
    setRemovedMedia([])
  }

  const uploadProductMedia = async (files: FileList | null, key: ProductMediaKey) => {
    if (!files?.length) return
    const limit = key === 'images' ? 5 : 8
    const available = limit - (editing[key]?.length || 0)
    if (available <= 0) {
      setMessage(`Limite raggiunto: massimo ${limit} ${key === 'images' ? 'foto' : 'video'}.`)
      return
    }
    setMessage('')
    setMediaUploading(key)
    try {
      for (const file of Array.from(files).slice(0, available)) {
        const result = key === 'images' ? await api.uploadProductImage(file) : await api.uploadProductVideo(file)
        setEditing(prev => ({ ...prev, [key]: [...(prev[key] || []), result.url].slice(0, limit) }))
      }
      setMessage('Media caricati. Premi Salva per collegarli al prodotto.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Caricamento media non riuscito')
    } finally {
      setMediaUploading('')
    }
  }

  const removeProductMedia = (key: ProductMediaKey, url: string) => {
    setEditing(prev => ({ ...prev, [key]: (prev[key] || []).filter(item => item !== url) }))
    setRemovedMedia(prev => prev.includes(url) ? prev : [...prev, url])
    setMessage('Media rimosso. Premi Salva per aggiornare il prodotto.')
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
        <div className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#D6B25E', marginBottom: 10 }}>
              Back Office
            </div>
            <h1 className="admin-title" style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#F5F5F5', margin: 0 }}>
              CAMPOCLARO Admin
            </h1>
          </div>
          <button className="admin-logout" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(245,245,245,0.65)', cursor: 'pointer' }}>
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
          <motion.div className="admin-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, overflow: 'visible' }}>
            <div className="admin-order-filters" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 14px', background: 'rgba(5,5,5,0.86)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
            ) : (
              <div className="admin-orders-grid" style={{ display: 'grid', gap: 12, padding: 14 }}>
                {filteredOrders.map(order => {
                  const isMeetup = order.delivery === 'meetup'
                  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Cliente'
                  const paymentLabel = order.payment === 'crypto' ? 'Crypto' : order.payment === 'ccpp' ? 'CCPP' : isMeetup ? 'Da concordare' : order.payment
                  return (
                    <article key={order.id} className="admin-order-card" style={{ ...panel, padding: 16 }}>
                      <header className="admin-order-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.86rem', fontWeight: 700, color: '#D6B25E' }}>{order.id}</span>
                            <StatusBadge status={order.status} meetup={isMeetup} />
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.38)', fontSize: '0.74rem' }}>
                            {new Date(order.createdAt).toLocaleString('it-IT')}
                          </div>
                        </div>
                        <div className="admin-order-total" style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.34)', marginBottom: 4 }}>Totale</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.35rem', fontWeight: 700, color: '#D6B25E' }}>€{order.total}</div>
                        </div>
                      </header>

                      <div className="admin-order-tags" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                        {[isMeetup ? 'Meetup' : 'Spedizione', paymentLabel, order.notificationsEnabled === false ? 'Notifiche off' : 'Notifiche on'].map(label => (
                          <span key={label} style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,245,245,0.54)', fontFamily: "'Inter', sans-serif", fontSize: '0.68rem' }}>
                            {label}
                          </span>
                        ))}
                      </div>

                      <div className="admin-order-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: 10, marginBottom: 12 }}>
                        <section className="admin-order-info-card" style={{ padding: 12, borderRadius: 7, border: '1px solid rgba(255,255,255,0.065)', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="admin-order-label">Cliente</div>
                          <div style={{ color: '#F5F5F5', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, marginBottom: 5 }}>{customerName}</div>
                          {order.customer?.username && <div className="admin-order-muted">@{order.customer.username}</div>}
                          <div className="admin-order-muted">{order.customer?.id ? `Telegram ID: ${order.customer.id}` : 'ID Telegram non disponibile'}</div>
                        </section>

                        <section className="admin-order-info-card" style={{ padding: 12, borderRadius: 7, border: '1px solid rgba(255,255,255,0.065)', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="admin-order-label">Consegna</div>
                          <div style={{ color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', marginBottom: 5 }}>
                            {isMeetup ? 'Meetup Barcellona' : `${order.address?.via || '-'}, ${order.address?.city || '-'} ${order.address?.cap || ''}`}
                          </div>
                          {!isMeetup && order.courier && <div className="admin-order-muted">Corriere: {order.courier}</div>}
                          {order.address?.notes && <div className="admin-order-muted">Note: {order.address.notes}</div>}
                        </section>

                        <section className="admin-order-info-card" style={{ padding: 12, borderRadius: 7, border: '1px solid rgba(255,255,255,0.065)', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="admin-order-label">Prodotti</div>
                          {order.items.map(item => (
                            <div key={`${item.id}-${item.weight}-${item.strain || 'default'}`} className="admin-order-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                              <span style={{ color: 'rgba(245,245,245,0.68)', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>
                                {item.name} · {item.weight}{item.strain ? ` · ${item.strain}` : ''} x{item.quantity}
                              </span>
                              <span style={{ color: '#D6B25E', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', flexShrink: 0 }}>
                                €{Number(item.price) * Number(item.quantity || 1)}
                              </span>
                            </div>
                          ))}
                          {Number(order.fees || 0) > 0 && <div className="admin-order-muted">Supplemento CCPP: €{order.fees}</div>}
                        </section>
                      </div>

                      {order.payment === 'crypto' && order.cryptoWallet && (
                        <div className="admin-order-crypto" style={{ marginBottom: 12, padding: 10, border: '1px solid rgba(214,178,94,0.12)', borderRadius: 7, background: 'rgba(214,178,94,0.035)', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(245,245,245,0.55)', fontSize: '0.7rem', overflowWrap: 'anywhere' }}>
                          {order.cryptoCurrency} {order.cryptoNetwork} · {order.paymentStatus || 'awaiting_crypto'} · {order.cryptoWallet}
                        </div>
                      )}

                      {order.delivery !== 'meetup' && (
                        <div className="admin-tracking-panel" style={{ marginBottom: 12, padding: 12, borderRadius: 7, background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="admin-order-label">Tracking</div>
                          <div className="admin-tracking-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              value={trackingDrafts[order.id] || ''}
                              onChange={e => setTrackingDrafts(prev => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder="Tracking number"
                              style={{ minWidth: 210, flex: 1, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', outline: 'none', padding: '8px 10px' }}
                            />
                            <button onClick={() => saveOrderTracking(order.id)} style={{ padding: '8px 10px', background: 'rgba(214,178,94,0.1)', border: '1px solid rgba(214,178,94,0.3)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer', fontSize: '0.75rem' }}>Salva</button>
                            {['UPS', 'InPost', 'SEUR', 'GLS'].map(provider => (
                              <button key={provider} type="button" onClick={() => saveOrderTrackingWithProvider(order.id, provider)} style={{ padding: '8px 9px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(245,245,245,0.58)', cursor: 'pointer', fontSize: '0.72rem' }}>{provider}</button>
                            ))}
                            {order.trackingUrl && (
                              <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#D6B25E', textDecoration: 'none', fontSize: '0.75rem' }}>
                                <ExternalLink size={13} /> {order.trackingProvider || 'Track'}
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      <footer className="admin-order-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isMeetup ? (
                          <>
                            <button type="button" onClick={() => quickOrderStatus(order.id, 'processing')} style={{ padding: '9px 13px', borderRadius: 6, border: '1px solid rgba(76,175,125,0.28)', background: 'rgba(76,175,125,0.1)', color: '#6ECF95', cursor: 'pointer' }}>Approvato</button>
                            <button type="button" onClick={() => quickOrderStatus(order.id, 'cancelled')} style={{ padding: '9px 13px', borderRadius: 6, border: '1px solid rgba(229,115,115,0.28)', background: 'rgba(229,115,115,0.1)', color: '#E57373', cursor: 'pointer' }}>Cancellato</button>
                          </>
                        ) : (
                          <>
                            <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)} style={{ background: '#111', color: '#F5F5F5', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '9px 10px' }}>
                              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                            <button type="button" title="Completato" onClick={() => quickOrderStatus(order.id, 'completed')} style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid rgba(76,175,125,0.28)', background: 'rgba(76,175,125,0.1)', color: '#6ECF95', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={15} /></button>
                            <button type="button" title="Annulla" onClick={() => quickOrderStatus(order.id, 'cancelled')} style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid rgba(229,115,115,0.28)', background: 'rgba(229,115,115,0.1)', color: '#E57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                          </>
                        )}
                      </footer>
                    </article>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }} className="admin-products">
            <div className="admin-product-list" style={{ ...panel, overflow: 'hidden' }}>
              <button onClick={startNewProduct} style={{ width: '100%', padding: 14, background: 'rgba(214,178,94,0.08)', border: 'none', color: '#D6B25E', cursor: 'pointer', textAlign: 'left' }}>
                + Nuovo prodotto
              </button>
              {sortedProducts.map(product => (
                <button key={product.id} className="admin-product-item" onClick={() => selectProduct(product)} style={{ width: '100%', padding: 14, background: (editing.originalId || editing.id) === product.id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#F5F5F5', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700 }}>{product.name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.34)', fontSize: '0.74rem', marginTop: 4 }}>
                    {(product.filters || []).join(', ') || 'Senza filtri'}
                  </div>
                </button>
              ))}
            </div>

            <div className="admin-form-panel" style={{ ...panel, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="admin-form">
                <Field label="Nome" value={editing.name} onChange={v => setEditing(p => ({ ...p, name: v }))} />
                <Field label="Prezzi (es. 100g: 500, 500g: 2400)" value={pricesInput} onChange={v => {
                  setPricesInput(v)
                  setEditing(p => ({ ...p, prices: parsePrices(v) }))
                }} />
                <Field label="Strains (separati da virgola)" value={(editing.strains || []).join(', ')} onChange={v => setEditing(p => ({ ...p, strains: parseCommaList(v) }))} />
                <Field label="Card badges max 2" value={editing.tags.slice(0, 2).join(', ')} onChange={v => setEditing(p => ({ ...p, tags: v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2) }))} />
                <div style={{ gridColumn: '1 / -1', fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.36)' }}>
                  {editing.id ? `ID: ${editing.id}` : 'ID viene creato automaticamente dal nome al salvataggio.'}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 10 }}>
                    Visual preset
                  </div>
                  <div className="admin-preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 }}>
                  {PRODUCT_PRESETS.map(preset => (
                    <button
                      className="admin-preset"
                      key={preset.label}
                      type="button"
                      onClick={() => setEditing(p => ({ ...p, gradient: preset.gradient, glowColor: preset.glowColor }))}
                      style={{
                        minHeight: 54,
                        padding: 9,
                        background: preset.gradient,
                        border: editing.gradient === preset.gradient ? '1px solid rgba(214,178,94,0.75)' : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        color: '#F5F5F5',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: editing.gradient === preset.gradient ? `0 0 30px ${preset.glowColor}` : 'none',
                      }}
                    >
                      <span style={{ display: 'block', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.8rem', marginBottom: 10 }}>
                        {preset.label}
                      </span>
                      <span style={{ display: 'block', width: 24, height: 2, borderRadius: 3, background: '#D6B25E', opacity: 0.75 }} />
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
                {([
                  { key: 'images' as ProductMediaKey, label: 'Foto', limit: 5, accept: 'image/*', icon: <ImageIcon size={15} /> },
                  { key: 'videos' as ProductMediaKey, label: 'Video', limit: 8, accept: 'video/*', icon: <Film size={15} /> },
                ]).map(media => (
                  <div key={media.key} className="admin-media-block" style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, background: 'rgba(255,255,255,0.018)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.58)' }}>
                        {media.icon} {media.label} ({editing[media.key]?.length || 0}/{media.limit})
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.28)', color: '#D6B25E', cursor: mediaUploading ? 'wait' : 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.72rem' }}>
                        <Upload size={13} /> {mediaUploading === media.key ? 'Caricamento...' : 'Carica'}
                        <input
                          type="file"
                          multiple
                          accept={media.accept}
                          disabled={Boolean(mediaUploading) || (editing[media.key]?.length || 0) >= media.limit}
                          onChange={event => {
                            void uploadProductMedia(event.target.files, media.key)
                            event.currentTarget.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {(editing[media.key]?.length || 0) === 0 ? (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: 'rgba(245,245,245,0.3)' }}>Nessun file caricato.</div>
                    ) : (
                      <div className="admin-media-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 8 }}>
                        {(editing[media.key] || []).map(url => (
                          <div key={url} style={{ position: 'relative', height: 88, overflow: 'hidden', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: '#08080a' }}>
                            {media.key === 'images' ? (
                              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <button type="button" title="Rimuovi" onClick={() => removeProductMedia(media.key, url)} style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, border: '1px solid rgba(229,115,115,0.35)', background: 'rgba(5,5,5,0.8)', color: '#E57373', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                <button disabled={Boolean(mediaUploading)} onClick={saveProduct} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'linear-gradient(135deg, #D6B25E, #F0C96A)', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: mediaUploading ? 'wait' : 'pointer', opacity: mediaUploading ? 0.65 : 1 }}>
                  <Save size={16} /> {mediaUploading ? 'Caricamento...' : 'Salva'}
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
                    <div key={i} className="admin-inline-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
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
        .admin-order-label {
          margin-bottom: 5px;
          font-family: 'Inter', sans-serif;
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(245,245,245,0.34);
        }
        .admin-order-muted {
          margin-top: 3px;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          line-height: 1.35;
          color: rgba(245,245,245,0.43);
          overflow-wrap: anywhere;
        }
        .admin-order-card,
        .admin-order-card-header > div:first-child,
        .admin-order-sections,
        .admin-order-info-card,
        .admin-tracking-panel {
          min-width: 0;
        }
        .admin-order-card-header span:first-child,
        .admin-order-info-card,
        .admin-order-item > span:first-child {
          overflow-wrap: anywhere;
        }
        .admin-orders-grid {
          gap: 8px !important;
          padding: 10px !important;
        }
        .admin-order-card {
          padding: 11px !important;
        }
        .admin-order-card-header {
          gap: 10px !important;
          margin-bottom: 9px !important;
        }
        .admin-order-tags {
          gap: 5px !important;
          margin-bottom: 9px !important;
        }
        .admin-order-tags span {
          padding: 3px 7px !important;
          font-size: 0.64rem !important;
        }
        .admin-order-sections {
          gap: 7px !important;
          margin-bottom: 8px !important;
        }
        .admin-order-info-card {
          padding: 8px 9px !important;
        }
        .admin-order-item {
          margin-bottom: 4px !important;
        }
        .admin-order-crypto,
        .admin-tracking-panel {
          margin-bottom: 8px !important;
          padding: 8px !important;
        }
        .admin-order-footer {
          gap: 6px !important;
        }
        .admin-order-footer button:not([title]),
        .admin-order-footer select {
          padding-top: 7px !important;
          padding-bottom: 7px !important;
        }
        @media (max-width: 1080px) {
          .admin-order-sections {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .admin-order-sections > section:last-child {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 860px) {
          .cc-admin-page {
            padding: 84px 12px calc(82px + env(safe-area-inset-bottom, 0px)) !important;
            overflow-x: hidden;
          }
          .admin-header {
            align-items: flex-start !important;
            gap: 10px !important;
            margin-bottom: 18px !important;
          }
          .admin-title {
            font-size: clamp(1.35rem, 7.4vw, 1.8rem) !important;
            line-height: 1.15 !important;
          }
          .admin-logout {
            flex-shrink: 0;
            padding: 9px 10px !important;
            font-size: 0.76rem;
          }
          .admin-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
          }
          .admin-stat-card {
            min-height: 92px;
            padding: 12px !important;
          }
          .admin-stat-card > div:first-child {
            margin-bottom: 8px !important;
          }
          .admin-tabs {
            box-sizing: border-box;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            width: 100% !important;
            gap: 5px !important;
            margin-bottom: 14px !important;
            padding: 5px !important;
            border-radius: 12px;
            scrollbar-width: none;
          }
          .admin-tabs::-webkit-scrollbar {
            display: none;
          }
          .admin-tab {
            padding: 8px 12px !important;
            font-size: 0.76rem;
            text-align: center;
          }
          .admin-row,
          .admin-products,
          .admin-filter-row,
          .admin-form {
            grid-template-columns: 1fr !important;
          }
          .admin-list-row {
            padding: 12px !important;
          }
          .admin-orders-grid {
            padding: 6px !important;
            gap: 6px !important;
          }
          .admin-order-card {
            padding: 9px !important;
            overflow-wrap: anywhere;
          }
          .admin-order-card-header {
            gap: 6px !important;
            margin-bottom: 7px !important;
          }
          .admin-order-total > div:last-child {
            font-size: 1.1rem !important;
          }
          .admin-order-tags {
            margin-bottom: 7px !important;
          }
          .admin-order-sections {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
          .admin-order-sections > section:last-child {
            grid-column: auto;
          }
          .admin-order-info-card {
            padding: 8px !important;
          }
          .admin-order-item {
            align-items: flex-start;
          }
          .admin-tracking-panel {
            padding: 8px !important;
          }
          .admin-order-filters {
            gap: 6px !important;
            padding: 10px !important;
            flex-wrap: nowrap !important;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .admin-order-filters::-webkit-scrollbar {
            display: none;
          }
          .admin-order-filters button {
            flex: 0 0 auto;
          }
          .admin-tracking-controls {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            align-items: stretch !important;
          }
          .admin-tracking-controls input {
            grid-column: 1 / -1;
            min-width: 0 !important;
            width: 100%;
            box-sizing: border-box;
          }
          .admin-tracking-controls button {
            width: 100%;
            min-width: 0;
            padding-left: 4px !important;
            padding-right: 4px !important;
          }
          .admin-tracking-controls a {
            grid-column: 1 / -1;
            padding-top: 4px;
          }
          .admin-order-footer {
            justify-content: stretch !important;
          }
          .admin-order-footer select {
            flex: 1;
          }
          .admin-product-list {
            max-height: 38vh;
          }
        }
        @media (max-width: 560px) {
          .cc-admin-page {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .admin-order-filters {
            margin: 0 -1px;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .admin-order-footer {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .admin-order-footer select {
            grid-column: 1 / -1;
            width: 100%;
          }
          .admin-order-footer button {
            width: 100% !important;
          }
        }
        @media (max-width: 420px) {
          .admin-order-card-header {
            flex-direction: column;
          }
          .admin-order-total {
            text-align: left !important;
          }
          .admin-inline-row {
            grid-template-columns: 1fr !important;
          }
          .admin-inline-row button {
            width: 100%;
          }
        }
        @media (max-width: 340px) {
          .admin-stats {
            grid-template-columns: 1fr !important;
          }
          .admin-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  )
}
