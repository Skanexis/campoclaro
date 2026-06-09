import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { motion } from 'motion/react'
import { BarChart3, Check, Crown, ExternalLink, Film, ImageIcon, LogOut, Mail, Package, Save, Send, ShieldCheck, ShoppingBag, Trash2, Upload, UserCheck, X } from 'lucide-react'
import { Product } from './data'
import { api, Order, SiteContent, type AdminCustomer, type TelegramAdmin } from '../../lib/api'
import { FALLBACK_SITE_CONTENT } from '../../hooks/useSiteContent'
import { TelegramStartLogin } from './TelegramStartLogin'

type AdminTab = 'orders' | 'products' | 'users' | 'admins' | 'circle' | 'filters' | 'contacts' | 'newsletter'
type ProductMediaKey = 'images' | 'videos'
const MEDIA_MAX_BYTES: Record<ProductMediaKey, number> = {
  images: 15 * 1024 * 1024,
  videos: 250 * 1024 * 1024,
}
const MEDIA_MAX_LABEL: Record<ProductMediaKey, string> = {
  images: '15 MB',
  videos: '250 MB',
}

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
  gradient: '#0d0d0e',
  glowColor: 'rgba(214,178,94,0.12)',
  earlyDropEnabled: false,
  earlyDropDays: 2,
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
    gradient: '#0d1114',
    glowColor: 'rgba(120,205,240,0.16)',
  },
  {
    label: 'Gold',
    gradient: '#15130d',
    glowColor: 'rgba(240,201,106,0.18)',
  },
  {
    label: 'Green',
    gradient: '#0d1411',
    glowColor: 'rgba(126,220,164,0.14)',
  },
  {
    label: 'Noir',
    gradient: '#0d0d0e',
    glowColor: 'rgba(214,178,94,0.12)',
  },
  {
    label: 'Ruby',
    gradient: '#140d0f',
    glowColor: 'rgba(235,88,112,0.14)',
  },
  {
    label: 'Violet',
    gradient: '#100d14',
    glowColor: 'rgba(170,126,235,0.14)',
  },
  {
    label: 'Citrus',
    gradient: '#14140d',
    glowColor: 'rgba(220,218,93,0.14)',
  },
  {
    label: 'Ocean',
    gradient: '#0d1214',
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
  background: '#0b0b0c',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  boxShadow: '0 14px 44px rgba(0,0,0,0.28)',
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
  inputRef,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
  inputRef?: Ref<HTMLInputElement>
}) {
  const common: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#101011',
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
        <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} style={common} />
      )}
    </label>
  )
}

function AdminSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 9 }}>
      {children}
    </div>
  )
}

function AdminPanelHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow: string
  title: string
  meta?: Array<{ label: string; value: ReactNode }>
  action?: ReactNode
}) {
  return (
    <div className="admin-panel-header">
      <div>
        <div className="admin-panel-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      <div className="admin-panel-header-side">
        {meta && meta.length > 0 && (
          <div className="admin-panel-meta">
            {meta.map(item => (
              <span key={item.label}>
                <strong>{item.value}</strong>
                {item.label}
              </span>
            ))}
          </div>
        )}
        {action}
      </div>
    </div>
  )
}

