import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ChevronDown, Star, Shield, Zap, Globe2, MapPin, Truck, CreditCard, PackageCheck } from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { useSiteContent } from '../../hooks/useSiteContent'
import { api } from '../../lib/api'

const REVEAL = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
}

function NoiseOverlay() {
  return (
    <svg
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 2 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="cc-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#cc-noise)" />
    </svg>
  )
}

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2600)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#D6B25E',
        }}
      >
        CAMPOCLARO
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
        style={{
          width: 60,
          height: 1,
          background: '#D6B25E',
        }}
      />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.45, y: 0 }}
        transition={{ duration: 0.6, delay: 1.6 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.7rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#F5F5F5',
        }}
      >
        Accesso Riservato
      </motion.p>
    </motion.div>
  )
}

export function HomePage() {
  const { products } = useProducts()
  const siteContent = useSiteContent()
  const [introPlayed, setIntroPlayed] = useState(() => sessionStorage.getItem('cc-intro') === '1')
  const [showIntro, setShowIntro] = useState(!introPlayed)
  const [customerSignedIn, setCustomerSignedIn] = useState<boolean | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroY = useTransform(scrollY, [0, 400], [0, -80])

  const handleIntroComplete = () => {
    sessionStorage.setItem('cc-intro', '1')
    setShowIntro(false)
    setIntroPlayed(true)
  }

  useEffect(() => {
    let cancelled = false
    api.customerMe()
      .then(result => {
        if (!cancelled) setCustomerSignedIn(Boolean(result.user))
      })
      .catch(() => {
        if (!cancelled) setCustomerSignedIn(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <NoiseOverlay />

      <AnimatePresence>
        {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <motion.div
        initial={introPlayed ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: introPlayed ? 0 : 0.2 }}
      >
        {/* Hero */}
        <section
          className="home-hero"
          ref={heroRef}
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '120px 24px 80px',
          }}
        >
          {/* Background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#050505',
          }} />

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'transparent',
          }} />

          <motion.div
            style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: 760 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: introPlayed ? 0.1 : 2.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.7rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#D6B25E',
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <span style={{ width: 24, height: 1, background: '#D6B25E', display: 'inline-block' }} />
              Sistema Riservato
              <span style={{ width: 24, height: 1, background: '#D6B25E', display: 'inline-block' }} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: introPlayed ? 0.2 : 2.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#F5F5F5',
                marginBottom: 24,
              }}
            >
              Accesso riservato.{' '}
              <span style={{
                color: '#D6B25E',
              }}>
                Qualità
              </span>
              {' '}senza compromessi.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: introPlayed ? 0.4 : 3.1 }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'rgba(245,245,245,0.45)',
                marginBottom: 48,
                maxWidth: 500,
                margin: '0 auto 48px',
              }}
            >
              Selezione premium. Coltivazione controllata. Esperienza digitale esclusiva per chi sa riconoscere la differenza.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: introPlayed ? 0.6 : 3.3 }}
              style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <Link to="/catalogo" style={{ textDecoration: 'none' }}>
                  <motion.button
                    className="cc-gold-button"
                    whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(214,178,94,0.2)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '14px 32px',
                    background: '#D6B25E',
                    color: '#050505',
                    border: 'none',
                    borderRadius: 4,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Entra nel Catalogo
                  <ArrowRight size={14} />
                </motion.button>
              </Link>

              {customerSignedIn === false && (
                <Link to="/profilo" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.03, borderColor: 'rgba(214,178,94,0.5)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '14px 32px',
                      background: 'transparent',
                      color: 'rgba(245,245,245,0.7)',
                      border: '1px solid rgba(245,245,245,0.15)',
                      borderRadius: 4,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    Accedi
                  </motion.button>
                </Link>
              )}
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: introPlayed ? 1 : 3.8 }}
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              zIndex: 3,
            }}
          >
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,245,245,0.3)' }}>
              Scroll
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={14} color="rgba(245,245,245,0.3)" />
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Row */}
        <motion.section className="home-stats-section" {...REVEAL} style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="home-stats-grid" style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {[
              { icon: <Shield size={20} />, label: 'Qualità Garantita', value: '100%' },
              { icon: <Star size={20} />, label: 'Varietà Premium', value: '6+' },
              { icon: <Zap size={20} />, label: 'Consegna Discreta', value: '24h' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              >
                <div style={{ color: '#D6B25E' }}>{stat.icon}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#F5F5F5',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  color: 'rgba(245,245,245,0.35)',
                  textTransform: 'uppercase',
                }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Operations Info */}
        <section className="home-info-section" style={{ padding: '96px 24px 40px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <motion.div {...REVEAL} style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 40, alignItems: 'start' }} className="home-info-grid">
              <div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#D6B25E',
                  marginBottom: 16,
                }}>
                  Info operative
                </div>
                <h2 style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: 'clamp(1.9rem, 4vw, 3rem)',
                  lineHeight: 1.1,
                  color: '#F5F5F5',
                  margin: '0 0 18px',
                }}>
                  {siteContent.welcomeTitle}
                </h2>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  color: 'rgba(245,245,245,0.48)',
                  maxWidth: 440,
                  marginBottom: 28,
                }}>
                  {siteContent.welcomeSubtitle}
                </p>
                <Link to="/contatti" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.03, borderColor: 'rgba(214,178,94,0.5)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '12px 22px',
                      background: 'rgba(214,178,94,0.08)',
                      color: '#D6B25E',
                      border: '1px solid rgba(214,178,94,0.24)',
                      borderRadius: 6,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    Contatti ufficiali <ArrowRight size={14} />
                  </motion.button>
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }} className="home-info-cards">
                {siteContent.infoCards.map((card, i) => {
                  const icons = [<Globe2 size={18} />, <MapPin size={18} />, <Truck size={18} />, <PackageCheck size={18} />, <CreditCard size={18} />]
                  return (
                    <motion.div
                      key={`${card.title}-${i}`}
                      className="cc-interactive-card cc-animated-surface"
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.06 }}
                      whileHover={{ y: -5, borderColor: 'rgba(214,178,94,0.24)', boxShadow: '0 16px 50px rgba(214,178,94,0.07)' }}
                      style={{
                        minHeight: 132,
                        padding: 18,
                        background: '#0b0b0c',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8,
                      }}
                    >
                      <div className="cc-float-icon" style={{ color: '#D6B25E', marginBottom: 14 }}>{icons[i % icons.length]}</div>
                      <div style={{
                        fontFamily: "'Satoshi', sans-serif",
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#F5F5F5',
                        marginBottom: 8,
                      }}>
                        {card.title}
                      </div>
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.8rem',
                        lineHeight: 1.55,
                        color: 'rgba(245,245,245,0.44)',
                      }}>
                        {card.body}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Manifesto */}
        <motion.section
          className="home-manifesto"
          {...REVEAL}
          style={{
            padding: '100px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: '#050505',
          }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
              fontWeight: 500,
              color: 'rgba(245,245,245,0.7)',
              lineHeight: 1.6,
              letterSpacing: '-0.01em',
            }}>
              "Non siamo un negozio.{' '}
              <span style={{ color: '#F5F5F5', fontWeight: 700 }}>Siamo un livello superiore.</span>
              {' '}Ogni prodotto è curato, ogni dettaglio è pensato."
            </div>
            <div style={{
              marginTop: 32,
              width: 40,
              height: 1,
              background: '#D6B25E',
              margin: '32px auto 0',
            }} />
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="home-footer" style={{
          padding: '40px 24px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#D6B25E',
          }}>
            CAMPOCLARO
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: 'rgba(245,245,245,0.2)',
            letterSpacing: '0.05em',
          }}>
            © 2026 — Tutti i diritti riservati
          </div>
        </footer>
      </motion.div>

      <style>{`
        @keyframes shimmerGold {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @media (max-width: 860px) {
          .home-info-grid {
            grid-template-columns: 1fr !important;
          }
          .home-info-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 700px) {
          .home-hero {
            min-height: 100dvh !important;
            padding: 98px 14px 78px !important;
          }
          .home-stats-section {
            padding: 34px 12px !important;
          }
          .home-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .home-stats-grid > div {
            gap: 8px !important;
          }
          .home-stats-grid > div > div:nth-child(2) {
            font-size: 1.3rem !important;
          }
          .home-stats-grid > div > div:last-child {
            font-size: 0.6rem !important;
            letter-spacing: 0.04em !important;
          }
          .home-info-section {
            padding: 48px 12px 30px !important;
          }
          .home-info-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .home-info-cards > div {
            min-height: 118px !important;
            padding: 12px !important;
          }
          .home-info-cards > div > div:first-child {
            margin-bottom: 8px !important;
          }
          .home-info-cards > div > div:nth-child(2) {
            font-size: 0.82rem !important;
            margin-bottom: 6px !important;
          }
          .home-info-cards > div > div:nth-child(3) {
            font-size: 0.68rem !important;
            line-height: 1.35 !important;
          }
          .home-products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .home-product-visual {
            height: 96px !important;
          }
          .home-product-info {
            padding: 10px !important;
          }
          .home-product-info > div:first-child {
            font-size: 0.48rem !important;
            letter-spacing: 0.1em !important;
            margin-bottom: 4px !important;
          }
          .home-product-info > div:nth-child(2) {
            font-size: 0.78rem !important;
            line-height: 1.15 !important;
            margin-bottom: 7px !important;
          }
          .home-product-desc {
            display: none !important;
          }
          .home-manifesto {
            padding: 54px 14px !important;
          }
          .home-footer {
            padding: 26px 14px calc(88px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
        @media (max-width: 350px) {
          .home-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .home-info-cards {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
