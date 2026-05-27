import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Minus, Trash2, Truck, MapPin, ChevronRight, Check, ArrowLeft, Copy } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { api, type Order } from '../../lib/api'
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { TelegramStartLogin } from './TelegramStartLogin'
import { CryptoPaymentModal } from './CryptoPaymentModal'

type DeliveryMethod = 'ship' | 'meetup'
type PaymentMethod = 'crypto' | 'ccpp'
type CryptoCurrency = 'BTC' | 'ETH' | 'USDT_TRX'
type Courier = 'UPS' | 'InPost' | 'SEUR' | 'GLS'
type Step = 'cart' | 'payment' | 'confirm' | 'success'
type TelegramCustomer = { id: string; firstName?: string; lastName?: string; username?: string }

const CCPP_FEE = 50
const COURIERS: Array<{ id: Courier; subtitle: string }> = [
  { id: 'UPS', subtitle: 'Tracking ufficiale UPS' },
  { id: 'InPost', subtitle: 'Locker e punti InPost' },
  { id: 'SEUR', subtitle: 'Rete SEUR Spagna' },
  { id: 'GLS', subtitle: 'GLS Italy / EU' },
]

const CRYPTO_WALLETS: Record<CryptoCurrency, { label: string; network: string; address: string }> = {
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

function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '15px 12px 7px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${focused ? 'rgba(214,178,94,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          color: '#F5F5F5',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box' as const,
        }}
      />
      <label style={{
        position: 'absolute',
        left: 14,
        top: focused || hasValue ? 5 : 12,
        fontFamily: "'Inter', sans-serif",
        fontSize: focused || hasValue ? '0.65rem' : '0.85rem',
        letterSpacing: focused || hasValue ? '0.1em' : '0.02em',
        textTransform: focused || hasValue ? 'uppercase' : 'none',
        color: focused ? '#D6B25E' : 'rgba(245,245,245,0.3)',
        transition: 'all 0.2s ease',
        pointerEvents: 'none',
      }}>
        {label}
      </label>
    </div>
  )
}

function DeliveryCard({
  method,
  selected,
  onSelect,
}: {
  method: DeliveryMethod
  selected: boolean
  onSelect: () => void
}) {
  const info = {
    ship: {
      icon: <Truck size={18} />,
      title: 'Spedizione',
      subtitle: 'Consegna in 24–48h, discreta e sicura',
    },
    meetup: {
      icon: <MapPin size={18} />,
      title: 'Meetup',
      subtitle: 'Disponibile solo a Barcellona',
    },
  }[method]

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        flex: 1,
        padding: '12px',
        background: selected ? 'rgba(214,178,94,0.07)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid rgba(214,178,94,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ color: selected ? '#D6B25E' : 'rgba(245,245,245,0.4)', marginBottom: 5 }}>
        {info.icon}
      </div>
      <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: selected ? '#F5F5F5' : 'rgba(245,245,245,0.6)', marginBottom: 4 }}>
        {info.title}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.3)', lineHeight: 1.4 }}>
        {info.subtitle}
      </div>
    </motion.button>
  )
}

