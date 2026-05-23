import cookieParser from 'cookie-parser'
import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'dist')
const dataDir = path.join(__dirname, 'data')
const productsFile = path.join(dataDir, 'products.json')
const ordersFile = path.join(dataDir, 'orders.json')
const siteContentFile = path.join(dataDir, 'site-content.json')
const newsletterSubscribersFile = path.join(dataDir, 'newsletter-subscribers.json')

const defaultSiteContent = {
  welcomeTitle: 'BENVENUTI SU CAMPOCLARO',
  welcomeSubtitle: 'Ship da BCN in tutto il mondo',
  infoCards: [
    { title: 'Shipping', body: 'Ship da BCN in tutto il mondo. Spediamo da lunedi a venerdi con track 24h.' },
    { title: 'Meet up', body: 'Meet up Barcellona. Meet up Italia previo pagamento con gestione 48h.' },
    { title: 'Corrieri', body: 'Usiamo UPS, InPost, SEUR e GLS. Penisola 48h, isole 72h.' },
    { title: 'Catalogo', body: 'Lavoriamo W*ed, H*sh, W*ite e tutti tipi di qualita. Ordine minimo 100g.' },
    { title: 'Pagamenti', body: 'Accettiamo crypto e soldi in posta.' },
  ],
  productFilters: ['Club Selection'],
  contactsTitle: 'CONTATTI',
  contactsIntro: 'Unici contatti ufficiali CAMPOCLARO. Usa solo questi link per evitare profili fake.',
  contacts: [
    { label: 'Linktree', value: 'linktr.ee/Campoclaro', url: 'https://linktr.ee/Campoclaro' },
    { label: 'Telegram', value: 't.me/campoclaro28', url: 'https://t.me/campoclaro28' },
    { label: 'Canale Signal prodotti', value: 'Signal prodotti', url: 'https://signal.group/#CjQKIP9RSrg0AVHBkbrD9Za2Y6up4LWO9DJRCbOhRhO4C3EzEhCCeyvjyjYp-HLLNVPNB6JD' },
    { label: 'Contatto diretto Signal', value: 'Signal diretto', url: 'https://signal.me/#eu/B1z1MUFIX7P82EBTxFmuI_E8E3YJAuCrX2ByhFyvkZvrVHf2p-xOVI0wbc-XTHij' },
    { label: 'Canale Potato prodotti', value: 'Campoclaroreal', url: 'https://tatokdym.org/Campoclaroreal' },
    { label: 'Canale Viber foto', value: 'Viber foto', url: 'https://invite.viber.com/?g2=AQBHCFHr%2ByzypFaNsXfqYd4biSbCF1FGOu8AH66AU4EEymDzYsfjX2DYKkcv%2FDBR' },
  ],
}

const app = express()
const port = Number(process.env.API_PORT || 3001)
const sessionSecret = process.env.SESSION_SECRET || 'campoclaro-dev-secret'
const adminIds = new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(v => v.trim()).filter(Boolean))
const ccppFee = 50
const autoDeliverCheckMs = 60 * 60 * 1000
const autoDeliverDays = {
  UPS: Number(process.env.AUTO_DELIVER_UPS_DAYS || 5),
  InPost: Number(process.env.AUTO_DELIVER_INPOST_DAYS || 4),
  SEUR: Number(process.env.AUTO_DELIVER_SEUR_DAYS || 3),
  GLS: Number(process.env.AUTO_DELIVER_GLS_DAYS || 4),
  default: Number(process.env.AUTO_DELIVER_DEFAULT_DAYS || 5),
}
const cryptoWallets = {
  BTC: {
    label: 'BTC',
    network: 'Bitcoin',
    address: 'bc1qgsrl93sxjaw3q6m9nwcq2safrhne5ytyw5we0x',
  },
  ETH: {
    label: 'ETH',
    network: 'Ethereum',
    address: '0xbDe606b9b9D91530C34772625E0279f8C2521f1d',
  },
  USDT_TRX: {
    label: 'USDT',
    network: 'TRON / TRC20',
    address: 'TBcA3q7ecir9oDwiqz9CTCK6pNZXhajLGA',
  },
}

