import cookieParser from 'cookie-parser'
import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import { constants as fsConstants } from 'fs'
import fs from 'fs/promises'
import multer from 'multer'
import { nanoid } from 'nanoid'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'dist')
const seedDataDir = path.join(__dirname, 'data')
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'runtime-data'))
const productsFile = path.join(dataDir, 'products.json')
const ordersFile = path.join(dataDir, 'orders.json')
const siteContentFile = path.join(dataDir, 'site-content.json')
const newsletterSubscribersFile = path.join(dataDir, 'newsletter-subscribers.json')
const mediaDir = path.join(dataDir, 'media')
const maxImageUploadBytes = 15 * 1024 * 1024
const maxVideoUploadBytes = 250 * 1024 * 1024
const videoUploadChunkBytes = 768 * 1024
const videoUploadTtlMs = 60 * 60 * 1000
const pendingVideoUploads = new Map()

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
  circle: {
    enabled: true,
    orderCompletedPoints: 120,
    paymentVerifiedPoints: 60,
    notificationsPoints: 40,
    recurringCustomerPoints: 80,
    levels: [
      { id: 'guest', label: 'Guest', minScore: 0, description: 'Accesso base al club.', perks: ['Accesso catalogo', 'Area privata'] },
      { id: 'member', label: 'Member', minScore: 180, description: 'Cliente verificato con primi vantaggi.', perks: ['Passport storico', 'Notifiche prioritarie'] },
      { id: 'insider', label: 'Insider', minScore: 420, description: 'Profilo ricorrente con accesso migliorato.', perks: ['Priority processing', 'Private preview'] },
      { id: 'priority', label: 'Priority', minScore: 760, description: 'Corsia preferenziale sui drop selezionati.', perks: ['Reserved access', 'Fast reorder'] },
      { id: 'vault', label: 'Vault', minScore: 1200, description: 'Massimo livello CAMPO Circle.', perks: ['Vault drops', 'Accesso riservato'] },
    ],
  },
}

const app = express()
const port = Number(process.env.API_PORT || 3001)
const sessionSecret = process.env.SESSION_SECRET || 'campoclaro-dev-secret'
const adminIds = new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(v => v.trim()).filter(Boolean))
const ccppFee = 50
const meetupDepositRate = 0.25
const autoDeliverCheckMs = 60 * 60 * 1000
const cryptoPaymentCheckMs = Number(process.env.CRYPTO_PAYMENT_CHECK_MS || 120000)
const cryptoPaymentTolerance = Number(process.env.CRYPTO_PAYMENT_TOLERANCE || 0.005)
const btcMinConfirmations = Number(process.env.BTC_MIN_CONFIRMATIONS || 1)
const ethMinConfirmations = Number(process.env.ETH_MIN_CONFIRMATIONS || 12)
const tronMinConfirmations = Number(process.env.TRON_MIN_CONFIRMATIONS || 1)
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
const cryptoMeta = {
  BTC: { coingeckoId: 'bitcoin', decimals: 8, displayDecimals: 8 },
  ETH: { coingeckoId: 'ethereum', decimals: 18, displayDecimals: 6 },
  USDT_TRX: { coingeckoId: 'tether', decimals: 6, displayDecimals: 2 },
}
const usdtTronContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
let cryptoRateCache = { at: 0, rates: null }

const telegramApiBase = process.env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
  : ''
const telegramBotUsername = String(process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '')
const telegramLoginTtlMs = 10 * 60 * 1000
const telegramLoginRequests = new Map()

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`)
  return response.json()
}

async function getCryptoRatesEur() {
  if (cryptoRateCache.rates && Date.now() - cryptoRateCache.at < 5 * 60 * 1000) return cryptoRateCache.rates
  const ids = Object.values(cryptoMeta).map(meta => meta.coingeckoId).join(',')
  const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=eur`)
  const rates = {
    BTC: Number(data.bitcoin?.eur || 0),
    ETH: Number(data.ethereum?.eur || 0),
    USDT_TRX: Number(data.tether?.eur || 0),
  }
  if (!rates.BTC || !rates.ETH || !rates.USDT_TRX) throw new Error('Crypto rates unavailable')
  cryptoRateCache = { at: Date.now(), rates }
  return rates
}

function cryptoAmountForEur(totalEur, currency, rate) {
  const meta = cryptoMeta[currency] || cryptoMeta.BTC
  const raw = Number(totalEur) / Number(rate)
  const factor = 10 ** meta.displayDecimals
  return (Math.ceil(raw * factor) / factor).toFixed(meta.displayDecimals)
}

function meetupDepositForTotal(totalEur) {
  return Math.max(0, Math.floor(Number(totalEur || 0) * meetupDepositRate))
}

function cryptoPaymentUri(currency, address, amount) {
  if (currency === 'BTC') return `bitcoin:${address}?amount=${amount}`
  if (currency === 'ETH') return `ethereum:${address}`
  return address
}

function cryptoAmountForOrder(amount, order) {
  const currency = order.cryptoCurrency === 'USDT' ? 'USDT_TRX' : order.cryptoCurrency
  const decimals = (cryptoMeta[currency] || cryptoMeta.BTC).displayDecimals
  return Math.max(0, Number(amount || 0)).toFixed(decimals)
}