function AdminFormBlock({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`admin-form-block ${className}`}>
      <AdminSectionLabel>{title}</AdminSectionLabel>
      {children}
    </section>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
  maxItems,
  showLabel = true,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  addLabel: string
  maxItems?: number
  showLabel?: boolean
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => i === index ? value : item))
  }
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }
  const addItem = () => {
    if (maxItems && items.length >= maxItems) return
    onChange([...items, ''])
  }

  return (
    <div>
      {showLabel && <AdminSectionLabel>{label}</AdminSectionLabel>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: '10px 12px', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(245,245,245,0.34)', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem' }}>
            Nessun valore.
          </div>
        ) : items.map((item, index) => (
          <div key={index} className="admin-inline-row admin-list-editor-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              value={item}
              placeholder={placeholder}
              onChange={event => updateItem(index, event.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 6, color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.86rem' }}
            />
            <button type="button" title="Rimuovi" onClick={() => removeItem(index)} style={{ width: 40, borderRadius: 6, border: '1px solid rgba(229,115,115,0.24)', background: 'rgba(229,115,115,0.08)', color: '#E57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          disabled={Boolean(maxItems && items.length >= maxItems)}
          style={{ justifySelf: 'start', padding: '8px 11px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.28)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', cursor: maxItems && items.length >= maxItems ? 'not-allowed' : 'pointer', opacity: maxItems && items.length >= maxItems ? 0.55 : 1 }}
        >
          + {addLabel}
        </button>
      </div>
    </div>
  )
}

function PriceEditor({
  prices,
  onChange,
  showLabel = true,
  resetKey,
}: {
  prices: Record<string, number>
  onChange: (prices: Record<string, number>) => void
  showLabel?: boolean
  resetKey: string
}) {
  const nextId = useRef(0)
  const makeRows = (value: Record<string, number>) => Object.entries(value).map(([weight, price], index) => ({
    id: `${resetKey}-${index}`,
    weight,
    price: Number.isFinite(price) ? String(price) : '',
  }))
  const [rows, setRowsState] = useState(() => makeRows(prices))

  useEffect(() => {
    setRowsState(makeRows(prices))
  }, [resetKey])

  const emit = (nextRows: typeof rows) => {
    onChange(Object.fromEntries(
      nextRows
        .map(row => [row.weight.trim(), Number(row.price)] as [string, number])
        .filter(([weight, price]) => weight && Number.isFinite(price))
    ))
  }

  const setRows = (nextRows: typeof rows) => {
    setRowsState(nextRows)
    emit(nextRows)
  }

  const updateRow = (index: number, field: 'weight' | 'price', value: string) => {
    setRows(rows.map((row, i) => {
      if (i !== index) return row
      return field === 'weight' ? { ...row, weight: value } : { ...row, price: value }
    }))
  }

  const addRow = (weight = '') => {
    setRows([...rows, { id: `price-draft-${nextId.current++}`, weight, price: '' }])
  }

  return (
    <div>
      {showLabel && <AdminSectionLabel>Prezzi</AdminSectionLabel>}
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '10px 12px', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(245,245,245,0.34)', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem' }}>
            Aggiungi almeno un formato e un prezzo.
          </div>
        ) : rows.map((row, index) => (
          <div key={row.id} className="admin-price-row" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(110px, 0.7fr) auto', gap: 8 }}>
            <input value={row.weight} placeholder="100g" onChange={event => updateRow(index, 'weight', event.target.value)} style={{ minWidth: 0, padding: '10px 12px', borderRadius: 6, color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.86rem' }} />
            <input type="number" min="0" step="1" value={row.price} placeholder="500" onChange={event => updateRow(index, 'price', event.target.value)} style={{ minWidth: 0, padding: '10px 12px', borderRadius: 6, color: '#F5F5F5', fontFamily: "'Inter', sans-serif", fontSize: '0.86rem' }} />
            <button type="button" title="Rimuovi" onClick={() => setRows(rows.filter((_, i) => i !== index))} style={{ width: 40, borderRadius: 6, border: '1px solid rgba(229,115,115,0.24)', background: 'rgba(229,115,115,0.08)', color: '#E57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['100g', '500g', '1kg'].map(weight => (
            <button
              key={weight}
              type="button"
              onClick={() => {
                if (rows.some(row => row.weight.trim() === weight)) return
                addRow(weight)
              }}
              style={{ padding: '8px 11px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.28)', background: 'rgba(214,178,94,0.08)', color: '#D6B25E', cursor: 'pointer' }}
            >
              + {weight}
            </button>
          ))}
          <button type="button" onClick={() => addRow()} style={{ padding: '8px 11px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'rgba(245,245,245,0.62)', cursor: 'pointer' }}>
            + Altro
          </button>
        </div>
      </div>
    </div>
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
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pending: 0, newsletterSubscribers: 0, customers: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [telegramAdmins, setTelegramAdmins] = useState<TelegramAdmin[]>([])
  const [xpDrafts, setXpDrafts] = useState<Record<string, string>>({})
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<(Product & { active?: boolean })[]>([])
  const [siteContent, setSiteContent] = useState<SiteContent>(FALLBACK_SITE_CONTENT)
  const [editing, setEditing] = useState<Product & { active?: boolean; originalId?: string }>(EMPTY_PRODUCT)
  const [pricesInput, setPricesInput] = useState('')
  const [message, setMessage] = useState('')
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [newsletterBody, setNewsletterBody] = useState('')
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [newTelegramAdminId, setNewTelegramAdminId] = useState('')
  const [mediaUploading, setMediaUploading] = useState<ProductMediaKey | ''>('')
  const [removedMedia, setRemovedMedia] = useState<string[]>([])
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'paid' | 'shipped' | 'completed' | 'meetup'>('all')
  const [priceEditorVersion, setPriceEditorVersion] = useState(0)
  const productFormRef = useRef<HTMLDivElement>(null)
  const productNameRef = useRef<HTMLInputElement>(null)

  const loadAdmin = async () => {
    const [statsData, orderData, customerData, adminData, productData, contentData] = await Promise.all([api.adminStats(), api.adminOrders(), api.adminCustomers(), api.adminTelegramAdmins(), api.adminProducts(), api.adminSiteContent()])
    setStats(statsData)
    setOrders(orderData)
    setCustomers(customerData)
    setTelegramAdmins(adminData)
    setXpDrafts(prev => Object.fromEntries(customerData.map(customer => [customer.id, prev[customer.id] ?? ''])))
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
  const visibleProducts = useMemo(() => products.filter(product => product.active !== false).length, [products])
  const hiddenProducts = products.length - visibleProducts
  const filteredOrders = useMemo(() => orders.filter(order => {
    if (orderFilter === 'all') return true
    if (orderFilter === 'paid') return order.paymentStatus === 'paid_reported' || order.paymentStatus === 'paid_confirmed'
    if (orderFilter === 'meetup') return order.delivery === 'meetup'
    return order.status === orderFilter
  }).sort((a, b) => Number(b.priorityCheckout === true) - Number(a.priorityCheckout === true)), [orders, orderFilter])

  const saveProduct = async () => {
    setMessage('')
    if (mediaUploading) {
      setMessage('Attendi la fine del caricamento media.')
      return
    }
    const cleanProduct = {
      ...editing,
      prices: Object.fromEntries(
        Object.entries(editing.prices || {})
          .map(([weight, price]) => [weight.trim(), Number(price)] as [string, number])
          .filter(([weight, price]) => weight && Number.isFinite(price))
      ),
      strains: (editing.strains || []).map(item => item.trim()).filter(Boolean),
      tags: (editing.tags || []).map(item => item.trim()).filter(Boolean).slice(0, 2),
      earlyDropEnabled: editing.earlyDropEnabled === true,
      earlyDropDays: Math.min(30, Math.max(1, Math.trunc(Number(editing.earlyDropDays || 1)))),
    }
    if (Object.keys(cleanProduct.prices).length === 0) {
      setMessage('Inserisci i prezzi, ad esempio: 100g: 500, 500g: 2400')
      return
    }
    try {
      await api.saveSiteContent(siteContent)
      const saved = await api.saveProduct(cleanProduct)
      await Promise.all(removedMedia.map(url => api.deleteProductMedia(url).catch(() => undefined)))
      setMessage('Prodotto salvato')
      setEditing(saved)
      setPricesInput(formatPrices(saved.prices))
      setRemovedMedia([])
      setPriceEditorVersion(version => version + 1)
      await loadAdmin()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Salvataggio non riuscito')
    }
  }

  const saveSiteContent = async () => {
    setMessage('')
    const saved = await api.saveSiteContent(siteContent)
    setSiteContent(saved)
    setMessage('Impostazioni salvate')
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
    setPriceEditorVersion(version => version + 1)
    await loadAdmin()
  }

  const updateCircleLevel = (index: number, patch: Partial<SiteContent['circle']['levels'][number]>) => {
    setSiteContent(prev => ({
      ...prev,
      circle: {
        ...prev.circle,
        levels: prev.circle.levels.map((level, i) => i === index ? { ...level, ...patch } : level),
      },
    }))
  }

  const updateCirclePerks = (index: number, perks: string[]) => {
    // Keep empty draft items so "+ Privilegio" can render a new input row.
    // Final cleanup happens in server normalization when content is saved.
    updateCircleLevel(index, { perks: perks.slice(0, 6) })
  }

  const startNewProduct = () => {
    setEditing({ ...EMPTY_PRODUCT, prices: {}, strains: [], tags: [], earlyDropEnabled: false, earlyDropDays: 2 })
    setPricesInput('')
    setRemovedMedia([])
    setPriceEditorVersion(version => version + 1)
    window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      productNameRef.current?.focus()
    }, 0)
  }

  const selectProduct = (product: Product & { active?: boolean }) => {
    setEditing({ ...product, originalId: product.id })
    setPricesInput(formatPrices(product.prices))
    setRemovedMedia([])
    setPriceEditorVersion(version => version + 1)
    window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
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
        if (file.size > MEDIA_MAX_BYTES[key]) {
          throw new Error(`${key === 'images' ? 'Foto' : 'Video'} troppo grande: massimo ${MEDIA_MAX_LABEL[key]} per file.`)
        }
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

  const deleteOrder = async (id: string) => {
    if (!window.confirm(`Eliminare definitivamente ordine ${id}?`)) return
    setMessage('')
    try {
      await api.deleteOrder(id)
      setMessage(`Ordine ${id} eliminato.`)
      await loadAdmin()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Eliminazione ordine non riuscita')
    }
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

  const addTelegramAdmin = async () => {
    const id = newTelegramAdminId.replace(/\D/g, '')
    if (!id) {
      setMessage('Inserisci Telegram ID numerico.')
      return
    }
    setMessage('')
    try {
      await api.addTelegramAdmin(id)
      setNewTelegramAdminId('')
      setMessage(`Admin Telegram ${id} aggiunto.`)
      await loadAdmin()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Admin non aggiunto')
    }
  }

  const deleteTelegramAdmin = async (id: string) => {
    if (!window.confirm(`Rimuovere admin Telegram ${id}?`)) return
    setMessage('')
    try {
      await api.deleteTelegramAdmin(id)
      setMessage(`Admin Telegram ${id} rimosso.`)
      await loadAdmin()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Admin non rimosso')
    }
  }

  const adjustCustomerXp = async (id: string) => {
    const delta = Math.trunc(Number(xpDrafts[id] || 0))
    if (!Number.isFinite(delta) || delta === 0) {
      setMessage('Inserisci EXP valida.')
      return
    }
    setMessage('')
    try {
      await api.adjustCustomerXp(id, delta)
      setXpDrafts(prev => ({ ...prev, [id]: '' }))
      setMessage(delta > 0 ? `EXP aggiunta: +${delta}` : `EXP aggiornata: ${delta}`)
      await loadAdmin()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Aggiornamento EXP non riuscito')
    }
  }

  const logout = async () => {
    await api.logout()
    setAuthorized(false)
  }

  const switchTab = (nextTab: AdminTab) => {
    setTab(nextTab)
    setMessage('')
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
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
            { icon: <UserCheck size={18} />, label: 'Utenti', value: stats.customers || customers.length },
            { icon: <Package size={18} />, label: 'Prodotti', value: stats.products },
            { icon: <BarChart3 size={18} />, label: 'Ricavi', value: `€${stats.revenue}` },
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
            { id: 'users', label: 'Utenti' },
            { id: 'admins', label: 'Admins' },
            { id: 'circle', label: 'Circle' },
            { id: 'filters', label: 'Filtri' },
            { id: 'contacts', label: 'Contatti' },
            { id: 'newsletter', label: 'Newsletter' },
          ].map(item => (
            <button key={item.id} className="admin-tab" onClick={() => switchTab(item.id as AdminTab)} style={{ padding: '9px 18px', borderRadius: 20, background: tab === item.id ? 'rgba(214,178,94,0.16)' : 'transparent', border: tab === item.id ? '1px solid rgba(214,178,94,0.55)' : '1px solid rgba(255,255,255,0.08)', color: tab === item.id ? '#F0C96A' : 'rgba(245,245,245,0.58)', cursor: 'pointer' }}>
              {item.label}
            </button>
          ))}
        </div>
        {message && (
          <div className="admin-action-toast">
            {message}
          </div>
        )}

        {tab === 'orders' && (
          <motion.div className="admin-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, overflow: 'visible' }}>
            <AdminPanelHeader
              eyebrow="Ordini"
              title="Vista operativa"
              meta={[
                { label: 'totali', value: orders.length },
                { label: 'visibili', value: filteredOrders.length },
                { label: 'nuovi', value: orders.filter(order => order.status === 'new').length },
                { label: 'meetup', value: orders.filter(order => order.delivery === 'meetup').length },
              ]}
            />
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
                  const paymentLabel = isMeetup && order.payment === 'crypto'
                    ? (order.paymentDescription || 'Acconto crypto Meetup')
                    : order.payment === 'crypto' ? 'Crypto' : order.payment === 'ccpp' ? 'CCPP' : order.payment
                  const cryptoPaidEur = Number(order.cryptoPaidEur || 0)
                  const paymentDueEur = Number(order.paymentDueEur ?? order.total)
                  const paymentRemainingEur = Math.max(0, paymentDueEur - cryptoPaidEur)
                  const orderRemainingEur = Math.max(0, Number(order.total || 0) - cryptoPaidEur)
                  return (
                    <article key={order.id} className="admin-order-card" style={{ ...panel, padding: 16 }}>
                      <header className="admin-order-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.86rem', fontWeight: 700, color: '#D6B25E' }}>{order.id}</span>
                            <StatusBadge status={order.status} meetup={isMeetup} />
                          </div>
                          <div style={{ color: '#F5F5F5', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, marginBottom: 5 }}>
                            {customerName}
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
                        {[order.priorityCheckout ? `Priority ${order.priorityLevel || 'Circle'}` : '', order.freeDelivery ? `Free delivery ${order.freeDeliveryLevel || ''}` : '', isMeetup ? 'Meetup' : 'Spedizione', paymentLabel, order.notificationsEnabled === false ? 'Notifiche off' : 'Notifiche on'].filter(Boolean).map(label => (
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
                          {Number(order.referralDiscount || 0) > 0 && <div className="admin-order-muted">Codice amico: -€{order.referralDiscount}</div>}
                          {Number(order.deliveryFee || 0) > 0 && <div className="admin-order-muted">Delivery: €{order.deliveryFee}</div>}
                          {Number(order.ccppFee || order.fees || 0) > 0 && <div className="admin-order-muted">Supplemento CCPP: €{order.ccppFee || order.fees}</div>}
                        </section>
                      </div>

                      {order.payment === 'crypto' && order.cryptoWallet && (
                        <div className="admin-order-crypto" style={{ marginBottom: 12, padding: 12, border: '1px solid rgba(214,178,94,0.12)', borderRadius: 7, background: 'rgba(214,178,94,0.035)', overflowWrap: 'anywhere' }}>
                          <div style={{ marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(245,245,245,0.55)', fontSize: '0.7rem' }}>
                            {order.cryptoCurrency} {order.cryptoNetwork} · {order.paymentStatus || 'awaiting_crypto'} · {order.cryptoWallet}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMeetup ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: 8 }} className="admin-payment-totals">
                            <div style={{ padding: '8px 9px', borderRadius: 6, background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.16)' }}>
                              <div className="admin-order-label">Pagato</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#6ECF95', fontWeight: 700 }}>€{cryptoPaidEur.toFixed(2)}</div>
                            </div>
                            {isMeetup && (
                              <div style={{ padding: '8px 9px', borderRadius: 6, background: 'rgba(214,178,94,0.06)', border: '1px solid rgba(214,178,94,0.16)' }}>
                                <div className="admin-order-label">Manca acconto</div>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#D6B25E', fontWeight: 700 }}>€{paymentRemainingEur.toFixed(2)}</div>
                              </div>
                            )}
                            <div style={{ padding: '8px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="admin-order-label">Saldo ordine</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F5F5', fontWeight: 700 }}>€{orderRemainingEur.toFixed(2)}</div>
                            </div>
                          </div>
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
                        <button
                          type="button"
                          title="Elimina ordine"
                          onClick={() => deleteOrder(order.id)}
                          style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid rgba(229,115,115,0.28)', background: 'rgba(229,115,115,0.1)', color: '#E57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </footer>
                    </article>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-catalog-view">
            <AdminPanelHeader
              eyebrow="Catalogo"
              title={editing.id ? editing.name : 'Nuovo prodotto'}
              meta={[
                { label: 'prodotti', value: products.length },
                { label: 'attivi', value: visibleProducts },
                { label: 'nascosti', value: hiddenProducts },
              ]}
              action={(
                <button onClick={startNewProduct} className="admin-primary-soft-button">
                  + Nuovo prodotto
                </button>
              )}
            />
            <div className="admin-products" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }}>
            <div className="admin-product-list" style={{ ...panel, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="admin-list-title">
                <span>Prodotti</span>
                <strong>{products.length}</strong>
              </div>
              <div className="admin-product-list-scroll">
                {sortedProducts.map(product => (
                  <button key={product.id} className="admin-product-item" onClick={() => selectProduct(product)} style={{ width: '100%', padding: 14, background: (editing.originalId || editing.id) === product.id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#F5F5F5', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                      <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700 }}>{product.name}</div>
                      <span style={{ flexShrink: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', color: product.active === false ? '#E57373' : '#6ECF95' }}>
                        {product.active === false ? 'Nascosto' : 'Attivo'}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.38)', fontSize: '0.72rem', marginBottom: 7 }}>
                      {(product.filters || []).join(', ') || 'Senza filtri'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(product.prices || {}).slice(0, 3).map(([weight, price]) => (
                        <span key={weight} className="admin-mini-pill">{weight} €{price}</span>
                      ))}
                      {(product.images?.length || 0) > 0 && <span className="admin-mini-pill">{product.images?.length} foto</span>}
                      {(product.videos?.length || 0) > 0 && <span className="admin-mini-pill">{product.videos?.length} video</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div ref={productFormRef} className="admin-form-panel" style={{ ...panel, padding: 18 }}>
              <div className="admin-form-layout">
                <AdminFormBlock title="Base" className="admin-form-block-wide">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end' }} className="admin-form">
                    <Field label="Nome" value={editing.name} onChange={v => setEditing(p => ({ ...p, name: v }))} inputRef={productNameRef} />
                    <button
                      type="button"
                      onClick={() => setEditing(p => ({ ...p, active: p.active === false }))}
                      style={{
                        height: 39,
                        padding: '0 12px',
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
                  <div style={{ marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.36)' }}>
                    {editing.id ? `ID: ${editing.id}` : 'ID automatico dopo il primo salvataggio'}
                  </div>
                </AdminFormBlock>

                <AdminFormBlock title="Prezzi" className="admin-price-editor">
                  <PriceEditor prices={editing.prices || {}} showLabel={false} resetKey={`${editing.originalId || editing.id || 'draft'}-${priceEditorVersion}`} onChange={prices => {
                    setEditing(p => ({ ...p, prices }))
                    setPricesInput(formatPrices(prices))
                  }} />
                </AdminFormBlock>

                <AdminFormBlock title="Varianti e badges">
                  <div style={{ display: 'grid', gap: 14 }}>
                    <ListEditor
                      label="Strains"
                      items={editing.strains || []}
                      placeholder="Zkittlez"
                      addLabel="Strain"
                      showLabel={false}
                      onChange={strains => setEditing(p => ({ ...p, strains }))}
                    />
                    <ListEditor
                      label="Card badges"
                      items={(editing.tags || []).slice(0, 2)}
                      placeholder="Premium"
                      addLabel="Badge"
                      maxItems={2}
                      showLabel={false}
                      onChange={tags => setEditing(p => ({ ...p, tags: tags.slice(0, 2) }))}
                    />
                  </div>
                </AdminFormBlock>

                <AdminFormBlock title="Aspetto" className="admin-form-block-wide">
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
                </AdminFormBlock>

                <AdminFormBlock title="Filtri catalogo" className="admin-form-block-wide">
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
                </AdminFormBlock>

                <AdminFormBlock title="Early Drop" className="admin-form-block-wide">
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 140px 1fr', gap: 10, alignItems: 'end' }} className="admin-form">
                    <button
                      type="button"
                      onClick={() => setEditing(p => ({ ...p, earlyDropEnabled: !p.earlyDropEnabled }))}
                      style={{ height: 39, padding: '0 12px', borderRadius: 6, border: editing.earlyDropEnabled ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.1)', background: editing.earlyDropEnabled ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.03)', color: editing.earlyDropEnabled ? '#D6B25E' : 'rgba(245,245,245,0.55)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      {editing.earlyDropEnabled ? 'Early Drop ON' : 'Early Drop OFF'}
                    </button>
                    <Field label="Giorni" value={String(editing.earlyDropDays || 2)} onChange={v => setEditing(p => ({ ...p, earlyDropDays: Math.min(30, Math.max(1, Number(v) || 1)) }))} />
                    <div style={{ color: 'rgba(245,245,245,0.38)', fontSize: '0.74rem', lineHeight: 1.45 }}>
                      Il prodotto sara visibile in anticipo solo ai livelli Circle con privilegio Early Drop. Telegram avvisa automaticamente gli utenti abilitati.
                    </div>
                  </div>
                </AdminFormBlock>

                <AdminFormBlock title="Descrizioni" className="admin-form-block-wide">
                  <div style={{ display: 'grid', gap: 14 }}>
                    <Field label="Descrizione breve" value={editing.description} onChange={v => setEditing(p => ({ ...p, description: v }))} />
                    <Field label="Descrizione lunga" value={editing.longDescription} onChange={v => setEditing(p => ({ ...p, longDescription: v }))} textarea />
                  </div>
                </AdminFormBlock>

                {([
                  { key: 'images' as ProductMediaKey, label: 'Foto', limit: 5, accept: 'image/*', icon: <ImageIcon size={15} /> },
                  { key: 'videos' as ProductMediaKey, label: 'Video', limit: 8, accept: 'video/*', icon: <Film size={15} /> },
                ]).map(media => (
                  <div key={media.key} className="admin-media-block admin-form-block-wide" style={{ padding: 12, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, background: 'rgba(255,255,255,0.018)' }}>
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
                    <div style={{ marginBottom: 10, fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', color: 'rgba(245,245,245,0.36)' }}>
                      Massimo {MEDIA_MAX_LABEL[media.key]} per file
                    </div>
                    {(editing[media.key]?.length || 0) === 0 ? (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: 'rgba(245,245,245,0.3)' }}>Nessun file caricato.</div>
                    ) : (
                      <div className="admin-media-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 8 }}>
                        {(editing[media.key] || []).map(url => (
                          <div key={url} style={{ position: 'relative', height: 88, overflow: 'hidden', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: '#08080a' }}>
                            {media.key === 'images' ? (
                              <img src={url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={url} muted playsInline preload="none" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <div className="admin-form-block-wide" style={{ ...panel, padding: 14, background: '#0d0d0e' }}>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>{editing.name || 'Preview prodotto'}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {editing.tags.map(tag => tag.trim()).filter(Boolean).slice(0, 2).map(tag => (
                      <span key={tag} style={{ padding: '3px 8px', background: 'rgba(5,5,5,0.66)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, fontSize: '0.6rem', color: 'rgba(245,245,245,0.55)' }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.48)' }}>{editing.description || 'Descrizione breve...'}</div>
                </div>
              </div>
              <div className="admin-product-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
                <button disabled={Boolean(mediaUploading)} onClick={saveProduct} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#D6B25E', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: mediaUploading ? 'wait' : 'pointer', opacity: mediaUploading ? 0.65 : 1 }}>
                  <Save size={16} /> {mediaUploading ? 'Caricamento...' : 'Salva'}
                </button>
                {editing.id && (
                  <button onClick={() => window.confirm(`Eliminare ${editing.name || editing.id}?`) && deleteProduct(editing.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                    <Trash2 size={16} /> Elimina
                  </button>
                )}
              </div>
              {message && <div style={{ marginTop: 14, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
            </div>
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div className="admin-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, overflow: 'visible' }}>
            <AdminPanelHeader
              eyebrow="Clienti"
              title="Utenti"
              meta={[
                { label: 'totali', value: customers.length },
                { label: 'newsletter', value: customers.filter(customer => customer.newsletterEnabled).length },
                { label: 'con ordini', value: customers.filter(customer => customer.ordersCount > 0).length },
              ]}
            />
            {customers.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: 32, color: 'rgba(245,245,245,0.38)', fontFamily: "'Inter', sans-serif" }}>
                Nessun utente trovato.
              </div>
            ) : (
              <div className="admin-users-grid" style={{ display: 'grid', gap: 10, padding: 14 }}>
                {customers.map(customer => {
                  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customer.username || 'Utente'
                  return (
                    <article key={customer.id} className="admin-user-card" style={{ ...panel, padding: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.7fr 0.8fr 1fr', gap: 12, alignItems: 'center' }} className="admin-user-row">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: '#F5F5F5', marginBottom: 4, overflowWrap: 'anywhere' }}>
                            {displayName}
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.42)', overflowWrap: 'anywhere' }}>
                            {customer.username ? `@${customer.username}` : 'Username non disponibile'} · {customer.role || 'customer'}
                          </div>
                          <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'rgba(245,245,245,0.32)', overflowWrap: 'anywhere' }}>
                            ID {customer.id}
                          </div>
                        </div>
                        <div>
                          <div className="admin-order-label">Ordini</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#D6B25E', fontWeight: 800 }}>
                            {customer.ordersCount}
                          </div>
                          <div className="admin-order-muted">{customer.completedOrders} completati</div>
                        </div>
                        <div>
                          <div className="admin-order-label">Totale</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#D6B25E', fontWeight: 800 }}>
                            €{customer.totalSpent}
                          </div>
                          <div className="admin-order-muted">{customer.newsletterEnabled ? 'Newsletter ON' : 'Newsletter OFF'}</div>
                        </div>
                        <div>
                          <div className="admin-order-label">EXP manuale</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#D6B25E', fontWeight: 800 }}>
                            {customer.manualXp || 0}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                            <input
                              type="number"
                              value={xpDrafts[customer.id] || ''}
                              onChange={event => setXpDrafts(prev => ({ ...prev, [customer.id]: event.target.value }))}
                              placeholder="+EXP"
                              style={{ width: 78, minWidth: 0, padding: '7px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#101011', color: '#F5F5F5', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => adjustCustomerXp(customer.id)}
                              style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid rgba(214,178,94,0.22)', background: 'rgba(214,178,94,0.09)', color: '#D6B25E', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                            >
                              Dai
                            </button>
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="admin-order-label">Ultimo ordine</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(245,245,245,0.68)', fontSize: '0.78rem', overflowWrap: 'anywhere' }}>
                            {customer.lastOrderId || '-'}
                          </div>
                          <div className="admin-order-muted">
                            {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleString('it-IT') : 'Nessun ordine'}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'admins' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <AdminPanelHeader
              eyebrow="Telegram"
              title="Admin IDs"
              meta={[
                { label: 'totali', value: telegramAdmins.length },
                { label: 'da pannello', value: telegramAdmins.filter(admin => admin.source === 'runtime').length },
                { label: 'da .env', value: telegramAdmins.filter(admin => admin.source === 'env').length },
              ]}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }} className="admin-products">
              <div style={{ display: 'grid', gap: 10 }}>
                {telegramAdmins.length === 0 ? (
                  <div className="admin-empty-state" style={{ padding: 24, color: 'rgba(245,245,245,0.38)', fontFamily: "'Inter', sans-serif" }}>
                    Nessun admin configurato.
                  </div>
                ) : telegramAdmins.map(admin => {
                  const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim()
                  return (
                    <article key={admin.id} className="admin-user-card" style={{ ...panel, padding: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }} className="admin-inline-row">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                            <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, color: '#F5F5F5' }}>
                              {name || admin.username || `Telegram ${admin.id}`}
                            </span>
                            <span className="admin-mini-pill">{admin.source === 'env' ? '.env' : 'pannello'}</span>
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.42)', overflowWrap: 'anywhere' }}>
                            {admin.username ? `@${admin.username} · ` : ''}ID {admin.id}
                          </div>
                          <div className="admin-order-muted">
                            Accesso pannello, bot e notifiche ordini attivi.
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={admin.source === 'env'}
                          onClick={() => deleteTelegramAdmin(admin.id)}
                          title={admin.source === 'env' ? 'Rimuovi questo ID da ADMIN_TELEGRAM_IDS nel .env' : 'Rimuovi admin'}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            border: admin.source === 'env' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(229,115,115,0.24)',
                            background: admin.source === 'env' ? 'rgba(255,255,255,0.03)' : 'rgba(229,115,115,0.08)',
                            color: admin.source === 'env' ? 'rgba(245,245,245,0.25)' : '#E57373',
                            cursor: admin.source === 'env' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div style={{ ...panel, padding: 16, alignSelf: 'start' }}>
                <div style={{ color: '#D6B25E', marginBottom: 12 }}>
                  <ShieldCheck size={20} />
                </div>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F5F5F5', marginBottom: 12 }}>
                  Aggiungi admin
                </div>
                <Field
                  label="Telegram ID"
                  value={newTelegramAdminId}
                  onChange={setNewTelegramAdminId}
                />
                <button
                  type="button"
                  onClick={addTelegramAdmin}
                  style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', padding: '12px 18px', background: '#D6B25E', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  <UserCheck size={16} /> Aggiungi
                </button>
                <div style={{ marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: '0.76rem', lineHeight: 1.55, color: 'rgba(245,245,245,0.42)' }}>
                  Inserisci l'ID numerico Telegram. Dopo l'aggiunta l'utente puo fare login tramite bot e ricevera le stesse notifiche degli admin in .env.
                </div>
                {message && <div style={{ marginTop: 14, color: message.includes('aggiunto') || message.includes('rimosso') ? '#D6B25E' : '#E57373', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'circle' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <AdminPanelHeader
              eyebrow="Retention"
              title="CAMPO Circle"
              meta={[
                { label: 'livelli', value: siteContent.circle.levels.length },
                { label: 'stato', value: siteContent.circle.enabled ? 'ON' : 'OFF' },
              ]}
              action={(
                <button
                  type="button"
                  onClick={() => setSiteContent(p => ({ ...p, circle: { ...p.circle, enabled: !p.circle.enabled } }))}
                  className="admin-primary-soft-button"
                >
                  {siteContent.circle.enabled ? 'Disattiva' : 'Attiva'}
                </button>
              )}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 18 }} className="admin-form">
              {[
                ['Ordine completato', 'orderCompletedPoints'],
                ['Pagamento verificato', 'paymentVerifiedPoints'],
                ['Notifiche attive', 'notificationsPoints'],
                ['Cliente ricorrente', 'recurringCustomerPoints'],
              ].map(([label, key]) => (
                <Field
                  key={key}
                  label={label}
                  value={String(siteContent.circle[key as keyof SiteContent['circle']] || 0)}
                  onChange={value => setSiteContent(p => ({ ...p, circle: { ...p.circle, [key]: Number(value) || 0 } }))}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)' }}>
                Livelli e privilegi
              </div>
              <button
                type="button"
                onClick={() => setSiteContent(p => ({ ...p, circle: { ...p.circle, levels: [...p.circle.levels, { id: `level-${p.circle.levels.length + 1}`, label: 'Nuovo livello', minScore: 0, description: '', perks: [], earlyDropAccess: false, freeDeliveryAccess: false, meetupDepositDiscountPct: 0 }] } }))}
                style={{ padding: '8px 12px', background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.24)', borderRadius: 6, color: '#D6B25E', cursor: 'pointer' }}
              >
                + Livello
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {siteContent.circle.levels.map((level, index) => (
                <div key={`circle-level-${index}`} className="admin-circle-level-card" style={{ ...panel, padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px auto auto auto', gap: 12, alignItems: 'end' }} className="admin-form">
                    <Field label="Nome livello" value={level.label} onChange={value => updateCircleLevel(index, { label: value })} />
                    <Field label="Score minimo" value={String(level.minScore)} onChange={value => updateCircleLevel(index, { minScore: Number(value) || 0 })} />
                    <Field
                      label="Sconto Meetup %"
                      value={String(level.meetupDepositDiscountPct || 0)}
                      onChange={value => updateCircleLevel(index, { meetupDepositDiscountPct: Math.min(100, Math.max(0, Number(value) || 0)) })}
                    />
                    <button
                      type="button"
                      onClick={() => updateCircleLevel(index, { earlyDropAccess: !level.earlyDropAccess })}
                      style={{ height: 39, padding: '0 12px', borderRadius: 6, border: level.earlyDropAccess ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.1)', background: level.earlyDropAccess ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.03)', color: level.earlyDropAccess ? '#D6B25E' : 'rgba(245,245,245,0.55)', cursor: 'pointer' }}
                    >
                      Early Drop
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCircleLevel(index, { freeDeliveryAccess: !level.freeDeliveryAccess })}
                      style={{ height: 39, padding: '0 12px', borderRadius: 6, border: level.freeDeliveryAccess ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.1)', background: level.freeDeliveryAccess ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.03)', color: level.freeDeliveryAccess ? '#D6B25E' : 'rgba(245,245,245,0.55)', cursor: 'pointer' }}
                    >
                      Free delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setSiteContent(p => ({ ...p, circle: { ...p.circle, levels: p.circle.levels.filter((_, i) => i !== index) } }))}
                      style={{ height: 39, padding: '0 12px', background: 'rgba(229,115,115,0.08)', color: '#E57373', border: '1px solid rgba(229,115,115,0.22)', borderRadius: 6, cursor: 'pointer' }}
                    >
                      Rimuovi
                    </button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Field label="Descrizione" value={level.description} onChange={value => updateCircleLevel(index, { description: value })} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <ListEditor
                      label="Privilegi"
                      items={level.perks || []}
                      placeholder="Priority processing"
                      addLabel="Privilegio"
                      maxItems={6}
                      onChange={perks => updateCirclePerks(index, perks)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button onClick={saveSiteContent} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#D6B25E', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={16} /> Salva Circle
              </button>
              {message && <div style={{ color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
            </div>
          </motion.div>
        )}

        {tab === 'filters' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <AdminPanelHeader
              eyebrow="Catalogo"
              title="Filtri"
              meta={[{ label: 'filtri', value: siteContent.productFilters.length }]}
              action={(
                <button
                  className="admin-primary-soft-button"
                  onClick={() => setSiteContent(p => ({ ...p, productFilters: [...p.productFilters, `Filtro ${p.productFilters.length + 1}`] }))}
                >
                  + Nuovo filtro
                </button>
              )}
            />

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

            <button onClick={saveSiteContent} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#D6B25E', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={16} /> Salva filtri
            </button>
            {message && <div style={{ marginTop: 14, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
          </motion.div>
        )}

        {tab === 'contacts' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <AdminPanelHeader
              eyebrow="Sito"
              title="Home e contatti"
              meta={[
                { label: 'info', value: siteContent.infoCards.length },
                { label: 'filtri', value: siteContent.productFilters.length },
                { label: 'link', value: siteContent.contacts.length },
              ]}
            />
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
              <button onClick={saveSiteContent} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#D6B25E', color: '#050505', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={16} /> Salva contatti
              </button>
              {message && <div style={{ color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>{message}</div>}
            </div>
          </motion.div>
        )}

        {tab === 'newsletter' && (
          <motion.div className="admin-form-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...panel, padding: 18 }}>
            <AdminPanelHeader
              eyebrow="Telegram"
              title="Newsletter"
              meta={[{ label: 'destinatari', value: stats.newsletterSubscribers || 0 }]}
            />
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
                    background: '#D6B25E',
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
        .admin-panel-header {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
        }
        .admin-panel-eyebrow {
          margin-bottom: 5px;
          font-family: 'Inter', sans-serif;
          font-size: 0.62rem;
          letter-spacing: 0.17em;
          text-transform: uppercase;
          color: #D6B25E;
        }
        .admin-panel-header h2 {
          margin: 0;
          font-family: 'Satoshi', sans-serif;
          font-size: 1.2rem;
          line-height: 1.1;
          color: #F5F5F5;
        }
        .admin-panel-header-side {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .admin-panel-meta {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .admin-panel-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 26px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(245,245,245,0.42);
          font-size: 0.66rem;
          font-family: 'Inter', sans-serif;
        }
        .admin-panel-meta strong {
          color: #D6B25E;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
        }
        .admin-primary-soft-button {
          min-height: 32px;
          padding: 8px 12px;
          border-radius: 7px;
          border: 1px solid rgba(214,178,94,0.25);
          background: rgba(214,178,94,0.08);
          color: #D6B25E;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 0.76rem;
          font-weight: 700;
        }
        .admin-form-layout {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .admin-form-block {
          min-width: 0;
          padding: 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.065);
        }
        .admin-form-block-wide {
          grid-column: 1 / -1;
        }
        .admin-list-title {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-family: 'Inter', sans-serif;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(245,245,245,0.36);
        }
        .admin-list-title strong {
          color: #D6B25E;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0;
        }
        .admin-product-list-scroll {
          overflow: auto;
          max-height: min(70vh, 720px);
        }
        .admin-product-item:hover {
          background: rgba(255,255,255,0.045) !important;
        }
        .admin-mini-pill {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(214,178,94,0.075);
          border: 1px solid rgba(214,178,94,0.14);
          color: rgba(245,245,245,0.58);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem;
        }
        .admin-form-panel {
          min-width: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .admin-form-block,
        .admin-order-card,
        .admin-user-card,
        .admin-contact-card,
        .admin-circle-level-card,
        .admin-product-item,
        .admin-panel-header,
        .admin-order-info-card {
          min-width: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .admin-form-block *,
        .admin-form-panel *,
        .admin-order-card * {
          min-width: 0;
        }
        .admin-form-panel:focus-within {
          border-color: rgba(214,178,94,0.24) !important;
          box-shadow: 0 18px 60px rgba(0,0,0,0.34), 0 0 0 1px rgba(214,178,94,0.08) !important;
        }
        .admin-action-toast {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 320;
          max-width: min(420px, calc(100vw - 36px));
          padding: 11px 13px;
          border-radius: 8px;
          border: 1px solid rgba(214,178,94,0.26);
          background: rgba(12,12,14,0.94);
          color: #D6B25E;
          box-shadow: 0 18px 60px rgba(0,0,0,0.42);
          backdrop-filter: blur(18px);
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          line-height: 1.35;
        }
        .admin-form-block:focus-within,
        .admin-order-card:focus-within,
        .admin-contact-card:focus-within {
          border-color: rgba(214,178,94,0.22) !important;
          background: rgba(214,178,94,0.025) !important;
        }
        .admin-form-block input,
        .admin-form-block textarea,
        .admin-form-block select,
        .admin-form-panel input,
        .admin-form-panel textarea,
        .admin-form-panel select {
          min-height: 36px;
        }
        .admin-form-block input:focus,
        .admin-form-block textarea:focus,
        .admin-form-block select:focus,
        .admin-form-panel input:focus,
        .admin-form-panel textarea:focus,
        .admin-form-panel select:focus,
        .admin-tracking-panel input:focus {
          border-color: rgba(214,178,94,0.42) !important;
          box-shadow: 0 0 0 2px rgba(214,178,94,0.08);
        }
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
            padding: 70px 8px calc(74px + env(safe-area-inset-bottom, 0px)) !important;
            overflow-x: hidden;
          }
          .admin-header {
            align-items: flex-start !important;
            gap: 8px !important;
            margin-bottom: 10px !important;
          }
          .admin-header > div:first-child > div:first-child {
            margin-bottom: 4px !important;
            font-size: 0.58rem !important;
          }
          .admin-title {
            font-size: clamp(1.16rem, 6vw, 1.55rem) !important;
            line-height: 1.15 !important;
          }
          .admin-logout {
            flex-shrink: 0;
            padding: 7px 9px !important;
            font-size: 0.7rem;
          }
          .admin-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 5px !important;
            margin-bottom: 8px !important;
          }
          .admin-stat-card {
            min-height: 64px;
            padding: 8px 6px !important;
            text-align: center;
          }
          .admin-stat-card > div:first-child {
            margin-bottom: 4px !important;
          }
          .admin-stat-card > div:first-child svg {
            width: 14px;
            height: 14px;
          }
          .admin-stat-card > div:nth-child(2) {
            font-size: 0.9rem !important;
          }
          .admin-stat-card > div:last-child {
            font-size: 0.48rem !important;
            letter-spacing: 0.06em !important;
          }
          .admin-tabs {
            box-sizing: border-box;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            width: 100% !important;
            gap: 4px !important;
            margin-bottom: 8px !important;
            padding: 4px !important;
            border-radius: 10px;
            position: sticky;
            top: 58px;
            z-index: 70;
            background: rgba(5,5,5,0.92);
            backdrop-filter: blur(18px);
            scrollbar-width: none;
          }
          .admin-tabs::-webkit-scrollbar {
            display: none;
          }
          .admin-tab {
            padding: 7px 5px !important;
            font-size: 0.66rem;
            text-align: center;
            border-radius: 8px !important;
          }
          .admin-panel-header {
            display: grid;
            gap: 7px;
            padding: 10px !important;
          }
          .admin-panel-eyebrow {
            font-size: 0.54rem;
            margin-bottom: 3px;
          }
          .admin-panel-header h2 {
            font-size: 1rem;
          }
          .admin-panel-meta {
            gap: 5px;
          }
          .admin-panel-meta span {
            min-height: 22px;
            padding: 3px 6px;
            font-size: 0.56rem;
          }
          .admin-primary-soft-button {
            min-height: 28px;
            padding: 6px 9px;
            font-size: 0.66rem;
          }
          .admin-form-panel > .admin-panel-header {
            margin: -12px -12px 10px;
          }
          .admin-panel-header-side,
          .admin-panel-meta {
            justify-content: flex-start;
          }
          .admin-catalog-view > .admin-panel-header {
            padding: 0 !important;
          }
          .admin-form-layout {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .admin-row,
          .admin-products,
          .admin-filter-row,
          .admin-form {
            grid-template-columns: 1fr !important;
          }
          .admin-list-row {
            padding: 9px !important;
          }
          .admin-form-panel {
            padding: 12px !important;
          }
          .admin-form-block {
            padding: 9px !important;
            border-radius: 7px !important;
          }
          .admin-form-block > div:first-child,
          .admin-media-block > div:first-child {
            margin-bottom: 7px !important;
          }
          .admin-form-block input,
          .admin-form-block textarea,
          .admin-form-block select,
          .admin-form-panel input,
          .admin-form-panel textarea,
          .admin-form-panel select {
            min-height: 32px !important;
            padding: 7px 9px !important;
            font-size: 0.76rem !important;
          }
          .admin-form-block textarea,
          .admin-form-panel textarea {
            min-height: 74px !important;
          }
          .admin-catalog-view {
            display: grid;
            gap: 8px;
          }
          .admin-products {
            gap: 8px !important;
          }
          .admin-product-list {
            max-height: none !important;
            position: static !important;
            z-index: auto;
          }
          .admin-list-title {
            padding: 8px 10px;
            font-size: 0.58rem;
          }
          .admin-product-list-scroll {
            max-height: 34vh;
            overscroll-behavior: contain;
          }
          .admin-product-item {
            padding: 9px 10px !important;
          }
          .admin-product-item > div:first-child {
            margin-bottom: 3px !important;
          }
          .admin-product-item > div:first-child > div:first-child {
            font-size: 0.82rem;
          }
          .admin-product-item > div:nth-child(2) {
            display: none;
          }
          .admin-mini-pill {
            min-height: 18px;
            padding: 1px 6px;
            font-size: 0.56rem;
          }
          .admin-price-row {
            grid-template-columns: 1fr 92px 34px !important;
            gap: 6px !important;
          }
          .admin-price-row button,
          .admin-list-editor-row button {
            width: 34px !important;
          }
          .admin-preset-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .admin-preset {
            min-height: 42px !important;
            padding: 7px !important;
          }
          .admin-preset span:first-child {
            font-size: 0.66rem !important;
            margin-bottom: 7px !important;
          }
          .admin-media-block {
            padding: 9px !important;
          }
          .admin-media-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .admin-media-grid > div {
            height: 68px !important;
          }
          .admin-product-actions {
            position: sticky;
            bottom: 0;
            z-index: 60;
            margin: 10px -12px -12px !important;
            padding: 8px 12px;
            background: rgba(8,8,9,0.92);
            border-top: 1px solid rgba(255,255,255,0.07);
            backdrop-filter: blur(16px);
          }
          .admin-product-actions button {
            min-height: 38px;
            padding: 9px 12px !important;
          }
          .admin-action-toast {
            left: 8px;
            right: 8px;
            bottom: calc(74px + env(safe-area-inset-bottom, 0px));
            max-width: none;
            padding: 9px 11px;
            font-size: 0.72rem;
          }
          .admin-orders-grid {
            padding: 6px !important;
            gap: 6px !important;
          }
          .admin-users-grid {
            padding: 6px !important;
            gap: 6px !important;
          }
          .admin-user-card {
            padding: 9px !important;
          }
          .admin-user-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .admin-user-row > div:first-child,
          .admin-user-row > div:last-child {
            grid-column: 1 / -1;
          }
          .admin-order-card {
            padding: 8px !important;
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
            padding: 7px !important;
          }
          .admin-payment-totals {
            grid-template-columns: 1fr !important;
          }
          .admin-order-item {
            align-items: flex-start;
          }
          .admin-tracking-panel {
            padding: 7px !important;
          }
          .admin-order-filters {
            gap: 6px !important;
            padding: 7px !important;
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
        }
        @media (max-width: 560px) {
          .cc-admin-page {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          .admin-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .admin-tabs {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .admin-media-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
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
          .admin-header {
            margin-bottom: 8px !important;
          }
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
          .admin-panel-meta span:nth-child(n+4) {
            display: none;
          }
        }
        @media (max-width: 340px) {
          .admin-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .admin-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}
