import { Product } from '../components/campoclaro/data'

export interface OrderItem {
  id: string
  name: string
  weight: string
  strain?: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  createdAt: string
  status: string
  delivery: string
  courier?: string
  payment: string
  paymentStatus?: string
  cryptoCurrency?: string
  cryptoNetwork?: string
  cryptoWallet?: string
  cryptoExpectedAmount?: string
  cryptoExpectedUnit?: string
  cryptoPaymentUri?: string
  cryptoTxHash?: string
  customer?: {
    id?: string
    firstName?: string
    lastName?: string
    username?: string
  }
  notificationsEnabled?: boolean
  trackingNumber?: string
  trackingProvider?: string
  trackingUrl?: string
  shippedAt?: string
  deliveredAt?: string
  deliveryAutoCompleted?: boolean
  address: Record<string, string>
  items: Array<OrderItem & { productId?: string }>
  subtotal?: number
  fees?: number
  total: number
}

export interface SiteContent {
  welcomeTitle: string
  welcomeSubtitle: string
  infoCards: Array<{ title: string; body: string }>
  productFilters: string[]
  contactsTitle: string
  contactsIntro: string
  contacts: Array<{ label: string; value: string; url: string }>
}

export interface CryptoWalletAvailability {
  id: string
  label: string
  network: string
  address: string
  busy: boolean
}

export interface TelegramLoginStart {
  requestId: string
  botUrl: string
  expiresAt: string
}

export interface TelegramLoginStatus {
  status: 'pending' | 'complete'
  user?: { id: string; firstName?: string; lastName?: string; username?: string; photoUrl?: string; role?: string }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getProducts: () => request<Product[]>('/api/products'),
  getSiteContent: () => request<SiteContent>('/api/site-content'),
  cryptoWallets: () => request<CryptoWalletAvailability[]>('/api/crypto-wallets'),
  createOrder: (payload: unknown) => request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  publicOrder: (id: string) => request<Pick<Order, 'id' | 'status' | 'paymentStatus' | 'trackingNumber' | 'trackingProvider' | 'trackingUrl' | 'cryptoExpectedAmount' | 'cryptoExpectedUnit' | 'cryptoWallet' | 'cryptoPaymentUri' | 'cryptoTxHash'>>(`/api/orders/${id}/public`),
  reportCryptoPaid: (id: string, txHash = '') =>
    request<Order>(`/api/orders/${id}/crypto-paid`, { method: 'POST', body: JSON.stringify({ txHash }) }),
  me: () => request<{ user: null | { id: string; username?: string; firstName?: string; role?: string } }>('/api/auth/me'),
  beginAdminTelegramLogin: () => request<TelegramLoginStart>('/api/auth/telegram/start', { method: 'POST', body: JSON.stringify({}) }),
  pollAdminTelegramLogin: (requestId: string) => request<TelegramLoginStatus>(`/api/auth/telegram/status/${requestId}`),
  beginCustomerTelegramLogin: () => request<TelegramLoginStart>('/api/customer/telegram/start', { method: 'POST', body: JSON.stringify({}) }),
  pollCustomerTelegramLogin: (requestId: string) => request<TelegramLoginStatus>(`/api/customer/telegram/status/${requestId}`),
  customerMe: () =>
    request<{ user: null | { id: string; firstName?: string; lastName?: string; username?: string; photoUrl?: string; role?: string } }>('/api/customer/me'),
  customerOrders: () => request<Order[]>('/api/customer/orders'),
  devLogin: () => request('/api/auth/dev-login', { method: 'POST', body: JSON.stringify({}) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
  newsletterPreference: () => request<{ enabled: boolean }>('/api/customer/newsletter'),
  saveNewsletterPreference: (enabled: boolean) =>
    request<{ enabled: boolean }>('/api/customer/newsletter', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  adminStats: () => request<{ products: number; orders: number; revenue: number; pending: number; newsletterSubscribers?: number }>('/api/admin/stats'),
  adminProducts: () => request<Product[]>('/api/admin/products'),
  adminSiteContent: () => request<SiteContent>('/api/admin/site-content'),
  saveSiteContent: (content: SiteContent) =>
    request<SiteContent>('/api/admin/site-content', { method: 'PUT', body: JSON.stringify(content) }),
  saveProduct: (product: Product & { active?: boolean; originalId?: string }) =>
    product.id
      ? request<Product>(`/api/admin/products/${product.originalId || product.id}`, { method: 'PUT', body: JSON.stringify(product) })
      : request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(product) }),
  deleteProduct: (id: string) => request(`/api/admin/products/${id}`, { method: 'DELETE' }),
  adminOrders: () => request<Order[]>('/api/admin/orders'),
  updateOrderStatus: (id: string, status: string) =>
    request<Order>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateOrderTracking: (id: string, trackingNumber: string, trackingProvider = 'Auto Free') =>
    request<Order>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ trackingNumber, trackingProvider }) }),
  sendNewsletter: (title: string, body: string) =>
    request<{ sent: number; failed: number; subscribers: number }>('/api/admin/newsletter', { method: 'POST', body: JSON.stringify({ title, body }) }),
}