async function answerTelegramCallback(callbackQueryId, text = '') {
  if (!telegramApiBase || !callbackQueryId) return
  try {
    await fetch(`${telegramApiBase}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
  } catch (error) {
    console.error('Telegram callback answer failed:', error.message)
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

function cryptoPaymentAmounts(order) {
  const due = Number(order.paymentDueEur ?? order.total ?? 0)
  const paid = Number(order.cryptoPaidEur || 0)
  return {
    due: Number(due.toFixed(2)),
    paid: Number(Math.min(Number(order.total || due), paid).toFixed(2)),
    paymentRemaining: Number(Math.max(0, due - paid).toFixed(2)),
    orderRemaining: Number(Math.max(0, Number(order.total || 0) - paid).toFixed(2)),
  }
}

async function getCustomerSupportLink() {
  const content = normalizeSiteContent(await readJson(siteContentFile, defaultSiteContent))
  const contact = content.contacts.find(item => /telegram/i.test(item.label) && item.url)
    || content.contacts.find(item => item.url)
  if (!contact?.url) return ''
  const label = contact.value || contact.label || 'Contatto ufficiale'
  return `<a href="${escapeHtml(contact.url)}">${escapeHtml(label)}</a>`
}

async function notifyCustomerOrderUpdate(order, event, { needsSupport = false } = {}) {
  if (order.notificationsEnabled === false || !order.customer?.id) return null

  const isMeetup = order.delivery === 'meetup'
  const statusLabel = isMeetup
    ? ({ new: 'In attesa', processing: 'Approvato', cancelled: 'Cancellato' }[order.status] || order.status)
    : ({ new: 'Ricevuto', processing: 'In lavorazione', shipped: 'In transito', completed: 'Completato', cancelled: 'Annullato' }[order.status] || order.status)
  const titles = {
    created: isMeetup ? 'Richiesta Meetup ricevuta.' : 'Ordine ricevuto.',
    new: 'Stato ordine aggiornato.',
    payment_reported: 'Pagamento segnalato, verifica in corso.',
    payment_partial: 'Pagamento parziale rilevato.',
    payment_confirmed: 'Pagamento confermato.',
    processing: isMeetup ? 'Meetup approvato.' : 'Ordine in lavorazione.',
    shipped: 'Spedizione aggiornata.',
    completed: 'Ordine completato.',
    cancelled: isMeetup ? 'Meetup cancellato.' : 'Ordine annullato.',
  }
  const lines = [
    `<b>${titles[event] || 'Aggiornamento ordine'}</b>`,
    `<b>Ordine:</b> ${escapeHtml(order.id)}`,
    `<b>Stato:</b> ${escapeHtml(statusLabel)}`,
  ]

  if (event === 'created' && isMeetup && order.paymentDueEur) {
    lines.push(`<b>Acconto Meetup 25% da pagare:</b> €${escapeHtml(order.paymentDueEur)}`)
  }

  if (event === 'payment_confirmed') {
    lines.push(`<b>${isMeetup ? 'Acconto Meetup 25%' : 'Pagamento'}:</b> ${order.payment === 'crypto'
      ? `${escapeHtml(order.cryptoCurrency)} ${escapeHtml(order.cryptoPaidAmount || '')}`.trim()
      : 'CCPP confermato'}`)
    if (order.cryptoTxHash) lines.push(`TX: <code>${escapeHtml(order.cryptoTxHash)}</code>`)
  }

  if (event === 'payment_partial') {
    lines.push(
      `<b>Ricevuto:</b> ${escapeHtml(order.cryptoPaidAmount || '0')} ${escapeHtml(order.cryptoCurrency || '')}`,
      `<b>Da integrare:</b> €${escapeHtml(order.cryptoRemainingEur || 0)} · ${escapeHtml(order.cryptoRemainingAmount || '0')} ${escapeHtml(order.cryptoCurrency || '')}`,
    )
    if (order.cryptoTxHash) lines.push(`TX: <code>${escapeHtml(order.cryptoTxHash)}</code>`)
  }

  if (event === 'payment_reported' && order.paymentProof) {
    lines.push(`TX segnalata: <code>${escapeHtml(order.paymentProof)}</code>`)
  }

  if (order.trackingNumber && ['shipped', 'completed'].includes(event)) {
    lines.push(
      `<b>Corriere:</b> ${escapeHtml(order.trackingProvider || order.courier || 'Corriere')}`,
      `Tracking: <code>${escapeHtml(order.trackingNumber)}</code>`,
      order.trackingUrl ? `<a href="${escapeHtml(order.trackingUrl)}">Apri tracking ufficiale</a>` : '',
    )
  }

  if (event === 'cancelled' || needsSupport) {
    const supportLink = await getCustomerSupportLink()
    if (supportLink) {
      lines.push('', event === 'cancelled' ? 'Per dettagli contatta subito lo staff:' : 'Se hai bisogno di assistenza contatta lo staff:', supportLink)
    }
  }

  return sendTelegramMessage(order.customer.id, lines.filter(Boolean).join('\n'))
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
  const paymentLabel = order.payment === 'crypto'
    ? `${escapeHtml(order.cryptoCurrency)} ${escapeHtml(order.cryptoNetwork)} · ${escapeHtml(order.paymentStatus)}`
    : order.payment === 'ccpp'
      ? `CCPP · ${escapeHtml(order.paymentStatus)}`
      : 'Meetup / da concordare'
  const cryptoAmounts = order.payment === 'crypto' ? cryptoPaymentAmounts(order) : null
  const lines = [
    `<b>${escapeHtml(reason)}</b>`,
    `<b>Ordine:</b> ${escapeHtml(order.id)}`,
    `<b>Cliente:</b> ${escapeHtml(formatCustomer(order.customer))}`,
    `<b>Consegna:</b> ${isMeetup ? 'Meetup Barcellona' : 'Spedizione'}`,
    order.courier ? `<b>Corriere scelto:</b> ${escapeHtml(order.courier)}` : '',
    `<b>Pagamento:</b> ${paymentLabel}`,
    `<b>Totale:</b> €${order.total}`,
    isMeetup && order.paymentDueEur ? `<b>Acconto Meetup 25%:</b> €${order.paymentDueEur}` : '',
    cryptoAmounts ? `<b>Gia pagato:</b> €${cryptoAmounts.paid}` : '',
    cryptoAmounts && isMeetup ? `<b>Manca per acconto:</b> €${cryptoAmounts.paymentRemaining}` : '',
    cryptoAmounts ? `<b>Saldo ordine restante:</b> €${cryptoAmounts.orderRemaining}` : '',
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

  if (!isMeetup) {
    lines.push('', 'Per inviare il tracking al cliente, rispondi con il codice. Puoi anche scrivere: UPS 1Z..., InPost ..., SEUR ..., GLS ...')
  }

  const orders = await readJson(ordersFile, [])
  const storedOrder = orders.find(item => item.id === order.id)
  for (const adminId of adminIds) {
    const message = await sendTelegramMessage(adminId, lines.filter(Boolean).join('\n'), {
      reply_markup: {
        inline_keyboard: isMeetup ? [
          [{ text: 'Acconto pagato', callback_data: `cc:paid:${order.id}` }],
          [
            { text: 'Approvato', callback_data: `cc:processing:${order.id}` },
            { text: 'Cancellato', callback_data: `cc:cancelled:${order.id}` },
          ],
        ] : [
          [
            { text: 'Pagato', callback_data: `cc:paid:${order.id}` },
            { text: 'In lavoro', callback_data: `cc:processing:${order.id}` },
          ],
          [
            { text: 'Completato', callback_data: `cc:completed:${order.id}` },
            { text: 'Annulla', callback_data: `cc:cancelled:${order.id}` },
          ],
        ],
      },
    })
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

async function initializeDataDir() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(mediaDir, { recursive: true })
  const mediaFiles = await fs.readdir(mediaDir)
  await Promise.all(
    mediaFiles
      .filter(fileName => fileName.startsWith('.upload-') && fileName.endsWith('.part'))
      .map(fileName => fs.rm(path.join(mediaDir, fileName), { force: true })),
  )
  for (const fileName of ['products.json', 'orders.json', 'site-content.json']) {
    const target = path.join(dataDir, fileName)
    try {
      await fs.copyFile(path.join(seedDataDir, fileName), target, fsConstants.COPYFILE_EXCL)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
  }
  const products = await readJson(productsFile, [])
  if (!Array.isArray(products) || products.length === 0) {
    await fs.copyFile(path.join(seedDataDir, 'products.json'), productsFile)
    return
  }
  const deprecatedGradients = new Set([
    'linear-gradient(135deg, #8B6914 0%, #DAA520 58%, #FFD700 100%)',
    'linear-gradient(135deg, #FF6B9D 0%, #FFA500 40%, #00D4FF 100%)',
    'linear-gradient(135deg, #071522 0%, #12384a 58%, #030608 100%)',
  ])
  const seededProductIds = new Set(['filtrato', 'cali-spain-sherbet', 'frozen-moe-farm'])
  let changed = false
  const normalizedProducts = products.map(product => {
    if (!seededProductIds.has(product.id) || !deprecatedGradients.has(product.gradient)) return product
    changed = true
    return {
      ...product,
      gradient: 'linear-gradient(135deg, #08080a 0%, #17131d 55%, #030304 100%)',
      glowColor: 'rgba(214,178,94,0.12)',
    }
  })
  if (changed) {
    await writeJson(productsFile, normalizedProducts)
  }
}

const mediaStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, mediaDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 8)
    callback(null, `${Date.now()}-${nanoid(10)}${extension}`)
  },
})

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const imageUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: maxImageUploadBytes },
  fileFilter: (_req, file, callback) => callback(null, allowedImageTypes.has(file.mimetype)),
})

const videoUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: maxVideoUploadBytes },
  fileFilter: (_req, file, callback) => callback(null, allowedVideoTypes.has(file.mimetype)),
})

async function removeExpiredVideoUploads() {
  const now = Date.now()
  for (const [uploadId, upload] of pendingVideoUploads) {
    if (upload.expiresAt > now) continue
    pendingVideoUploads.delete(uploadId)
    await fs.rm(upload.temporaryPath, { force: true }).catch(() => undefined)
  }
}

function videoMediaFilename(originalName) {
  const extension = path.extname(String(originalName || '')).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 8)
  return `${Date.now()}-${nanoid(10)}${extension}`
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

function telegramUserFromMessage(from, role) {
  return {
    id: String(from.id),
    firstName: from.first_name || '',
    lastName: from.last_name || '',
    username: from.username || '',
    photoUrl: '',
    role,
  }
}

function beginTelegramLogin(scope, res) {
  if (!telegramApiBase || !telegramBotUsername) {
    return res.status(503).json({ error: 'Configura TELEGRAM_BOT_TOKEN e TELEGRAM_BOT_USERNAME' })
  }
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Configura TELEGRAM_WEBHOOK_SECRET per autorizzare tramite /start' })
  }
  if (scope === 'admin' && adminIds.size === 0) {
    return res.status(503).json({ error: 'Configura ADMIN_TELEGRAM_IDS' })
  }
  const now = Date.now()
  for (const [id, login] of telegramLoginRequests) {
    if (login.expiresAt <= now) telegramLoginRequests.delete(id)
  }
  const requestId = `cc_${scope === 'admin' ? 'a' : 'c'}_${nanoid(32)}`
  const expiresAt = now + telegramLoginTtlMs
  telegramLoginRequests.set(requestId, { scope, expiresAt, user: null })
  return res.json({
    requestId,
    botUrl: `https://t.me/${telegramBotUsername}?start=${requestId}`,
    expiresAt: new Date(expiresAt).toISOString(),
  })
}

