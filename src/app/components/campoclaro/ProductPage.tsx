import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Plus, Minus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useProducts } from '../../hooks/useProducts'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { products } = useProducts()
  const product = products.find(p => p.id === id)
  const [selectedWeight, setSelectedWeight] = useState('')
  const [selectedStrain, setSelectedStrain] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeVisual, setActiveVisual] = useState(0)
  const [addedFeedback, setAddedFeedback] = useState(false)

  useEffect(() => {
    if (product) {
      setSelectedWeight(Object.keys(product.prices)[0])
      setSelectedStrain(product.strains?.[0] || '')
      setActiveVisual(0)
    }
  }, [product])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 72 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(245,245,245,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
            Prodotto non trovato
          </div>
          <Link to="/catalogo" style={{ color: '#D6B25E', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem' }}>
            Torna al Catalogo
          </Link>
        </div>
      </div>
    )
  }

  const currentPrice = product.prices[selectedWeight] || 0
  const totalPrice = currentPrice * quantity

  const placeholderVisuals = [
    { label: 'Vista Frontale', angle: 'primary' },
    { label: 'Dettaglio', angle: 'detail' },
    { label: 'Profilo', angle: 'side' },
  ]
  const gallery = [
    ...(product.images || []).map((url, index) => ({ type: 'image' as const, url, label: `Foto ${index + 1}` })),
    ...(product.videos || []).map((url, index) => ({ type: 'video' as const, url, label: `Video ${index + 1}` })),
  ]
  const visualCount = gallery.length || placeholderVisuals.length
  const activeMedia = gallery[activeVisual]

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, weight: selectedWeight, strain: selectedStrain || undefined, price: currentPrice, quantity })
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }

  const relatedProducts = products.filter(p => p.id !== product.id).slice(0, 3)

  return (
    <div className="cc-product-page" style={{ minHeight: '100vh', paddingTop: 72 }}>
      {/* Back */}
      <div className="product-back" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 0' }}>
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(245,245,245,0.4)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 0,
          }}
        >
          <ArrowLeft size={14} />
          Catalogo
        </motion.button>
      </div>

      {/* Main Layout */}
      <div className="product-main-wrap" style={{ maxWidth: 980, margin: '0 auto', padding: '18px 24px 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.78fr 1.22fr', gap: 24, alignItems: 'start' }} className="product-grid">
          {/* Left: Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main Visual */}
            <div className={`product-main-visual cc-animated-surface ${gallery.length === 0 ? 'cc-product-orbit' : ''}`} style={{
              borderRadius: 8,
              overflow: 'hidden',
              background: product.gradient,
              border: '1px solid rgba(214,178,94,0.1)',
              position: 'relative',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeVisual}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {activeMedia ? (
                    activeMedia.type === 'image' ? (
                      <img src={activeMedia.url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <video src={activeMedia.url} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#050505' }} />
                    )
                  ) : (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 3, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${product.glowColor.replace(/[\d.]+\)$/, '0.7)')}, transparent 70%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          border: '1px solid rgba(214,178,94,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(5,5,5,0.3)',
                        }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(214,178,94,0.4), rgba(240,201,106,0.15))',
                          }} />
                        </div>
                      </motion.div>
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.55rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'rgba(245,245,245,0.3)',
                      }}>
                        {placeholderVisuals[activeVisual].label}
                      </span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Gallery Nav */}
              {visualCount > 1 && <button
                onClick={() => setActiveVisual(v => (v - 1 + visualCount) % visualCount)}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(5,5,5,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'rgba(245,245,245,0.5)',
                }}
              >
                <ChevronLeft size={16} />
              </button>}
              {visualCount > 1 && <button
                onClick={() => setActiveVisual(v => (v + 1) % visualCount)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(5,5,5,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'rgba(245,245,245,0.5)',
                }}
              >
                <ChevronRight size={16} />
              </button>}
            </div>

            {/* Thumbnails */}
            <div className="product-thumbs" style={{ display: 'flex', gap: 8 }}>
              {(gallery.length ? gallery : placeholderVisuals).map((visual, i) => (
                <motion.button
                  key={'url' in visual ? visual.url : visual.label}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveVisual(i)}
                  style={{
                    flex: 1,
                    height: 36,
                    background: product.gradient,
                    border: activeVisual === i ? '1px solid rgba(214,178,94,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {'url' in visual ? (
                    visual.type === 'image' ? (
                      <img src={visual.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <video src={visual.url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )
                  ) : (
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: activeVisual === i ? 'rgba(214,178,94,0.4)' : 'rgba(214,178,94,0.15)',
                      transition: 'background 0.2s',
                    }} />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="product-info-panel"
            style={{ position: 'sticky', top: 88 }}
          >
            {/* Category + Tags */}
            <div className="product-tags" style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {product.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 10px',
                    background: 'rgba(5,5,5,0.66)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 3,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,245,245,0.3)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Name */}
            <h1 style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 'clamp(1.25rem, 2.5vw, 1.85rem)',
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 10,
            }}>
              {product.name}
            </h1>

            {/* Description */}
            <p className="product-description" style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.76rem',
              lineHeight: 1.45,
              color: 'rgba(245,245,245,0.5)',
              marginBottom: 12,
            }}>
              {product.longDescription}
            </p>

            {/* Weight Selector */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,245,245,0.3)',
                marginBottom: 8,
              }}>
                Quantità
              </div>
              <div className="product-option-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(product.prices).map(([w, p]) => (
                  <motion.button
                    key={w}
                    whileHover={{ y: -2, borderColor: 'rgba(214,178,94,0.42)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedWeight(w)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 6,
                      background: selectedWeight === w ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.03)',
                      border: selectedWeight === w ? '1px solid rgba(214,178,94,0.6)' : '1px solid rgba(255,255,255,0.08)',
                      color: selectedWeight === w ? '#D6B25E' : 'rgba(245,245,245,0.45)',
                      cursor: 'pointer',
                      textAlign: 'center' as const,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700, lineHeight: 1 }}>
                      {w}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.56rem', marginTop: 3, opacity: 0.6 }}>
                      €{p}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {product.strains && product.strains.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,245,245,0.3)',
                  marginBottom: 8,
                }}>
                  Strain
                </div>
                <div className="product-option-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.strains.map(strain => (
                    <motion.button
                      key={strain}
                      whileHover={{ y: -2, borderColor: 'rgba(214,178,94,0.42)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedStrain(strain)}
                      style={{
                        padding: '7px 11px',
                        borderRadius: 6,
                        background: selectedStrain === strain ? 'rgba(214,178,94,0.1)' : 'rgba(255,255,255,0.03)',
                        border: selectedStrain === strain ? '1px solid rgba(214,178,94,0.6)' : '1px solid rgba(255,255,255,0.08)',
                        color: selectedStrain === strain ? '#D6B25E' : 'rgba(245,245,245,0.45)',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.7rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {strain}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.64rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,245,245,0.3)',
              }}>
                Unità
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 2px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
              }}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.5)', padding: '0 9px', display: 'flex' }}
                >
                  <Minus size={14} />
                </motion.button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.95rem', color: '#F5F5F5', minWidth: 20, textAlign: 'center' }}>
                  {quantity}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(q => q + 1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.5)', padding: '0 9px', display: 'flex' }}
                >
                  <Plus size={14} />
                </motion.button>
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${selectedWeight}-${quantity}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#D6B25E',
                      lineHeight: 1,
                    }}
                  >
                    €{totalPrice}
                  </motion.span>
                </AnimatePresence>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'rgba(245,245,245,0.3)' }}>
                  {quantity > 1 ? `(${quantity}x ${selectedWeight} × €${currentPrice})` : `/ ${selectedWeight}`}
                </span>
              </div>

              <motion.button
                className={!addedFeedback ? 'cc-gold-button' : undefined}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(214,178,94,0.25)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAdd}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: addedFeedback ? 'rgba(214,178,94,0.15)' : 'linear-gradient(135deg, #D6B25E, #F0C96A)',
                  color: addedFeedback ? '#D6B25E' : '#050505',
                  border: addedFeedback ? '1px solid rgba(214,178,94,0.5)' : 'none',
                  borderRadius: 6,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.3s ease',
                }}
              >
                <ShoppingBag size={16} />
                {addedFeedback ? 'Aggiunto al Carrello' : 'Aggiungi al Carrello'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Related Products */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '36px 24px 90px',
        background: 'linear-gradient(180deg, transparent, rgba(26,16,40,0.08))',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(245,245,245,0.3)',
            marginBottom: 18,
          }}>
            Potrebbe Interessarti
          </div>
          <div className="related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {relatedProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Link to={`/prodotto/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <motion.div
                    className="cc-interactive-card cc-animated-surface"
                    whileHover={{ y: -4, boxShadow: `0 16px 50px ${p.glowColor}` }}
                    style={{
                      background: p.gradient,
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      padding: '14px',
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      transition: 'border-color 0.3s',
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${p.glowColor.replace(/[\d.]+\)$/, '0.5)')}, transparent)`,
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#D6B25E' }}>
                        da €{Object.values(p.prices)[0]}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .cc-product-page {
            max-width: 100%;
            overflow-x: hidden;
          }
          .product-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .product-back {
            padding: 12px 14px 0 !important;
          }
          .product-main-wrap {
            padding: 12px 12px 18px !important;
          }
          .product-main-visual {
            aspect-ratio: 2.2 / 1 !important;
            margin-bottom: 6px !important;
            max-height: 122px !important;
          }
          .product-thumbs {
            display: none !important;
          }
          .product-info-panel {
            position: static !important;
          }
          .product-tags {
            margin-bottom: 8px !important;
          }
          .product-tags span {
            font-size: 0.55rem !important;
            padding: 2px 7px !important;
          }
          .product-description {
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            margin-bottom: 10px !important;
          }
          .product-option-row {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }
          .product-option-row button {
            padding: 6px 4px !important;
            min-width: 0 !important;
          }
          .related-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 420px) {
          .cc-product-page {
            padding-top: 64px !important;
          }
        }
        @media (max-width: 350px) {
          .related-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