const telegramApiBase = process.env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
  : ''

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function sendTelegramMessage(chatId, text, options = {}) {
  if (!telegramApiBase || !chatId) return null
  try {
    const response = await fetch(`${telegramApiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options,
      }),
    })
    const body = await response.json().catch(() => ({}))
    return body.ok ? body.result : null
  } catch (error) {
    console.error('Telegram send failed:', error.message)
    return null
  }
}

function formatOrderItems(items) {
  return items
    .map(item => `• ${escapeHtml(item.name)} ${escapeHtml(item.weight)}${item.strain ? ` · ${escapeHtml(item.strain)}` : ''} x${item.quantity} - €${Number(item.price) * Number(item.quantity)}`)
    .join('\n')
}

function formatShippingAddress(address = {}) {
  return [
    address.via,
    `${address.city || ''} ${address.cap || ''}`.trim(),
    address.notes ? `Note: ${address.notes}` : '',
  ].filter(Boolean).map(escapeHtml).join('\n')
}

function formatCustomer(customer = {}) {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
  const username = customer.username ? `@${customer.username}` : ''
  const id = customer.id ? `ID ${customer.id}` : ''
  return [name, username, id].filter(Boolean).join(' · ') || 'Cliente Telegram non disponibile'
}

function normalizeSubscriber(user, enabled) {
  return {
    id: String(user.id),
    firstName: String(user.firstName || ''),
    lastName: String(user.lastName || ''),
    username: String(user.username || ''),
    enabled: Boolean(enabled),
    updatedAt: new Date().toISOString(),
  }
}

function formatNewsletterMessage(title, body) {
  return [
    `<b>${escapeHtml(title)}</b>`,
    '',
    escapeHtml(body).replace(/\n/g, '\n'),
  ].join('\n')
}

async function notifyAdmins(order, reason = 'Nuovo ordine') {
  if (!adminIds.size) return

  const isMeetup = order.delivery === 'meetup'
  const lines = [
    `<b>${escapeHtml(reason)}</b>`,
    `<b>Ordine:</b> ${escapeHtml(order.id)}`,
    `<b>Cliente:</b> ${escapeHtml(formatCustomer(order.customer))}`,
    `<b>Consegna:</b> ${isMeetup ? 'Meetup Barcellona' : 'Spedizione'}`,
    order.courier ? `<b>Corriere scelto:</b> ${escapeHtml(order.courier)}` : '',
    `<b>Pagamento:</b> ${order.payment === 'crypto' ? `${escapeHtml(order.cryptoCurrency)} ${escapeHtml(order.cryptoNetwork)} · ${escapeHtml(order.paymentStatus)}` : 'Meetup / da concordare'}`,
    `<b>Totale:</b> €${order.total}`,
    '',
    '<b>Prodotti</b>',
    formatOrderItems(order.items),
  ]

  if (order.delivery === 'ship') {
    lines.push('', '<b>Dati spedizione</b>', formatShippingAddress(order.address))
  } else {
    lines.push('', '<b>Meetup</b>', 'Disponibile solo a Barcellona.')
  }

  if (order.cryptoWallet) {
    lines.push('', '<b>Wallet usato</b>', escapeHtml(order.cryptoWallet))
  }

  lines.push('', 'Per inviare il tracking al cliente, rispondi con il codice. Puoi anche scrivere: UPS 1Z..., InPost ..., SEUR ..., GLS ...')

  const orders = await readJson(ordersFile, [])
  const storedOrder = orders.find(item => item.id === order.id)
  for (const adminId of adminIds) {
    const message = await sendTelegramMessage(adminId, lines.join('\n'))
    if (message && storedOrder) {
      storedOrder.adminTelegramMessages = storedOrder.adminTelegramMessages || []
      storedOrder.adminTelegramMessages.push({ chatId: String(adminId), messageId: message.message_id })
    }
  }
  if (storedOrder) await writeJson(ordersFile, orders)
}

app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`)
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function readSession(req) {
  const token = req.cookies.cc_session
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
}

function readCustomerSession(req) {
  const token = req.cookies.cc_customer
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
}

function verifyTelegramAuth(authData) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  }

  const { hash, ...data } = authData
  const checkString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n')
  const secretKey = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest()
  const expected = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  if (expected !== hash) return false
  const authAge = Math.floor(Date.now() / 1000) - Number(data.auth_date || 0)
  return authAge < 86400
}