function completeTelegramLogin(scope, req, res) {
  const login = telegramLoginRequests.get(req.params.requestId)
  if (!login || login.scope !== scope || login.expiresAt <= Date.now()) {
    telegramLoginRequests.delete(req.params.requestId)
    return res.status(404).json({ error: 'Link Telegram scaduto. Riprova.' })
  }
  if (!login.user) return res.json({ status: 'pending' })

  telegramLoginRequests.delete(req.params.requestId)
  if (scope === 'admin') {
    res.cookie('cc_session', signSession(login.user), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 })
  } else {
    res.cookie('cc_customer', signSession(login.user), { httpOnly: true, sameSite: 'lax', maxAge: 30 * 86400 * 1000 })
    if (login.user.role === 'admin') {
      res.cookie('cc_session', signSession(login.user), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 })
    }
  }
  return res.json({ status: 'complete', user: login.user })
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
  const filters = Array.isArray(input.filters) ? input.filters.map(String).map(v => v.trim()).filter(Boolean) : existing.filters || []
  const mediaUrls = (value, max) => Array.isArray(value)
    ? [...new Set(value.map(String).map(v => v.trim()).filter(Boolean))].slice(0, max)
    : []
  const fallbackId = String(input.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || nanoid(10)
  return {
    ...existing,
    id: String(input.id || existing.id || fallbackId).trim(),
    name: String(input.name || '').trim(),
    category: String(filters[0] || '').trim(),
    description: String(input.description || '').trim(),
    longDescription: String(input.longDescription || '').trim(),
    prices: Object.fromEntries(Object.entries(prices).map(([k, v]) => [String(k), Number(v)]).filter(([, v]) => Number.isFinite(v))),
    filters,
    strains: Array.isArray(input.strains) ? input.strains.map(String).map(v => v.trim()).filter(Boolean) : existing.strains || [],
    images: mediaUrls(input.images ?? existing.images, 5),
    videos: mediaUrls(input.videos ?? existing.videos, 8),
    thc: String(input.thc || '').trim(),
    cbd: String(input.cbd || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.map(String).map(v => v.trim()).filter(Boolean).slice(0, 2) : [],
    gradient: String(input.gradient || existing.gradient || 'linear-gradient(135deg, #111 0%, #222 60%, #050505 100%)'),
    glowColor: String(input.glowColor || existing.glowColor || 'rgba(214,178,94,0.12)'),
    circleMinLevel: String(input.circleMinLevel || existing.circleMinLevel || '').trim(),
    circleScoreBoost: Number.isFinite(Number(input.circleScoreBoost)) ? Math.max(0, Number(input.circleScoreBoost)) : Number(existing.circleScoreBoost || 0),
    circlePrivateDrop: input.circlePrivateDrop === true,
    active: input.active !== false,
  }
}

function createProductId(name, products) {
  const base = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${nanoid(8)}`
  const ids = new Set(products.map(product => product.id))
  if (!ids.has(base)) return base
  let suffix = 2
  while (ids.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function normalizeSiteContent(input = {}) {
  const circleInput = input.circle && typeof input.circle === 'object' ? input.circle : defaultSiteContent.circle
  const circleLevels = Array.isArray(circleInput.levels)
    ? circleInput.levels.map((level, index) => ({
      id: String(level.id || level.label || `level-${index + 1}`).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `level-${index + 1}`,
      label: String(level.label || '').trim(),
      minScore: Math.max(0, Number(level.minScore || 0)),
      description: String(level.description || '').trim(),
      perks: Array.isArray(level.perks) ? level.perks.map(String).map(v => v.trim()).filter(Boolean).slice(0, 6) : [],
    })).filter(level => level.label)
    : defaultSiteContent.circle.levels
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
    circle: {
      enabled: circleInput.enabled !== false,
      orderCompletedPoints: Math.max(0, Number(circleInput.orderCompletedPoints ?? defaultSiteContent.circle.orderCompletedPoints)),
      paymentVerifiedPoints: Math.max(0, Number(circleInput.paymentVerifiedPoints ?? defaultSiteContent.circle.paymentVerifiedPoints)),
      notificationsPoints: Math.max(0, Number(circleInput.notificationsPoints ?? defaultSiteContent.circle.notificationsPoints)),
      recurringCustomerPoints: Math.max(0, Number(circleInput.recurringCustomerPoints ?? defaultSiteContent.circle.recurringCustomerPoints)),
      levels: circleLevels.sort((a, b) => a.minScore - b.minScore),
    },
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

function isCryptoWalletBusy(order) {
  if (order.payment !== 'crypto' || !order.cryptoWallet) return false
  if (['completed', 'cancelled'].includes(order.status)) return false
  return ['awaiting_crypto', 'paid_reported', 'partially_paid'].includes(order.paymentStatus || 'awaiting_crypto')
}

function cryptoOrderNeedsCheck(order) {
  return order.payment === 'crypto' &&
    order.cryptoWallet &&
    order.cryptoExpectedAmount &&
    !['paid_confirmed'].includes(order.paymentStatus || '') &&
    !['completed', 'cancelled'].includes(order.status)
}

function paymentIsForOrder(order, timestampMs) {
  const createdAt = Date.parse(order.createdAt)
  return !Number.isFinite(timestampMs) || timestampMs >= createdAt
}

async function findBtcPayment(order) {
  const address = order.cryptoWallet
  const txLists = await Promise.allSettled([
    fetchJson(`https://mempool.space/api/address/${address}/txs`),
    fetchJson(`https://mempool.space/api/address/${address}/txs/mempool`),
  ])
  const txs = txLists.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])
  const seen = new Set()
  let received = 0
  let txHash = ''
  for (const tx of txs) {
    if (!tx.txid || seen.has(tx.txid)) continue
    seen.add(tx.txid)
    const confirmed = tx.status?.confirmed === true
    if (btcMinConfirmations > 0 && !confirmed) continue
    const timestampMs = confirmed && tx.status?.block_time ? Number(tx.status.block_time) * 1000 : Date.now()
    if (!paymentIsForOrder(order, timestampMs)) continue
    const sats = (tx.vout || [])
      .filter(output => String(output.scriptpubkey_address || '').toLowerCase() === address.toLowerCase())
      .reduce((sum, output) => sum + Number(output.value || 0), 0)
    const amount = sats / 1e8
    if (amount <= 0) continue
    received += amount
    txHash = tx.txid
  }
  return received > 0 ? { txHash, amount: received, confirmations: btcMinConfirmations } : null
}

