import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react'
import { ShoppingBag, User, X, Menu } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastScroll = useRef(0)
  const { count, openCart } = useCart()
  const location = useLocation()
  const { scrollYProgress } = useScroll()
  const scrollProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.2 })

  useEffect(() => {
    const onScroll = () => {
      const curr = window.scrollY
      setScrolled(curr > 20)
      setVisible(curr < 20 || curr < lastScroll.current)
      lastScroll.current = curr
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const navLinks = [
    { to: '/catalogo', label: 'Catalogo' },
    { to: '/contatti', label: 'Contatti' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <motion.nav
        className="cc-navbar"
        animate={{ y: visible ? 0 : -90 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(5,5,5,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(214,178,94,0.08)' : '1px solid transparent',
          transition: 'background 0.4s ease, border 0.4s ease, backdrop-filter 0.4s ease',
        }}
      >
        <div className="cc-navbar-inner" style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link className="cc-navbar-logo" to="/" style={{ textDecoration: 'none', minWidth: 0 }}>
            <motion.div
              className="cc-navbar-wordmark"
              whileHover={{ scale: 1.02 }}
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                color: '#D6B25E',
              }}
            >
              CAMPOCLARO
            </motion.div>
          </Link>

          {/* Desktop Links */}
          <div style={{ gap: 40, alignItems: 'center' }} className="hidden md:flex">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  textDecoration: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isActive(link.to) ? '#D6B25E' : 'rgba(245,245,245,0.5)',
                  transition: 'color 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive(link.to)) (e.target as HTMLElement).style.color = 'rgba(245,245,245,0.9)'
                }}
                onMouseLeave={e => {
                  if (!isActive(link.to)) (e.target as HTMLElement).style.color = 'rgba(245,245,245,0.5)'
                }}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: '#D6B25E',
                    }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="cc-navbar-actions" style={{ display: 'flex', gap: 'clamp(12px, 3vw, 20px)', alignItems: 'center' }}>
            <Link to="/profilo" style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              color: isActive('/profilo') ? '#050505' : 'rgba(245,245,245,0.5)',
              background: isActive('/profilo') ? '#D6B25E' : 'rgba(255,255,255,0.03)',
              border: isActive('/profilo') ? '1px solid rgba(214,178,94,0.6)' : '1px solid rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s',
            }}
              className="hidden md:flex"
              onMouseEnter={e => {
                e.currentTarget.style.color = '#050505'
                e.currentTarget.style.background = '#D6B25E'
                e.currentTarget.style.borderColor = 'rgba(214,178,94,0.6)'
                e.currentTarget.style.boxShadow = '0 0 22px rgba(214,178,94,0.18)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = isActive('/profilo') ? '#050505' : 'rgba(245,245,245,0.5)'
                e.currentTarget.style.background = isActive('/profilo') ? '#D6B25E' : 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = isActive('/profilo') ? 'rgba(214,178,94,0.6)' : 'rgba(255,255,255,0.08)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <User size={18} />
            </Link>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCart}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(245,245,245,0.7)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
              }}
            >
              <ShoppingBag size={18} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#D6B25E',
                      color: '#050505',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      fontSize: '0.65rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="flex md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.7)', padding: 0 }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -1,
            height: 1,
            transformOrigin: '0% 50%',
            scaleX: scrollProgress,
            background: '#D6B25E',
            boxShadow: '0 0 18px rgba(214,178,94,0.28)',
          }}
        />
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="cc-mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              top: 80,
              left: 0,
              right: 0,
              zIndex: 99,
              background: 'rgba(5,5,5,0.97)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(214,178,94,0.1)',
              padding: '28px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  textDecoration: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isActive(link.to) ? '#D6B25E' : 'rgba(245,245,245,0.7)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmerGold {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @media (max-width: 420px) {
          .cc-navbar-inner {
            height: 64px !important;
            padding: 0 12px !important;
          }
          .cc-navbar-wordmark {
            font-size: 0.92rem !important;
            letter-spacing: 0.15em !important;
          }
          .cc-navbar-actions {
            gap: 12px !important;
          }
          .cc-mobile-menu {
            top: 64px !important;
            padding: 20px 14px !important;
            gap: 18px !important;
          }
        }
      `}</style>
    </>
  )
}
