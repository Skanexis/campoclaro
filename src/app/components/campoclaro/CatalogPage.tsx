import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Filter, Search } from 'lucide-react'
import { Product } from './data'
import { useCart } from '../../context/CartContext'
import { useProducts } from '../../hooks/useProducts'
import { useSiteContent } from '../../hooks/useSiteContent'

function WeightPill({
  weight,
  price,
  selected,
  onSelect,
}: {
  weight: string
  price: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onSelect() }}
      style={{
        padding: '4px 10px',
        borderRadius: 20,
        background: selected ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.03)',
        border: selected ? '1px solid rgba(214,178,94,0.6)' : '1px solid rgba(255,255,255,0.08)',
        color: selected ? '#D6B25E' : 'rgba(245,245,245,0.4)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.66rem',
        cursor: 'pointer',
        letterSpacing: '0.04em',
        transition: 'all 0.18s ease',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {weight}
    </motion.button>
  )
}

function ProductCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false)
  const [selectedWeight, setSelectedWeight] = useState(Object.keys(product.prices)[0])
  const [selectedStrain, setSelectedStrain] = useState(product.strains?.[0] || '')
  const { addItem } = useCart()

  const currentPrice = product.prices[selectedWeight]

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: product.id, name: product.name, weight: selectedWeight, strain: selectedStrain || undefined, price: currentPrice, quantity: 1 })
  }

  return (
    <motion.div
      className="cc-interactive-card cc-animated-surface"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ boxShadow: hovered ? `0 16px 52px ${product.glowColor}` : '0 0 0 transparent' }}
      transition={{ duration: 0.3 }}
      style={{
        background: product.gradient,
        border: hovered ? '1px solid rgba(214,178,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.3s ease',
      }}
    >
      <Link to={`/prodotto/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        {/* Visual Area */}
        <div className="catalog-card-visual cc-product-orbit" style={{
          height: hovered ? 116 : 146,
          background: product.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ambient glow */}
          <motion.div
            animate={{ scale: hovered ? 1.08 : 1, opacity: hovered ? 0.78 : 0.5 }}
            transition={{ duration: 0.4 }}
            style={{
            width: hovered ? 72 : 88,
            height: hovered ? 72 : 88,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${product.glowColor.replace(/[\d.]+\)$/, '0.5)')}, transparent 70%)`,
            }}
          />
          <div style={{
            position: 'absolute',
            width: hovered ? 38 : 46,
            height: hovered ? 38 : 46,
            borderRadius: '50%',
            border: '1px solid rgba(214,178,94,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: hovered ? 18 : 22, height: hovered ? 18 : 22, borderRadius: '50%', background: 'rgba(214,178,94,0.25)' }} />
          </div>

          {/* Badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {product.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                style={{
                  padding: '2px 7px',
                  background: 'rgba(5,5,5,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 3,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.54rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,245,245,0.5)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

        </div>

        {/* Info */}
        <div className="catalog-card-info" style={{ padding: hovered ? '11px 13px 10px' : '13px 14px 12px' }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.54rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(245,245,245,0.3)',
            marginBottom: 4,
          }}>
            {(product.filters || []).join(' · ') || product.category}
          </div>
          <div style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: hovered ? '0.9rem' : '0.96rem',
            fontWeight: 700,
            color: '#F5F5F5',
            letterSpacing: '-0.01em',
            marginBottom: hovered ? 3 : 5,
          }}>
            {product.name}
          </div>
          <div className="catalog-card-desc" style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            color: 'rgba(245,245,245,0.38)',
            lineHeight: 1.38,
            display: hovered ? 'none' : '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {product.description}
          </div>
          <div className="catalog-card-mobile-price" style={{
            display: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.78rem',
            color: '#D6B25E',
            marginTop: 8,
          }}>
            da €{Object.values(product.prices)[0]}
          </div>
        </div>
      </Link>

      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleAdd}
        title="Aggiungi al carrello"
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          zIndex: 5,
          width: 30,
          height: 30,
          borderRadius: 6,
          border: '1px solid rgba(214,178,94,0.34)',
          background: 'linear-gradient(135deg, rgba(214,178,94,0.92), rgba(240,201,106,0.92))',
          color: '#050505',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
        }}
      >
        <Plus size={14} />
      </motion.button>

      {/* Hover Expand — Weight + CTA */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="catalog-hover-panel" style={{ padding: '10px 13px 12px' }}>
              {/* Weight selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: product.strains && product.strains.length > 0 ? 8 : 10, flexWrap: 'wrap' }}>
                {Object.entries(product.prices).map(([w, p]) => (
                  <WeightPill
                    key={w}
                    weight={w}
                    price={p}
                    selected={selectedWeight === w}
                    onSelect={() => setSelectedWeight(w)}
                  />
                ))}
              </div>

              {product.strains && product.strains.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {product.strains.map(strain => (
                    <motion.button
                      key={strain}
                      whileTap={{ scale: 0.94 }}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedStrain(strain) }}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 20,
                        background: selectedStrain === strain ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.03)',
                        border: selectedStrain === strain ? '1px solid rgba(214,178,94,0.6)' : '1px solid rgba(255,255,255,0.08)',
                        color: selectedStrain === strain ? '#D6B25E' : 'rgba(245,245,245,0.4)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {strain}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Price + Add */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <motion.span
                    key={selectedWeight}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: '#D6B25E',
                    }}
                  >
                    €{currentPrice}
                  </motion.span>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.58rem',
                    color: 'rgba(245,245,245,0.3)',
                    marginLeft: 6,
                  }}>
                    / {selectedWeight}
                  </span>
                </div>

                <motion.button
                  className="cc-gold-button"
                  whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(214,178,94,0.22)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  style={{
                    padding: '7px 12px',
                    background: 'linear-gradient(135deg, #D6B25E, #F0C96A)',
                    color: '#050505',
                    border: 'none',
                    borderRadius: 4,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.64rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Plus size={11} />
                  Aggiungi
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function CatalogPage() {
  const { products } = useProducts()
  const siteContent = useSiteContent()
  const [activeCategory, setActiveCategory] = useState('Tutti')
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name')
  const [query, setQuery] = useState('')
  const categories = ['Tutti', ...siteContent.productFilters]

  const filtered = products
    .filter(p => activeCategory === 'Tutti' || (p.filters || []).includes(activeCategory))
    .filter(p => {
      const value = query.trim().toLowerCase()
      if (!value) return true
      return [p.name, ...(p.filters || []), p.description, ...(p.tags || []), ...(p.strains || [])].join(' ').toLowerCase().includes(value)
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return Object.values(a.prices)[0] - Object.values(b.prices)[0]
      if (sortBy === 'price-desc') return Object.values(b.prices)[0] - Object.values(a.prices)[0]
      return a.name.localeCompare(b.name)
    })

  return (
    <div style={{ minHeight: '100vh', paddingTop: 72 }}>
      {/* Header */}
      <div style={{
        padding: '36px 24px 26px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'linear-gradient(180deg, rgba(26,16,40,0.12), transparent)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#D6B25E',
              marginBottom: 12,
            }}>
              Catalogo
            </div>
            <h1 style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 'clamp(1.7rem, 5vw, 3rem)',
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 0,
            }}>
              Selezione Premium
            </h1>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        position: 'sticky',
        top: 72,
        background: 'rgba(5,5,5,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <motion.button
                key={cat}
                layout
                whileHover={{ y: -2, borderColor: 'rgba(214,178,94,0.38)' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveCategory(cat)}
                className={activeCategory === cat ? 'cc-filter-active' : undefined}
                style={{
                  padding: '7px 18px',
                  minHeight: 34,
                  borderRadius: 20,
                  background: activeCategory === cat ? 'rgba(214,178,94,0.1)' : 'transparent',
                  border: activeCategory === cat ? '1px solid rgba(214,178,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeCategory === cat ? '#D6B25E' : 'rgba(245,245,245,0.45)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {cat}
                {activeCategory === cat && (
                  <motion.span
                    layoutId="catalog-filter-glow"
                    style={{
                      position: 'absolute',
                      inset: -1,
                      borderRadius: 20,
                      border: '1px solid rgba(240,201,106,0.18)',
                      boxShadow: '0 0 24px rgba(214,178,94,0.12)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '0 11px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, background: 'rgba(255,255,255,0.025)' }}>
              <Search size={13} color="rgba(245,245,245,0.32)" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca"
                style={{
                  width: 150,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F5F5F5',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                }}
              />
            </div>
            <Filter size={14} color="rgba(245,245,245,0.3)" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245,245,245,0.5)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="name" style={{ background: '#0f0f10' }}>Nome</option>
              <option value="price-asc" style={{ background: '#0f0f10' }}>Prezzo ↑</option>
              <option value="price-desc" style={{ background: '#0f0f10' }}>Prezzo ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 100px' }}>
        <motion.div
          className="catalog-grid"
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(245,245,245,0.2)', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}>
            Nessun prodotto trovato
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .catalog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .catalog-card-visual {
            height: 104px !important;
          }
          .catalog-card-info {
            padding: 10px 10px 11px !important;
          }
          .catalog-card-info > div:first-child {
            font-size: 0.48rem !important;
            letter-spacing: 0.1em !important;
            margin-bottom: 4px !important;
          }
          .catalog-card-info > div:nth-child(2) {
            font-size: 0.78rem !important;
            line-height: 1.15 !important;
            margin-bottom: 0 !important;
          }
          .catalog-card-desc {
            display: none !important;
          }
          .catalog-card-mobile-price {
            display: block !important;
          }
          .catalog-card-visual span {
            font-size: 0.48rem !important;
          }
        }
        @media (max-width: 420px) {
          .catalog-grid {
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  )
}