async function findEthPayment(order) {
  const address = order.cryptoWallet
  const data = await fetchJson(`https://eth.blockscout.com/api/v2/addresses/${address}/transactions`)
  const txs = Array.isArray(data.items) ? data.items : []
  let received = 0
  let txHash = ''
  for (const tx of txs) {
    const to = tx.to?.hash || tx.to_address_hash || tx.to
    if (String(to || '').toLowerCase() !== address.toLowerCase()) continue
    if (tx.result && tx.result !== 'success') continue
    const confirmations = Number(tx.confirmations || 0)
    if (ethMinConfirmations > 0 && confirmations > 0 && confirmations < ethMinConfirmations) continue
    const timestampMs = Date.parse(tx.timestamp || tx.block_timestamp || '')
    if (!paymentIsForOrder(order, timestampMs)) continue
    const amount = Number(tx.value || 0) / 1e18
    if (amount <= 0) continue
    received += amount
    txHash = tx.hash || tx.transaction_hash || txHash
  }
  return received > 0 ? { txHash, amount: received } : null
}

async function findUsdtTrxPayment(order) {
  const address = order.cryptoWallet
  const data = await fetchJson(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?contract_address=${usdtTronContract}&only_confirmed=true&limit=50`)
  const txs = Array.isArray(data.data) ? data.data : []
  let received = 0
  let txHash = ''
  for (const tx of txs) {
    const to = tx.to || tx.to_address
    if (String(to || '').toLowerCase() !== address.toLowerCase()) continue
    const decimals = Number(tx.token_info?.decimals || 6)
    const timestampMs = Number(tx.block_timestamp || tx.timestamp || 0)
    if (!paymentIsForOrder(order, timestampMs)) continue
    const amount = Number(tx.value || 0) / (10 ** decimals)
    if (amount <= 0) continue
    received += amount
    txHash = tx.transaction_id || txHash
  }
  return received > 0 ? { txHash, amount: received, confirmations: tronMinConfirmations } : null
}

async function findCryptoPayment(order) {
  if (order.cryptoCurrency === 'BTC') return findBtcPayment(order)
  if (order.cryptoCurrency === 'ETH') return findEthPayment(order)
  if (order.cryptoCurrency === 'USDT') return findUsdtTrxPayment(order)
  return null
}

async function updateCryptoPayment(order, payment) {
  const received = Number(payment.amount || 0)
  const previouslyReceived = Number(order.cryptoPaidAmount || 0)
  const expected = Number(order.cryptoExpectedAmount || 0)
  const fullyPaid = received >= expected * (1 - cryptoPaymentTolerance)
  if (received <= previouslyReceived && (!fullyPaid || order.paymentStatus === 'paid_confirmed')) return false

  const paidEur = received * Number(order.cryptoRateEur || 0)
  order.cryptoPaidAmount = cryptoAmountForOrder(received, order)
  const paymentDueEur = Number(order.paymentDueEur ?? order.total ?? 0)
  order.cryptoPaidEur = Number(Math.min(paymentDueEur, paidEur).toFixed(2))
  order.cryptoRemainingAmount = cryptoAmountForOrder(Math.max(0, expected - received), order)
  order.cryptoRemainingEur = fullyPaid ? 0 : Number(Math.max(0, paymentDueEur - paidEur).toFixed(2))
  order.cryptoTxHash = payment.txHash || ''
  order.updatedAt = new Date().toISOString()

  if (!fullyPaid) {
    order.paymentStatus = 'partially_paid'
    await notifyCustomerOrderUpdate(order, 'payment_partial')
    for (const adminId of adminIds) {
      const amounts = cryptoPaymentAmounts(order)
      await sendTelegramMessage(adminId, [
        '<b>Pagamento crypto parziale rilevato</b>',
        `<b>Ordine:</b> ${escapeHtml(order.id)}`,
        `<b>Ricevuto:</b> ${escapeHtml(order.cryptoPaidAmount)} ${escapeHtml(order.cryptoCurrency)}`,
        `<b>Gia pagato:</b> €${amounts.paid}`,
        `<b>Da integrare:</b> €${escapeHtml(order.cryptoRemainingEur)} · ${escapeHtml(order.cryptoRemainingAmount)} ${escapeHtml(order.cryptoCurrency)}`,
        `<b>Saldo ordine restante:</b> €${amounts.orderRemaining}`,
      ].join('\n'))
    }
    return true
  }

  order.paymentStatus = 'paid_confirmed'
  if (order.status === 'new') order.status = 'processing'
  order.cryptoPaidAt = order.updatedAt
  await notifyCustomerOrderUpdate(order, 'payment_confirmed')

  if (order.delivery === 'meetup') {
    await notifyAdmins(order, 'Meetup: acconto 25% pagato')
    return true
  }

  for (const adminId of adminIds) {
    const amounts = cryptoPaymentAmounts(order)
    await sendTelegramMessage(adminId, [
      `<b>Pagamento crypto confermato automaticamente</b>`,
      `<b>Ordine:</b> ${escapeHtml(order.id)}`,
      `<b>Importo:</b> ${escapeHtml(order.cryptoPaidAmount)} ${escapeHtml(order.cryptoCurrency)}`,
      `<b>Gia pagato:</b> €${amounts.paid}`,
      order.delivery === 'meetup' ? `<b>Saldo ordine restante:</b> €${amounts.orderRemaining}` : '',
      order.cryptoTxHash ? `<b>TX:</b> <code>${escapeHtml(order.cryptoTxHash)}</code>` : '',
    ].filter(Boolean).join('\n'))
  }
  return true
}

async function checkPendingCryptoPayments() {
  const orders = await readJson(ordersFile, [])
  let changed = false
  for (const order of orders.filter(cryptoOrderNeedsCheck)) {
    try {
      const payment = await findCryptoPayment(order)
      if (!payment) continue
      changed = await updateCryptoPayment(order, payment) || changed
    } catch (error) {
      console.error(`Crypto payment check failed for ${order.id}:`, error.message)
    }
  }
  if (changed) await writeJson(ordersFile, orders)
}

function publicCryptoWallets(orders = []) {
  const busyWallets = new Set(orders.filter(isCryptoWalletBusy).map(order => String(order.cryptoWallet).toLowerCase()))
  return Object.entries(cryptoWallets).map(([id, wallet]) => ({
    id,
    label: wallet.label,
    network: wallet.network,
    address: wallet.address,
    busy: busyWallets.has(wallet.address.toLowerCase()),
  }))
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

    await notifyCustomerOrderUpdate(order, 'completed', { needsSupport: true })
  }

  if (changed) await writeJson(ordersFile, orders)
}

async function applyAdminOrderAction(orderId, action) {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === orderId)
  if (!order) return null
  if (order.delivery === 'meetup' && !['paid', 'processing', 'cancelled'].includes(action)) return null

  if (action === 'paid') {
    order.paymentStatus = 'paid_confirmed'
    if (order.payment === 'crypto') {
      order.cryptoPaidAmount = order.cryptoExpectedAmount || order.cryptoPaidAmount || ''
      order.cryptoPaidEur = Number(order.paymentDueEur ?? order.total ?? 0)
      order.cryptoRemainingAmount = cryptoAmountForOrder(0, order)
      order.cryptoRemainingEur = 0
    }
    if (order.status === 'new') order.status = 'processing'
  } else if (['new', 'processing', 'shipped', 'completed', 'cancelled'].includes(action)) {
    order.status = action
    if (action === 'shipped' && !order.shippedAt) order.shippedAt = new Date().toISOString()
    if (action === 'completed' && !order.deliveredAt) order.deliveredAt = new Date().toISOString()
  } else {
    return null
  }

  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)

  await notifyCustomerOrderUpdate(order, action === 'paid' ? 'payment_confirmed' : action, { needsSupport: action === 'completed' })

  return order
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

app.get('/api/crypto-wallets', async (_req, res) => {
  const orders = await readJson(ordersFile, [])
  res.json(publicCryptoWallets(orders))
})

app.post('/api/orders', async (req, res) => {
  const { items, delivery, payment: requestedPayment, address } = req.body
  const customer = readCustomerSession(req)
  if (!customer?.id) return res.status(401).json({ error: 'Accesso Telegram richiesto per ordinare' })
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' })
  if (!['ship', 'meetup'].includes(delivery)) return res.status(400).json({ error: 'Invalid delivery method' })
  const payment = delivery === 'meetup' ? 'crypto' : requestedPayment
  if (!['crypto', 'ccpp'].includes(payment)) return res.status(400).json({ error: 'Invalid payment method' })

  const cleanAddress = address && typeof address === 'object' ? address : {}
  if (delivery === 'ship' && (!String(cleanAddress.via || '').trim() || !String(cleanAddress.city || '').trim() || !String(cleanAddress.cap || '').trim())) {
    return res.status(400).json({ error: 'Shipping address is required' })
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  const productsForCircle = await readJson(productsFile, [])
  const productById = new Map(productsForCircle.map(product => [String(product.id), product]))
  const orderItems = items.map(item => {
    const product = productById.get(String(item.id))
    const circleScoreBoost = Math.max(0, Number(product?.circleScoreBoost || 0))
    return {
      productId: String(item.id),
      name: String(item.name),
      weight: String(item.weight),
      strain: String(item.strain || ''),
      price: Number(item.price),
      quantity: Number(item.quantity),
      circleScoreBoost,
      circlePrivateDrop: product?.circlePrivateDrop === true,
      circleMinLevel: String(product?.circleMinLevel || ''),
    }
  })
  const circleScoreAward = orderItems.reduce((sum, item) => sum + Number(item.circleScoreBoost || 0) * Number(item.quantity || 1), 0)
  const fees = payment === 'ccpp' ? ccppFee : 0
  const total = subtotal + fees
  const paymentDueEur = delivery === 'meetup' ? meetupDepositForTotal(total) : total
  const paymentDescription = delivery === 'meetup' ? 'Acconto Meetup 25%' : 'Pagamento ordine'
  const cryptoCurrency = String(req.body.cryptoCurrency || 'BTC')
  const cryptoPayment = payment === 'crypto' ? cryptoWallets[cryptoCurrency] || cryptoWallets.BTC : null
  const rates = cryptoPayment ? await getCryptoRatesEur() : null
  const cryptoExpectedAmount = cryptoPayment ? cryptoAmountForEur(paymentDueEur, cryptoCurrency, rates[cryptoCurrency]) : ''
  if (cryptoPayment) {
    const orders = await readJson(ordersFile, [])
    if (publicCryptoWallets(orders).find(wallet => wallet.id === cryptoCurrency)?.busy) {
      return res.status(409).json({ error: delivery === 'meetup' ? 'Wallet temporaneamente occupato. Scegli un altra valuta.' : 'Wallet temporaneamente occupato. Scegli un altra valuta o CCPP.' })
    }
  }
  const requestedCourier = String(req.body.courier || 'UPS').trim()
  const courier = delivery === 'ship' && allowedCouriers.has(requestedCourier) ? requestedCourier : ''

  const orderId = `CC-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`
  const passportId = `CP-${nanoid(10).toUpperCase()}`
  const verificationCode = crypto
    .createHash('sha256')
    .update(`${orderId}:${customer.id}:${sessionSecret}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()

  const order = {
    id: orderId,
    passportId,
    verificationCode,
    passportIssuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    status: 'new',
    delivery,
    courier,
    payment,
    paymentStatus: payment === 'crypto' ? 'awaiting_crypto' : 'pending',
    paymentDueEur,
    paymentDescription,
    cryptoCurrency: cryptoPayment?.label || '',
    cryptoNetwork: cryptoPayment?.network || '',
    cryptoWallet: cryptoPayment?.address || '',
    cryptoExpectedAmount,
    cryptoExpectedUnit: cryptoPayment?.label || '',
    cryptoRateEur: cryptoPayment ? rates[cryptoCurrency] : 0,
    cryptoRateAt: cryptoPayment ? new Date().toISOString() : '',
    cryptoPaymentUri: cryptoPayment ? cryptoPaymentUri(cryptoCurrency, cryptoPayment.address, cryptoExpectedAmount) : '',
    cryptoPaidAmount: '',
    cryptoPaidEur: 0,
    cryptoRemainingAmount: cryptoExpectedAmount,
    cryptoRemainingEur: cryptoPayment ? paymentDueEur : 0,
    customer,
    notificationsEnabled: req.body.notificationsEnabled !== false,
    trackingNumber: '',
    trackingProvider: 'Auto Free',
    trackingUrl: '',
    address: cleanAddress,
    items: orderItems,
    subtotal,
    fees,
    total,
    circleScoreAward,
  }

  const orders = await readJson(ordersFile, [])
  orders.unshift(order)
  await writeJson(ordersFile, orders)
  await notifyCustomerOrderUpdate(order, 'created')
  if (payment === 'ccpp') {
    await notifyAdmins(order, 'Nuovo ordine CCPP')
  }
  res.status(201).json(order)
})