function PaymentCard({
  method,
  label,
  subtitle,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  label: string
  subtitle: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01, boxShadow: selected ? '0 4px 20px rgba(214,178,94,0.15)' : 'none' }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '12px 14px',
        background: selected ? 'rgba(214,178,94,0.07)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid rgba(214,178,94,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        transition: 'all 0.2s ease',
      }}
    >
      <div>
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.35)' }}>
          {subtitle}
        </div>
      </div>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: selected ? '2px solid #D6B25E' : '2px solid rgba(255,255,255,0.15)',
        background: selected ? 'rgba(214,178,94,0.2)' : 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D6B25E' }} />}
      </div>
    </motion.button>
  )
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, count, clearCart } = useCart()
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationPreferences()
  const [delivery, setDelivery] = useState<DeliveryMethod>('ship')
  const [courier, setCourier] = useState<Courier>('UPS')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('crypto')
  const [cryptoCurrency, setCryptoCurrency] = useState<CryptoCurrency>('BTC')
  const [step, setStep] = useState<Step>('cart')
  const [orderError, setOrderError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [telegramCustomer, setTelegramCustomer] = useState<TelegramCustomer | null>(null)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false)
  const [walletAvailability, setWalletAvailability] = useState<Record<string, { busy: boolean; address: string; network: string; label: string }>>({})
  const [walletError, setWalletError] = useState('')

  const [address, setAddress] = useState({ via: '', city: '', cap: '', notes: '' })
  const itemKey = (item: { id: string; weight: string; strain?: string }) => `${item.id}-${item.weight}-${item.strain || 'default'}`
  const ccppFee = delivery === 'ship' && payMethod === 'ccpp' ? CCPP_FEE : 0
  const orderTotal = total + ccppFee
  const meetupDeposit = Math.max(0, Math.floor(total * 0.25))
  const requiresCryptoPayment = delivery === 'meetup' || payMethod === 'crypto'
  const selectedCrypto = {
    ...CRYPTO_WALLETS[cryptoCurrency],
    ...walletAvailability[cryptoCurrency],
    address: walletAvailability[cryptoCurrency]?.address || '',
  }
  const selectedWalletBusy = walletAvailability[cryptoCurrency]?.busy === true

  useEffect(() => {
    api.customerMe()
      .then(({ user }) => setTelegramCustomer(user))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setWalletError('')
    api.cryptoWallets()
      .then(wallets => {
        const next = Object.fromEntries(wallets.map(wallet => [wallet.id, wallet]))
        setWalletAvailability(next)
        const currentBusy = next[cryptoCurrency]?.busy === true
        if (currentBusy) {
          const available = wallets.find(wallet => !wallet.busy)
          if (available) setCryptoCurrency(available.id as CryptoCurrency)
          else setPayMethod('ccpp')
        }
      })
      .catch(() => {
        setWalletError('Wallet crypto non disponibili in questo momento. Usa CCPP o riprova.')
        setPayMethod('ccpp')
      })
  }, [isOpen, cryptoCurrency])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('cc-cart-open')
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.classList.remove('cc-cart-open')
    }
  }, [isOpen])

  useEffect(() => {
    if (!lastOrder?.id || step !== 'success') return
    const interval = window.setInterval(async () => {
      try {
        const order = await api.publicOrder(lastOrder.id)
        setLastOrder(previous => previous ? { ...previous, ...order } : previous)
      } catch {}
    }, 5000)
    return () => window.clearInterval(interval)
  }, [lastOrder?.id, step])

  const handleCheckout = () => {
    setOrderError('')
    if (!telegramCustomer) {
      setOrderError("Accedi con Telegram per completare l'ordine.")
      return
    }
    if (delivery === 'ship' && (!address.via.trim() || !address.city.trim() || !address.cap.trim())) {
      setOrderError('Compila indirizzo, città e CAP per la spedizione.')
      return
    }
    if (requiresCryptoPayment && selectedWalletBusy) {
      setOrderError(delivery === 'meetup' ? 'Wallet occupato. Scegli una valuta disponibile.' : 'Wallet occupato. Scegli una valuta disponibile o CCPP.')
      return
    }
    if (requiresCryptoPayment && !selectedCrypto.address) {
      setOrderError(delivery === 'meetup' ? 'Wallet crypto non disponibile. Riprova per inviare la richiesta Meetup.' : 'Wallet crypto non disponibile. Riprova o scegli CCPP.')
      return
    }
    setStep('payment')
  }
  const handleConfirm = () => setStep('confirm')
  const handlePaymentConfirm = () => {
    setOrderError('')
    if (requiresCryptoPayment && selectedWalletBusy) {
      setOrderError(delivery === 'meetup' ? 'Wallet occupato. Scegli una valuta disponibile.' : 'Wallet occupato. Scegli una valuta disponibile o CCPP.')
      return
    }
    if (requiresCryptoPayment && !selectedCrypto.address) {
      setOrderError(delivery === 'meetup' ? 'Wallet crypto non disponibile. Riprova per inviare la richiesta Meetup.' : 'Wallet crypto non disponibile. Riprova o scegli CCPP.')
      return
    }
    setStep('confirm')
  }
  const handlePlaceOrder = async () => {
    if (submitting) return
    setSubmitting(true)
    setOrderError('')
    try {
      const order = await api.createOrder({
        items,
        delivery,
        payment: payMethod,
        address,
        courier: delivery === 'ship' ? courier : undefined,
        notificationsEnabled,
        cryptoCurrency: requiresCryptoPayment ? cryptoCurrency : undefined,
      })
      setLastOrder(order)
      setStep('success')
      if (order.payment === 'crypto') setCryptoModalOpen(true)
      clearCart()
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Errore durante invio ordine')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    closeCart()
    setTimeout(() => setStep('cart'), 300)
  }

  const copyCryptoAddress = () => {
    if (!selectedCrypto.address) return
    navigator.clipboard?.writeText(selectedCrypto.address).catch(() => {})
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Drawer */}
          <motion.div
            className="cc-cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 35 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(480px, 100vw)',
              background: '#0A0A0B',
              borderLeft: '1px solid rgba(214,178,94,0.08)',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="cc-cart-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {step !== 'cart' && step !== 'success' && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStep(step === 'payment' ? 'cart' : 'payment')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.4)', padding: 0, display: 'flex' }}
                  >
                    <ArrowLeft size={18} />
                  </motion.button>
                )}
                <div>
                  <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
                    {step === 'cart' ? 'Carrello' : step === 'payment' ? 'Pagamento' : step === 'confirm' ? 'Conferma' : 'Ordine inviato'}
                  </div>
                  {step === 'cart' && count > 0 && (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'rgba(245,245,245,0.3)', marginTop: 2 }}>
                      {count} {count === 1 ? 'articolo' : 'articoli'}
                    </div>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.4)', padding: 4, display: 'flex' }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Step indicator */}
            {step !== 'success' && (
              <div className="cc-cart-steps" style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 4, flexShrink: 0 }}>
                {(['cart', 'payment', 'confirm'] as Step[]).map((s, i) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      height: 2,
                      borderRadius: 1,
                      background: i <= (['cart', 'payment', 'confirm'] as Step[]).indexOf(step)
                        ? '#D6B25E'
                        : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Content */}
            <div className="cc-drawer-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <AnimatePresence mode="wait">
                {/* CART STEP */}
                {step === 'cart' && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {items.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(245,245,245,0.25)', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}>
                        Il carrello è vuoto
                      </div>
                    ) : (
                      <>
                        {/* Items */}
                        <div style={{ marginBottom: 28 }}>
                          {items.map(item => (
                            <motion.div
                              className="cc-cart-item"
                              key={itemKey(item)}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 20, height: 0 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '14px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 6,
                                background: 'rgba(214,178,94,0.08)',
                                border: '1px solid rgba(214,178,94,0.12)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(214,178,94,0.3)' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5', marginBottom: 2 }}>
                                  {item.name}
                                </div>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'rgba(245,245,245,0.35)' }}>
                                  {item.weight} · €{item.price}
                                </div>
                                {item.strain && (
                                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#D6B25E', marginTop: 3 }}>
                                    {item.strain}
                                  </div>
                                )}
                              </div>
                              <div className="cc-cart-item-controls" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQuantity(item.id, item.weight, -1, item.strain)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer', color: 'rgba(245,245,245,0.5)', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Minus size={11} />
                                </motion.button>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: '#F5F5F5', minWidth: 16, textAlign: 'center' }}>
                                  {item.quantity}
                                </span>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQuantity(item.id, item.weight, 1, item.strain)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer', color: 'rgba(245,245,245,0.5)', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus size={11} />
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeItem(item.id, item.weight, item.strain)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.2)', marginLeft: 4, display: 'flex', padding: 0 }}>
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Delivery Method */}
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 12 }}>
                            Modalità di consegna
                          </div>
                          <div className="cc-cart-delivery" style={{ display: 'flex', gap: 10 }}>
                            <DeliveryCard method="ship" selected={delivery === 'ship'} onSelect={() => setDelivery('ship')} />
                            <DeliveryCard method="meetup" selected={delivery === 'meetup'} onSelect={() => setDelivery('meetup')} />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '16px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8,
                          marginBottom: 20,
                        }}>
                          <div>
                            <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5', marginBottom: 4 }}>
                              Notifiche ordine
                            </div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.73rem', color: 'rgba(245,245,245,0.35)', lineHeight: 1.45 }}>
                              Aggiornamenti solo su questo ordine. Nessuna newsletter o messaggi promozionali.
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <Link to="/privacy" onClick={closeCart} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: '#D6B25E', textDecoration: 'none' }}>
                                Privacy
                              </Link>
                              <Link to="/terms" onClick={closeCart} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: '#D6B25E', textDecoration: 'none' }}>
                                Termini notifiche
                              </Link>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-pressed={notificationsEnabled}
                            onClick={() => setNotificationsEnabled(v => !v)}
                            style={{
                              width: 44,
                              height: 24,
                              borderRadius: 12,
                              background: notificationsEnabled ? 'rgba(214,178,94,0.3)' : 'rgba(255,255,255,0.08)',
                              border: notificationsEnabled ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.1)',
                              position: 'relative',
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{
                              position: 'absolute',
                              top: 3,
                              left: notificationsEnabled ? 23 : 3,
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: notificationsEnabled ? '#D6B25E' : 'rgba(245,245,245,0.3)',
                              transition: 'left 0.2s ease, background 0.2s ease',
                            }} />
                          </button>
                        </div>

                        <div style={{
                          padding: '16px',
                          background: telegramCustomer ? 'rgba(214,178,94,0.06)' : 'rgba(255,255,255,0.02)',
                          border: telegramCustomer ? '1px solid rgba(214,178,94,0.22)' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8,
                          marginBottom: 20,
                        }}>
                          <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5', marginBottom: 6 }}>
                            Accesso Telegram
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.73rem', color: 'rgba(245,245,245,0.38)', lineHeight: 1.45, marginBottom: telegramCustomer ? 0 : 12 }}>
                            Obbligatorio per ordinare. Useremo il tuo account Telegram per conferma, pagamento e tracking.
                          </div>
                          {telegramCustomer ? (
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#D6B25E' }}>
                              Autorizzato: {telegramCustomer.username ? `@${telegramCustomer.username}` : [telegramCustomer.firstName, telegramCustomer.lastName].filter(Boolean).join(' ')}
                            </div>
                          ) : (
                            <TelegramStartLogin
                              compact
                              scope="customer"
                              onAuthenticated={user => {
                                if (user) setTelegramCustomer(user)
                              }}
                            />
                          )}
                        </div>

                        {/* Address Form / Meetup Info */}
                        <AnimatePresence>
                          {delivery === 'ship' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              style={{ overflow: 'hidden', marginBottom: 8 }}
                            >
                              <FloatingInput label="Via e numero civico" value={address.via} onChange={v => setAddress(a => ({ ...a, via: v }))} />
                              <div className="cc-cart-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <FloatingInput label="Città" value={address.city} onChange={v => setAddress(a => ({ ...a, city: v }))} />
                                <FloatingInput label="CAP" value={address.cap} onChange={v => setAddress(a => ({ ...a, cap: v }))} />
                              </div>
                              <FloatingInput label="Note (opzionale)" value={address.notes} onChange={v => setAddress(a => ({ ...a, notes: v }))} />
                            </motion.div>
                          )}
                          {delivery === 'meetup' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 8,
                                marginBottom: 20,
                              }}
                            >
                              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)', lineHeight: 1.6 }}>
                                Meetup disponibile solo a Barcellona. Per inviare la richiesta è necessario un acconto crypto del 25%: €{meetupDeposit}. Il team ti contatterà su Telegram per luogo e orario.
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {delivery === 'ship' && (
                          <div style={{ marginBottom: 22 }}>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 12 }}>
                              Corriere
                            </div>
                            <div className="cc-cart-couriers" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                              {COURIERS.map(option => {
                                const selected = courier === option.id
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setCourier(option.id)}
                                    style={{
                                      padding: '13px 14px',
                                      background: selected ? 'rgba(214,178,94,0.09)' : 'rgba(255,255,255,0.025)',
                                      border: selected ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.07)',
                                      borderRadius: 8,
                                      color: selected ? '#F5F5F5' : 'rgba(245,245,245,0.62)',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      fontFamily: "'Inter', sans-serif",
                                    }}
                                  >
                                    <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: selected ? '#D6B25E' : '#F5F5F5', marginBottom: 3 }}>
                                      {option.id}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(245,245,245,0.34)', lineHeight: 1.35 }}>
                                      {option.subtitle}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {orderError && (
                          <div style={{ marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#E57373' }}>
                            {orderError}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* PAYMENT STEP */}
                {step === 'payment' && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 16 }}>
                      Metodo di Pagamento
                    </div>
                    {delivery === 'meetup' ? (
                      <div style={{ padding: '14px', background: 'rgba(214,178,94,0.08)', border: '1px solid rgba(214,178,94,0.3)', borderRadius: 8, marginBottom: 18 }}>
                        <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.92rem', color: '#F5F5F5', marginBottom: 5 }}>Acconto Meetup · 25%</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.76rem', color: 'rgba(245,245,245,0.52)', lineHeight: 1.5 }}>Pagamento crypto richiesto ora: <span style={{ color: '#D6B25E', fontWeight: 700 }}>€{meetupDeposit}</span> su un totale di €{total}.</div>
                      </div>
                    ) : (
                      <>
                        <PaymentCard method="crypto" selected={payMethod === 'crypto'} label="Crypto" subtitle="BTC / ETH / USDT TRC20, pagamento diretto wallet" onSelect={() => setPayMethod('crypto')} />
                        <PaymentCard method="ccpp" selected={payMethod === 'ccpp'} label="CCPP" subtitle={`Supplemento fisso €${CCPP_FEE} aggiunto al totale`} onSelect={() => setPayMethod('ccpp')} />
                      </>
                    )}

                    {requiresCryptoPayment && (
                      <div style={{ marginTop: 14, marginBottom: 20 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 10 }}>
                          Valuta crypto
                        </div>
                        <div className="cc-cart-crypto-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          {(Object.keys(CRYPTO_WALLETS) as CryptoCurrency[]).map(currency => {
                            const selected = cryptoCurrency === currency
                            const wallet = walletAvailability[currency] || CRYPTO_WALLETS[currency]
                            const busy = walletAvailability[currency]?.busy === true
                            return (
                              <button
                                key={currency}
                                type="button"
                                disabled={busy}
                                onClick={() => !busy && setCryptoCurrency(currency)}
                                style={{
                                  padding: '11px 8px',
                                  background: busy ? 'rgba(229,115,115,0.055)' : selected ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.025)',
                                  border: busy ? '1px solid rgba(229,115,115,0.22)' : selected ? '1px solid rgba(214,178,94,0.45)' : '1px solid rgba(255,255,255,0.07)',
                                  borderRadius: 6,
                                  color: busy ? '#E57373' : selected ? '#D6B25E' : 'rgba(245,245,245,0.58)',
                                  cursor: busy ? 'not-allowed' : 'pointer',
                                  textAlign: 'center',
                                  fontFamily: "'Inter', sans-serif",
                                  opacity: busy ? 0.72 : 1,
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{wallet.label}</div>
                                <div style={{ fontSize: '0.66rem', marginTop: 3, color: busy ? '#E57373' : 'rgba(245,245,245,0.34)' }}>
                                  {busy ? 'Busy' : wallet.network}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ marginTop: 12, padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.35)', marginBottom: 7 }}>
                            Wallet {selectedCrypto.label} ({selectedCrypto.network})
                          </div>
                          <button
                            type="button"
                            onClick={copyCryptoAddress}
                            disabled={!selectedCrypto.address}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '10px 12px',
                              background: 'rgba(0,0,0,0.18)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 6,
                              color: '#F5F5F5',
                              cursor: selectedCrypto.address ? 'pointer' : 'wait',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.72rem',
                              wordBreak: 'break-all',
                              textAlign: 'left',
                            }}
                          >
                            <span>{selectedCrypto.address || 'Caricamento wallet sicuro...'}</span>
                            <Copy size={14} style={{ flexShrink: 0, color: '#D6B25E' }} />
                          </button>
                        </div>
                        {walletError && (
                          <div style={{ marginTop: 10, fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#E57373', lineHeight: 1.45 }}>
                            {walletError}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{
                      marginTop: 24,
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8,
                    }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(245,245,245,0.35)', marginBottom: 8 }}>
                        Riepilogo ordine
                      </div>
                      {items.map(item => (
                        <div key={itemKey(item)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)' }}>
                            {item.name} {item.weight}{item.strain ? ` · ${item.strain}` : ''} ×{item.quantity}
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#D6B25E' }}>
                            €{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                      {ccppFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', gap: 12 }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)' }}>
                            Supplemento CCPP
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#D6B25E' }}>
                            €{ccppFee}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* CONFIRM STEP */}
                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)', marginBottom: 16 }}>
                      Conferma Ordine
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(214,178,94,0.04)',
                      border: '1px solid rgba(214,178,94,0.12)',
                      borderRadius: 8,
                      marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Consegna</span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#F5F5F5' }}>{delivery === 'ship' ? 'Spedizione' : 'Meetup Barcellona'}</span>
                      </div>
                      {delivery === 'ship' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Corriere</span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#F5F5F5' }}>{courier}</span>
                        </div>
                      )}
                      {delivery === 'ship' ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Pagamento</span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#F5F5F5' }}>
                            {payMethod === 'crypto' ? `Crypto (${selectedCrypto.label})` : 'CCPP'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 10, fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)', lineHeight: 1.5 }}>
                          Acconto crypto obbligatorio per Meetup: 25% del totale, pari a €{meetupDeposit}. Il saldo sarà concordato con il team.
                        </div>
                      )}
                      {requiresCryptoPayment && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)', marginBottom: 6 }}>
                            Wallet
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'rgba(245,245,245,0.68)', wordBreak: 'break-all' }}>
                            {selectedCrypto.address || 'Wallet non disponibile'}
                          </div>
                        </div>
                      )}
                      {ccppFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Supplemento CCPP</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#D6B25E' }}>€{ccppFee}</span>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5' }}>Totale</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', fontWeight: 700, color: '#D6B25E' }}>€{orderTotal}</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Notifiche</span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: notificationsEnabled ? '#D6B25E' : 'rgba(245,245,245,0.45)' }}>
                          {notificationsEnabled ? 'Attive' : 'Disattivate'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.72rem',
                      color: 'rgba(245,245,245,0.25)',
                      lineHeight: 1.6,
                    }}>
                      Confermando l'ordine accetti le condizioni del servizio. Riceverai le istruzioni tramite canale privato.
                    </div>
                    {orderError && (
                      <div style={{ marginTop: 14, fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#E57373' }}>
                        {orderError}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* SUCCESS STEP */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ textAlign: 'center', padding: '60px 0' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(214,178,94,0.1)',
                        border: '1px solid rgba(214,178,94,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                      }}
                    >
                      <Check size={28} color="#D6B25E" />
                    </motion.div>
                    <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#F5F5F5', marginBottom: 10 }}>
                      Ordine Ricevuto
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: 'rgba(245,245,245,0.4)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                      {lastOrder?.payment === 'crypto'
                        ? `${delivery === 'meetup' ? 'Acconto Meetup 25%: ' : ''}Invia esattamente ${lastOrder?.cryptoExpectedAmount || ''} ${lastOrder?.cryptoExpectedUnit || selectedCrypto.label}. Il sistema verifica automaticamente la blockchain.`
                        : 'Il tuo ordine è stato registrato. Riceverai conferma a breve.'}
                    </div>
                    {lastOrder?.payment === 'crypto' && (
                      <button
                        type="button"
                        onClick={() => setCryptoModalOpen(true)}
                        style={{ marginTop: 18, padding: '13px 20px', borderRadius: 7, border: '1px solid rgba(214,178,94,0.35)', background: 'rgba(214,178,94,0.1)', color: '#D6B25E', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
                      >
                        Apri pagamento crypto
                      </button>
                    )}
                    {lastOrder?.trackingNumber && (
                      <div style={{ width: 'min(340px, 100%)', margin: '18px auto 0', padding: 14, background: 'rgba(214,178,94,0.06)', border: '1px solid rgba(214,178,94,0.22)', borderRadius: 8, textAlign: 'left' }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.35)', marginBottom: 8 }}>
                          Tracking spedizione
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5F5F5', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                          {lastOrder.trackingProvider ? `${lastOrder.trackingProvider} · ` : ''}{lastOrder.trackingNumber}
                        </div>
                        {lastOrder.trackingUrl && (
                          <a href={lastOrder.trackingUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 9, color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', textDecoration: 'none' }}>
                            Apri tracking ufficiale
                          </a>
                        )}
                      </div>
                    )}
                    {orderError && (
                      <div style={{ marginTop: 14, fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#E57373' }}>
                        {orderError}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && step !== 'success' && (
              <div className="cc-cart-footer" style={{
                padding: '20px 24px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
                background: 'rgba(5,5,5,0.8)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(245,245,245,0.4)' }}>Totale</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#D6B25E' }}>
                    €{orderTotal}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(214,178,94,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={step === 'cart' ? handleCheckout : step === 'payment' ? handlePaymentConfirm : handlePlaceOrder}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #D6B25E, #F0C96A)',
                    color: '#050505',
                    border: 'none',
                    borderRadius: 6,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting ? 0.72 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {submitting ? 'Invio...' : step === 'cart' ? (delivery === 'meetup' ? "Procedi all'Acconto" : 'Procedi al Pagamento') : step === 'payment' ? 'Conferma' : (delivery === 'meetup' ? 'Invia Richiesta e Paga Acconto' : 'Invia Ordine')}
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <CryptoPaymentModal
      order={lastOrder}
      open={cryptoModalOpen && lastOrder?.payment === 'crypto'}
      onClose={() => setCryptoModalOpen(false)}
      onUpdate={updated => setLastOrder(previous => previous ? { ...previous, ...updated } : previous)}
    />
    </>
  )
}