function requireAdmin(req, res, next) {
  const session = readSession(req)
  if (!session?.id) return res.status(401).json({ error: 'Unauthorized' })
  if (adminIds.size > 0 && !adminIds.has(String(session.id))) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  req.user = session
  next()
}

function normalizeProduct(input, existing = {}) {
  const prices = typeof input.prices === 'object' && input.prices ? input.prices : {}
  const fallbackId = String(input.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || nanoid(10)
  return {
    ...existing,
    id: String(input.id || existing.id || fallbackId).trim(),
    name: String(input.name || '').trim(),
    category: String(input.category || '').trim(),
    description: String(input.description || '').trim(),
    longDescription: String(input.longDescription || '').trim(),
    prices: Object.fromEntries(Object.entries(prices).map(([k, v]) => [String(k), Number(v)]).filter(([, v]) => Number.isFinite(v))),
    filters: Array.isArray(input.filters) ? input.filters.map(String).map(v => v.trim()).filter(Boolean) : existing.filters || [],
    strains: Array.isArray(input.strains) ? input.strains.map(String).map(v => v.trim()).filter(Boolean) : existing.strains || [],
    thc: String(input.thc || '').trim(),
    cbd: String(input.cbd || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.map(String).map(v => v.trim()).filter(Boolean).slice(0, 2) : [],
    gradient: String(input.gradient || existing.gradient || 'linear-gradient(135deg, #111 0%, #222 60%, #050505 100%)'),
    glowColor: String(input.glowColor || existing.glowColor || 'rgba(214,178,94,0.12)'),
    active: input.active !== false,
  }
}

function normalizeSiteContent(input = {}) {
  return {
    welcomeTitle: String(input.welcomeTitle || defaultSiteContent.welcomeTitle).trim(),
    welcomeSubtitle: String(input.welcomeSubtitle || defaultSiteContent.welcomeSubtitle).trim(),
    infoCards: Array.isArray(input.infoCards)
      ? input.infoCards.map(card => ({
        title: String(card.title || '').trim(),
        body: String(card.body || '').trim(),
      })).filter(card => card.title || card.body)
      : defaultSiteContent.infoCards,
    productFilters: Array.isArray(input.productFilters)
      ? input.productFilters.map(String).map(v => v.trim()).filter(Boolean)
      : defaultSiteContent.productFilters,
    contactsTitle: String(input.contactsTitle || defaultSiteContent.contactsTitle).trim(),
    contactsIntro: String(input.contactsIntro || defaultSiteContent.contactsIntro).trim(),
    contacts: Array.isArray(input.contacts)
      ? input.contacts.map(contact => ({
        label: String(contact.label || '').trim(),
        value: String(contact.value || '').trim(),
        url: String(contact.url || '').trim(),
      })).filter(contact => contact.label || contact.value || contact.url)
      : defaultSiteContent.contacts,
  }
}

const courierTracking = {
  UPS: {
    label: 'UPS',
    aliases: ['UPS'],
    url: value => `https://www.ups.com/track?tracknum=${encodeURIComponent(value)}&loc=it_IT`,
  },
  INPOST: {
    label: 'InPost',
    aliases: ['INPOST', 'IN POST', 'IN-POST'],
    url: () => 'https://inpost.it/en/find-parcel',
  },
  SEUR: {
    label: 'SEUR',
    aliases: ['SEUR'],
    url: () => 'https://www.seur.com/miseur/mis-envios',
  },
  GLS: {
    label: 'GLS',
    aliases: ['GLS', 'GLSITALY', 'GLS ITALY'],
    url: value => `https://www.glsitaly.eu/track.php?match=${encodeURIComponent(value)}`,
  },
}

const allowedCouriers = new Set(Object.values(courierTracking).map(courier => courier.label))

function stripCourierPrefix(input) {
  let value = String(input || '').trim()
  let requested = ''
  for (const [key, config] of Object.entries(courierTracking)) {
    for (const alias of config.aliases) {
      const pattern = new RegExp(`^${alias.replace(/\s+/g, '[\\s-]*')}[\\s:#-]+`, 'i')
      if (pattern.test(value)) {
        requested = key
        value = value.replace(pattern, '').trim()
        return { requested, value }
      }
    }
  }
  return { requested, value }
}

function detectTrackingProvider(trackingNumber, requestedProvider = '') {
  const value = String(trackingNumber || '').trim()
  const compact = value.replace(/[\s-]/g, '').toUpperCase()
  const requested = String(requestedProvider || '').trim().toUpperCase()

  if (courierTracking[requested]) {
    return {
      provider: courierTracking[requested].label,
      url: courierTracking[requested].url(compact),
    }
  }

  if (/^1Z[0-9A-Z]{16}$/.test(compact)) {
    return { provider: 'UPS', url: courierTracking.UPS.url(compact) }
  }

  if (/^[A-Z]{3}\d{9}[A-Z]{3}$/.test(compact) || /^\d{24}$/.test(compact) || /^IT[A-Z0-9]{10,24}$/.test(compact)) {
    return { provider: 'InPost', url: courierTracking.INPOST.url(compact) }
  }

  if (/^[A-Z]{2}\d{9,12}$/.test(compact) || /^\d{10,14}$/.test(compact)) {
    return { provider: 'SEUR', url: courierTracking.SEUR.url(compact) }
  }

  if (/^[A-Z]{2}\d{8,12}$/.test(compact) || /^\d{8,11}$/.test(compact) || /^[A-Z0-9]{11,16}$/.test(compact)) {
    return { provider: 'GLS', url: courierTracking.GLS.url(compact) }
  }

  return {
    provider: 'Tracking ufficiale',
    url: `https://www.glsitaly.eu/track.php?match=${encodeURIComponent(compact)}`,
  }
}

function trackingInfo(trackingNumber, requestedProvider = '') {
  const parsed = stripCourierPrefix(trackingNumber)
  const value = parsed.value
  if (!value) return { provider: String(requestedProvider || parsed.requested || 'Auto'), url: '', trackingNumber: '' }
  const info = detectTrackingProvider(value, parsed.requested || requestedProvider)
  return { ...info, trackingNumber: value.replace(/\s+/g, ' ').trim() }
}

function autoDeliverDelayMs(provider) {
  const days = autoDeliverDays[provider] || autoDeliverDays.default
  return Math.max(1, Number(days) || autoDeliverDays.default) * 86400 * 1000
}

async function autoCompleteDeliveredOrders() {
  const orders = await readJson(ordersFile, [])
  const now = Date.now()
  let changed = false

  for (const order of orders) {
    if (order.status !== 'shipped' || !order.trackingNumber || order.deliveredAt) continue

    const shippedAt = Date.parse(order.shippedAt || order.updatedAt || order.createdAt)
    if (!Number.isFinite(shippedAt)) continue
    if (now - shippedAt < autoDeliverDelayMs(order.trackingProvider)) continue

    order.status = 'completed'
    order.deliveredAt = new Date(now).toISOString()
    order.deliveryAutoCompleted = true
    order.updatedAt = order.deliveredAt
    changed = true

    if (order.notificationsEnabled !== false && order.customer?.id) {
      await sendTelegramMessage(order.customer.id, [
        `<b>Ordine ${escapeHtml(order.id)} completato.</b>`,
        `Tracking: <code>${escapeHtml(order.trackingNumber)}</code>`,
        order.trackingProvider ? `Corriere: ${escapeHtml(order.trackingProvider)}` : '',
        'Se qualcosa non è arrivato, contattaci subito su Telegram.',
      ].filter(Boolean).join('\n'))
    }
  }

  if (changed) await writeJson(ordersFile, orders)
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/products', async (_req, res) => {
  const products = await readJson(productsFile, [])
  res.json(products.filter(product => product.active !== false))
})

app.get('/api/site-content', async (_req, res) => {
  const content = normalizeSiteContent(await readJson(siteContentFile, defaultSiteContent))
  res.json(content)
})

app.post('/api/orders', async (req, res) => {
  const { items, delivery, payment: requestedPayment, address } = req.body
  const customer = readCustomerSession(req)
  if (!customer?.id) return res.status(401).json({ error: 'Accesso Telegram richiesto per ordinare' })
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' })
  if (!['ship', 'meetup'].includes(delivery)) return res.status(400).json({ error: 'Invalid delivery method' })
  const payment = delivery === 'meetup' ? 'meetup' : requestedPayment
  if (!['crypto', 'ccpp', 'meetup'].includes(payment)) return res.status(400).json({ error: 'Invalid payment method' })

  const cleanAddress = address && typeof address === 'object' ? address : {}
  if (delivery === 'ship' && (!String(cleanAddress.via || '').trim() || !String(cleanAddress.city || '').trim() || !String(cleanAddress.cap || '').trim())) {
    return res.status(400).json({ error: 'Shipping address is required' })
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const fees = payment === 'ccpp' ? ccppFee : 0
  const cryptoCurrency = String(req.body.cryptoCurrency || 'BTC')
  const cryptoPayment = payment === 'crypto' ? cryptoWallets[cryptoCurrency] || cryptoWallets.BTC : null
  const requestedCourier = String(req.body.courier || 'UPS').trim()
  const courier = delivery === 'ship' && allowedCouriers.has(requestedCourier) ? requestedCourier : ''

  const order = {
    id: `CC-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    delivery,
    courier,
    payment,
    paymentStatus: payment === 'crypto' ? 'awaiting_crypto' : payment === 'meetup' ? 'meetup_requested' : 'pending',
    cryptoCurrency: cryptoPayment?.label || '',
    cryptoNetwork: cryptoPayment?.network || '',
    cryptoWallet: cryptoPayment?.address || '',
    customer,
    notificationsEnabled: req.body.notificationsEnabled !== false,
    trackingNumber: '',
    trackingProvider: 'Auto Free',
    trackingUrl: '',
    address: cleanAddress,
    items: items.map(item => ({
      productId: String(item.id),
      name: String(item.name),
      weight: String(item.weight),
      strain: String(item.strain || ''),
      price: Number(item.price),
      quantity: Number(item.quantity),
    })),
    subtotal,
    fees,
    total: subtotal + fees,
  }

  const orders = await readJson(ordersFile, [])
  orders.unshift(order)
  await writeJson(ordersFile, orders)
  if (delivery === 'meetup') await notifyAdmins(order, 'Nuova richiesta Meetup')
  res.status(201).json(order)
})

app.get('/api/orders/:id/public', async (req, res) => {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber || '',
    trackingProvider: order.trackingProvider || '',
    trackingUrl: order.trackingUrl || '',
  })
})

app.post('/api/orders/:id/crypto-paid', async (req, res) => {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.payment !== 'crypto') return res.status(400).json({ error: 'Order is not crypto' })

  order.paymentStatus = 'paid_reported'
  order.paymentProof = String(req.body.txHash || '').trim()
  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)
  await notifyAdmins(order, 'Pagamento crypto segnalato')
  res.json(order)
})

app.post('/api/auth/telegram', (req, res) => {
  try {
    if (!verifyTelegramAuth(req.body)) return res.status(401).json({ error: 'Invalid Telegram signature' })
    const user = {
      id: String(req.body.id),
      firstName: req.body.first_name || '',
      lastName: req.body.last_name || '',
      username: req.body.username || '',
      photoUrl: req.body.photo_url || '',
      role: adminIds.size === 0 || adminIds.has(String(req.body.id)) ? 'admin' : 'user',
    }
    res.cookie('cc_session', signSession(user), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 })
    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/customer/telegram', (req, res) => {
  try {
    if (!verifyTelegramAuth(req.body)) return res.status(401).json({ error: 'Invalid Telegram signature' })
    const user = {
      id: String(req.body.id),
      firstName: req.body.first_name || '',
      lastName: req.body.last_name || '',
      username: req.body.username || '',
      photoUrl: req.body.photo_url || '',
      role: 'customer',
    }
    res.cookie('cc_customer', signSession(user), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 86400 * 1000,
    })
    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/customer/me', (req, res) => {
  res.json({ user: readCustomerSession(req) })
})

app.get('/api/customer/newsletter', async (req, res) => {
  const customer = readCustomerSession(req)
  if (!customer?.id) return res.status(401).json({ error: 'Accesso Telegram richiesto' })
  const subscribers = await readJson(newsletterSubscribersFile, [])
  const subscriber = subscribers.find(item => String(item.id) === String(customer.id))
  res.json({ enabled: subscriber?.enabled === true })
})

app.put('/api/customer/newsletter', async (req, res) => {
  const customer = readCustomerSession(req)
  if (!customer?.id) return res.status(401).json({ error: 'Accesso Telegram richiesto' })

  const enabled = req.body.enabled === true
  const subscribers = await readJson(newsletterSubscribersFile, [])
  const index = subscribers.findIndex(item => String(item.id) === String(customer.id))
  const subscriber = normalizeSubscriber(customer, enabled)
  if (index === -1) subscribers.push(subscriber)
  else subscribers[index] = { ...subscribers[index], ...subscriber }
  await writeJson(newsletterSubscribersFile, subscribers)
  res.json({ enabled })
})

app.post('/api/auth/dev-login', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_LOGIN !== '1') {
    return res.status(404).json({ error: 'Not found' })
  }
  const user = { id: 'dev-admin', firstName: 'Dev', username: 'admin', role: 'admin' }
  res.cookie('cc_session', signSession(user), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 })
  res.json({ user })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('cc_session')
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: readSession(req) })
})

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  const [products, orders, subscribers] = await Promise.all([readJson(productsFile, []), readJson(ordersFile, []), readJson(newsletterSubscribersFile, [])])
  res.json({
    products: products.length,
    orders: orders.length,
    revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    pending: orders.filter(order => ['new', 'processing'].includes(order.status)).length,
    newsletterSubscribers: subscribers.filter(item => item.enabled === true).length,
  })
})

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
  res.json(await readJson(productsFile, []))
})

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const products = await readJson(productsFile, [])
  const product = normalizeProduct(req.body)
  if (!product.name || Object.keys(product.prices).length === 0) return res.status(400).json({ error: 'Name and prices are required' })
  products.unshift(product)
  await writeJson(productsFile, products)
  res.status(201).json(product)
})

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const products = await readJson(productsFile, [])
  const index = products.findIndex(product => product.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Product not found' })
  const nextId = String(req.body.id || req.params.id).trim()
  if (nextId !== req.params.id && products.some(product => product.id === nextId)) {
    return res.status(409).json({ error: 'Product id already exists' })
  }
  products[index] = normalizeProduct({ ...req.body, id: nextId }, products[index])
  await writeJson(productsFile, products)
  res.json(products[index])
})

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const products = await readJson(productsFile, [])
  await writeJson(productsFile, products.filter(product => product.id !== req.params.id))
  res.json({ ok: true })
})

app.get('/api/admin/site-content', requireAdmin, async (_req, res) => {
  res.json(normalizeSiteContent(await readJson(siteContentFile, defaultSiteContent)))
})

app.put('/api/admin/site-content', requireAdmin, async (req, res) => {
  const content = normalizeSiteContent(req.body)
  await writeJson(siteContentFile, content)
  res.json(content)
})

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  await autoCompleteDeliveredOrders()
  res.json(await readJson(ordersFile, []))
})

app.post('/api/admin/newsletter', requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim()
  const body = String(req.body.body || '').trim()
  if (!title || !body) return res.status(400).json({ error: 'Titolo e testo sono obbligatori' })

  const subscribers = (await readJson(newsletterSubscribersFile, [])).filter(item => item.enabled === true)
  let sent = 0
  let failed = 0
  const text = formatNewsletterMessage(title, body)

  for (const subscriber of subscribers) {
    const message = await sendTelegramMessage(subscriber.id, text)
    if (message) sent += 1
    else failed += 1
  }

  res.json({ sent, failed, subscribers: subscribers.length })
})

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })

  if (req.body.status !== undefined) order.status = String(req.body.status || order.status)
  if (req.body.trackingNumber !== undefined) {
    const tracking = trackingInfo(String(req.body.trackingNumber || '').trim(), String(req.body.trackingProvider || order.courier || '').trim())
    order.trackingNumber = tracking.trackingNumber
    order.trackingProvider = tracking.provider
    order.trackingUrl = tracking.url
    if (order.trackingNumber && order.status === 'new') order.status = 'shipped'
    if (order.trackingNumber && order.status === 'shipped' && !order.shippedAt) order.shippedAt = new Date().toISOString()
  } else if (req.body.trackingProvider !== undefined && order.trackingNumber) {
    const info = trackingInfo(order.trackingNumber, String(req.body.trackingProvider || 'Auto Free').trim() || 'Auto Free')
    order.trackingProvider = info.provider
    order.trackingUrl = info.url
  }

  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)
  res.json(order)
})

app.post('/api/telegram/webhook', async (req, res) => {
  if (process.env.TELEGRAM_WEBHOOK_SECRET && req.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const message = req.body?.message
  const replyTo = message?.reply_to_message
  const trackingNumber = String(message?.text || '').trim()
  const fromId = String(message?.from?.id || '')
  if (!replyTo || !trackingNumber || !adminIds.has(fromId)) return res.json({ ok: true })

  const orders = await readJson(ordersFile, [])
  const order = orders.find(item =>
    (item.adminTelegramMessages || []).some(adminMessage =>
      String(adminMessage.chatId) === String(message.chat.id) &&
      Number(adminMessage.messageId) === Number(replyTo.message_id)
    )
  )
  if (!order) return res.json({ ok: true })

  const info = trackingInfo(trackingNumber, order.courier || '')
  order.trackingNumber = info.trackingNumber
  order.trackingProvider = info.provider
  order.trackingUrl = info.url
  order.status = 'shipped'
  if (!order.shippedAt) order.shippedAt = new Date().toISOString()
  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)

  await sendTelegramMessage(message.chat.id, [
    `Tracking salvato per <b>${escapeHtml(order.id)}</b>`,
    `<b>Corriere:</b> ${escapeHtml(order.trackingProvider)}`,
    `<b>Codice:</b> <code>${escapeHtml(order.trackingNumber)}</code>`,
    order.trackingUrl ? `<a href="${escapeHtml(order.trackingUrl)}">Apri tracking ufficiale</a>` : '',
  ].filter(Boolean).join('\n'))

  if (order.notificationsEnabled !== false && order.customer?.id) {
    await sendTelegramMessage(order.customer.id, [
      `<b>Il tuo ordine ${escapeHtml(order.id)} è in transito.</b>`,
      `<b>Corriere:</b> ${escapeHtml(order.trackingProvider)}`,
      `Tracking: <code>${escapeHtml(order.trackingNumber)}</code>`,
      order.trackingUrl ? `<a href="${escapeHtml(order.trackingUrl)}">Apri tracking ufficiale</a>` : '',
    ].filter(Boolean).join('\n'))
  }

  res.json({ ok: true })
})

app.use(express.static(publicDir))

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  autoCompleteDeliveredOrders().catch(error => console.error('Auto delivery check failed:', error.message))
  setInterval(() => {
    autoCompleteDeliveredOrders().catch(error => console.error('Auto delivery check failed:', error.message))
  }, autoDeliverCheckMs).unref()
})