app.get('/api/orders/:id/public', async (req, res) => {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json({
    id: order.id,
    passportId: order.passportId || '',
    verificationCode: order.verificationCode || '',
    passportIssuedAt: order.passportIssuedAt || order.createdAt,
    createdAt: order.createdAt,
    status: order.status,
    payment: order.payment,
    total: order.total,
    paymentDueEur: order.paymentDueEur ?? order.total,
    paymentDescription: order.paymentDescription || 'Pagamento ordine',
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber || '',
    trackingProvider: order.trackingProvider || '',
    trackingUrl: order.trackingUrl || '',
    cryptoExpectedAmount: order.cryptoExpectedAmount || '',
    cryptoExpectedUnit: order.cryptoExpectedUnit || '',
    cryptoCurrency: order.cryptoCurrency || '',
    cryptoNetwork: order.cryptoNetwork || '',
    cryptoWallet: order.cryptoWallet || '',
    cryptoRateEur: order.cryptoRateEur || 0,
    cryptoPaymentUri: order.cryptoPaymentUri || '',
    cryptoPaidAmount: order.cryptoPaidAmount || '',
    cryptoPaidEur: order.cryptoPaidEur || 0,
    cryptoRemainingAmount: order.cryptoRemainingAmount || order.cryptoExpectedAmount || '',
    cryptoRemainingEur: order.cryptoRemainingEur ?? order.total ?? 0,
    cryptoTxHash: order.cryptoTxHash || '',
  })
})

app.post('/api/orders/:id/crypto-paid', async (req, res) => {
  const orders = await readJson(ordersFile, [])
  const order = orders.find(item => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.payment !== 'crypto') return res.status(400).json({ error: 'Order is not crypto' })

  if (order.paymentStatus !== 'partially_paid') order.paymentStatus = 'paid_reported'
  order.paymentProof = String(req.body.txHash || '').trim()
  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)
  await notifyCustomerOrderUpdate(order, 'payment_reported')
  await notifyAdmins(order, 'Pagamento crypto segnalato')
  res.json(order)
})

app.post('/api/auth/telegram/start', (_req, res) => {
  beginTelegramLogin('admin', res)
})

app.get('/api/auth/telegram/status/:requestId', (req, res) => {
  completeTelegramLogin('admin', req, res)
})

app.post('/api/customer/telegram/start', (_req, res) => {
  beginTelegramLogin('customer', res)
})

app.get('/api/customer/telegram/status/:requestId', (req, res) => {
  completeTelegramLogin('customer', req, res)
})

app.get('/api/customer/me', (req, res) => {
  res.json({ user: readCustomerSession(req) })
})

app.get('/api/customer/orders', async (req, res) => {
  const customer = readCustomerSession(req)
  if (!customer?.id) return res.status(401).json({ error: 'Accesso Telegram richiesto' })
  const orders = await readJson(ordersFile, [])
  res.json(orders.filter(order => String(order.customer?.id || '') === String(customer.id)))
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
  res.clearCookie('cc_customer')
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: readSession(req) })
})

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  const [products, orders, subscribers] = await Promise.all([readJson(productsFile, []), readJson(ordersFile, []), readJson(newsletterSubscribersFile, [])])
  const customerIds = new Set([
    ...orders.map(order => String(order.customer?.id || '')).filter(Boolean),
    ...subscribers.map(subscriber => String(subscriber.id || '')).filter(Boolean),
  ])
  res.json({
    products: products.length,
    orders: orders.length,
    revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    pending: orders.filter(order => ['new', 'processing'].includes(order.status)).length,
    newsletterSubscribers: subscribers.filter(item => item.enabled === true).length,
    customers: customerIds.size,
  })
})

app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
  const [orders, subscribers] = await Promise.all([readJson(ordersFile, []), readJson(newsletterSubscribersFile, [])])
  const customers = new Map()
  const ensureCustomer = customer => {
    const id = String(customer?.id || '').trim()
    if (!id) return null
    if (!customers.has(id)) {
      customers.set(id, {
        id,
        firstName: '',
        lastName: '',
        username: '',
        newsletterEnabled: false,
        ordersCount: 0,
        completedOrders: 0,
        totalSpent: 0,
        lastOrderAt: '',
        lastOrderId: '',
        lastOrderStatus: '',
        firstSeenAt: '',
      })
    }
    const record = customers.get(id)
    record.firstName = record.firstName || String(customer.firstName || '')
    record.lastName = record.lastName || String(customer.lastName || '')
    record.username = record.username || String(customer.username || '')
    return record
  }

  for (const subscriber of subscribers) {
    const record = ensureCustomer(subscriber)
    if (!record) continue
    record.newsletterEnabled = subscriber.enabled === true
    record.firstSeenAt = record.firstSeenAt || subscriber.updatedAt || ''
  }

  for (const order of orders) {
    const record = ensureCustomer(order.customer)
    if (!record) continue
    record.ordersCount += 1
    if (order.status === 'completed') record.completedOrders += 1
    record.totalSpent += Number(order.total || 0)
    const createdAt = String(order.createdAt || '')
    if (!record.firstSeenAt || (createdAt && createdAt < record.firstSeenAt)) record.firstSeenAt = createdAt
    if (!record.lastOrderAt || (createdAt && createdAt > record.lastOrderAt)) {
      record.lastOrderAt = createdAt
      record.lastOrderId = String(order.id || '')
      record.lastOrderStatus = String(order.status || '')
    }
  }

  res.json([...customers.values()].sort((a, b) => String(b.lastOrderAt || b.firstSeenAt).localeCompare(String(a.lastOrderAt || a.firstSeenAt))))
})

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
  res.json(await readJson(productsFile, []))
})

app.post('/api/admin/media/images', requireAdmin, imageUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Carica un file JPG, PNG, WEBP, GIF o AVIF.' })
  res.status(201).json({ url: `/media/${req.file.filename}` })
})

app.post('/api/admin/media/videos', requireAdmin, videoUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Carica un file MP4, WEBM o MOV.' })
  res.status(201).json({ url: `/media/${req.file.filename}` })
})

app.post('/api/admin/media/videos/chunks', requireAdmin, async (req, res, next) => {
  try {
    await removeExpiredVideoUploads()
    const size = Number(req.body.size || 0)
    const type = String(req.body.type || '')
    if (!allowedVideoTypes.has(type)) return res.status(400).json({ error: 'Carica un file MP4, WEBM o MOV.' })
    if (!Number.isInteger(size) || size <= 0) return res.status(400).json({ error: 'Dimensione video non valida.' })
    if (size > maxVideoUploadBytes) return res.status(413).json({ error: 'Video troppo grande: massimo 250 MB per file.' })

    const uploadId = nanoid(24)
    const filename = videoMediaFilename(req.body.name)
    const temporaryPath = path.join(mediaDir, `.upload-${uploadId}.part`)
    await fs.writeFile(temporaryPath, Buffer.alloc(0))
    pendingVideoUploads.set(uploadId, {
      expiresAt: Date.now() + videoUploadTtlMs,
      filename,
      nextChunk: 0,
      received: 0,
      size,
      temporaryPath,
    })
    res.status(201).json({ uploadId, chunkSize: videoUploadChunkBytes })
  } catch (error) {
    next(error)
  }
})

app.put(
  '/api/admin/media/videos/chunks/:uploadId',
  requireAdmin,
  express.raw({ type: 'application/octet-stream', limit: videoUploadChunkBytes + 1024 }),
  async (req, res, next) => {
    try {
      const upload = pendingVideoUploads.get(req.params.uploadId)
      if (!upload || upload.expiresAt <= Date.now()) return res.status(404).json({ error: 'Caricamento video scaduto. Riprova.' })
      const chunkIndex = Number(req.get('X-Chunk-Index'))
      if (chunkIndex !== upload.nextChunk) return res.status(409).json({ error: 'Ordine dei blocchi video non valido. Riprova.' })
      if (!Buffer.isBuffer(req.body) || req.body.length === 0 || upload.received + req.body.length > upload.size) {
        return res.status(400).json({ error: 'Blocco video non valido.' })
      }
      await fs.appendFile(upload.temporaryPath, req.body)
      upload.received += req.body.length
      upload.nextChunk += 1
      upload.expiresAt = Date.now() + videoUploadTtlMs
      res.json({ received: upload.received, total: upload.size })
    } catch (error) {
      next(error)
    }
  },
)

app.post('/api/admin/media/videos/chunks/:uploadId/complete', requireAdmin, async (req, res, next) => {
  try {
    const upload = pendingVideoUploads.get(req.params.uploadId)
    if (!upload) return res.status(404).json({ error: 'Caricamento video non trovato. Riprova.' })
    if (upload.received !== upload.size) return res.status(409).json({ error: 'Caricamento video incompleto.' })
    const completedPath = path.join(mediaDir, upload.filename)
    await fs.rename(upload.temporaryPath, completedPath)
    pendingVideoUploads.delete(req.params.uploadId)
    res.status(201).json({ url: `/media/${upload.filename}` })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/media', requireAdmin, async (req, res) => {
  const url = String(req.body.url || '')
  if (!url.startsWith('/media/')) return res.json({ ok: true })
  const fileName = path.basename(url)
  await fs.rm(path.join(mediaDir, fileName), { force: true })
  res.json({ ok: true })
})

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const products = await readJson(productsFile, [])
  const product = normalizeProduct({ ...req.body, id: createProductId(req.body.name, products) })
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
  const previousTracking = {
    number: order.trackingNumber || '',
    provider: order.trackingProvider || '',
    url: order.trackingUrl || '',
  }

  if (order.delivery === 'meetup' && (req.body.trackingNumber !== undefined || req.body.trackingProvider !== undefined)) {
    return res.status(400).json({ error: 'Tracking is not available for meetup orders' })
  }
  if (req.body.status !== undefined) {
    const nextStatus = String(req.body.status || order.status)
    const allowedStatuses = order.delivery === 'meetup'
      ? ['processing', 'cancelled']
      : ['new', 'processing', 'shipped', 'completed', 'cancelled']
    if (!allowedStatuses.includes(nextStatus)) return res.status(400).json({ error: 'Invalid status for delivery method' })
    const updated = await applyAdminOrderAction(req.params.id, nextStatus)
    if (updated && ['new', 'processing', 'shipped', 'completed', 'cancelled'].includes(String(req.body.status))) return res.json(updated)
    order.status = nextStatus
  }
  if (req.body.trackingNumber !== undefined) {
    const tracking = trackingInfo(String(req.body.trackingNumber || '').trim(), String(req.body.trackingProvider || order.courier || '').trim())
    order.trackingNumber = tracking.trackingNumber
    order.trackingProvider = tracking.provider
    order.trackingUrl = tracking.url
    if (order.trackingNumber && !['completed', 'cancelled'].includes(order.status)) order.status = 'shipped'
    if (order.trackingNumber && order.status === 'shipped' && !order.shippedAt) order.shippedAt = new Date().toISOString()
  } else if (req.body.trackingProvider !== undefined && order.trackingNumber) {
    const info = trackingInfo(order.trackingNumber, String(req.body.trackingProvider || 'Auto Free').trim() || 'Auto Free')
    order.trackingProvider = info.provider
    order.trackingUrl = info.url
  }

  order.updatedAt = new Date().toISOString()
  await writeJson(ordersFile, orders)
  const trackingChanged = previousTracking.number !== (order.trackingNumber || '')
    || previousTracking.provider !== (order.trackingProvider || '')
    || previousTracking.url !== (order.trackingUrl || '')
  if (trackingChanged && order.trackingNumber) {
    await notifyCustomerOrderUpdate(order, 'shipped')
  }
  res.json(order)
})

app.post('/api/telegram/webhook', async (req, res) => {
  if (process.env.TELEGRAM_WEBHOOK_SECRET && req.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const message = req.body?.message
  const fromId = String(message?.from?.id || '')
  const startMatch = String(message?.text || '').trim().match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/)
  if (startMatch) {
    const requestId = startMatch[1]
    if (!requestId) {
      await sendTelegramMessage(message.chat.id, 'Per accedere, apri il sito e premi "Accedi tramite bot".')
      return res.json({ ok: true })
    }
    const login = requestId ? telegramLoginRequests.get(requestId) : null
    if (!login || login.expiresAt <= Date.now()) {
      if (requestId) telegramLoginRequests.delete(requestId)
      await sendTelegramMessage(message.chat.id, 'Link di accesso scaduto. Torna al sito e richiedi un nuovo accesso.')
      return res.json({ ok: true })
    }
    if (login.scope === 'admin' && !adminIds.has(fromId)) {
      await sendTelegramMessage(message.chat.id, 'Questo account Telegram non e autorizzato come admin.')
      return res.json({ ok: true })
    }
    const role = login.scope === 'admin' || adminIds.has(fromId) ? 'admin' : 'customer'
    login.user = telegramUserFromMessage(message.from, role)
    await sendTelegramMessage(message.chat.id, 'Accesso confermato. Puoi tornare al sito.')
    return res.json({ ok: true })
  }

  const callback = req.body?.callback_query
  if (callback) {
    const fromId = String(callback.from?.id || '')
    const data = String(callback.data || '')
    if (!adminIds.has(fromId) || !data.startsWith('cc:')) {
      await answerTelegramCallback(callback.id, 'Non autorizzato')
      return res.json({ ok: true })
    }

    const [, action, ...idParts] = data.split(':')
    const orderId = idParts.join(':')
    const order = await applyAdminOrderAction(orderId, action)
    await answerTelegramCallback(callback.id, order ? 'Aggiornato' : 'Azione non disponibile')
    if (order) {
      const statusLabel = order.delivery === 'meetup'
        ? ({ processing: 'Approvato', shipped: 'Approvato', completed: 'Approvato', cancelled: 'Cancellato' }[order.status] || order.status)
        : order.status
      await sendTelegramMessage(callback.message?.chat?.id || fromId, `<b>${escapeHtml(order.id)}</b> aggiornato: ${escapeHtml(statusLabel)}${order.paymentStatus ? ` · ${escapeHtml(order.paymentStatus)}` : ''}`)
    }
    return res.json({ ok: true })
  }

  const replyTo = message?.reply_to_message
  const trackingNumber = String(message?.text || '').trim()
  if (!replyTo || !trackingNumber || !adminIds.has(fromId)) return res.json({ ok: true })

  const orders = await readJson(ordersFile, [])
  const order = orders.find(item =>
    (item.adminTelegramMessages || []).some(adminMessage =>
      String(adminMessage.chatId) === String(message.chat.id) &&
      Number(adminMessage.messageId) === Number(replyTo.message_id)
    )
  )
  if (!order) return res.json({ ok: true })
  if (order.delivery === 'meetup') {
    await sendTelegramMessage(message.chat.id, 'Per meetup usa solo Approvato o Cancellato.')
    return res.json({ ok: true })
  }

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

  await notifyCustomerOrderUpdate(order, 'shipped')

  res.json({ ok: true })
})

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File troppo grande: massimo 15 MB per foto e 250 MB per video.' })
  }
  if (error?.status === 413 || error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Blocco upload troppo grande. Riprova il caricamento.' })
  }
  return next(error)
})

app.use(express.static(publicDir, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
  },
}))
app.use('/media', express.static(mediaDir, {
  maxAge: '30d',
  immutable: true,
}))

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

async function startServer() {
  await initializeDataDir()
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`)
    console.log(`Runtime data directory: ${dataDir}`)
    autoCompleteDeliveredOrders().catch(error => console.error('Auto delivery check failed:', error.message))
    checkPendingCryptoPayments().catch(error => console.error('Crypto payment check failed:', error.message))
    setInterval(() => {
      autoCompleteDeliveredOrders().catch(error => console.error('Auto delivery check failed:', error.message))
    }, autoDeliverCheckMs).unref()
    setInterval(() => {
      checkPendingCryptoPayments().catch(error => console.error('Crypto payment check failed:', error.message))
    }, cryptoPaymentCheckMs).unref()
  })
}

startServer().catch(error => {
  console.error('Server startup failed:', error)
  process.exitCode = 1
})
