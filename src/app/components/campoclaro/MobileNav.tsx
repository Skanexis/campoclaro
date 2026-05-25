import { Link, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { Home, Grid3X3, ShoppingBag, User, MessageCircle } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export function MobileNav() {
  const location = useLocation()
  const { count, openCart } = useCart()

  const links = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/catalogo', icon: <Grid3X3 size={20} />, label: 'Shop' },
    { to: '/contatti', icon: <MessageCircle size={20} />, label: 'Chat' },
    { to: '/profilo', icon: <User size={20} />, label: 'Profilo' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div
      className="flex md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(5,5,5,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(214,178,94,0.06)',
        zIndex: 90,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        {links.slice(0, 2).map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              textDecoration: 'none',
              color: isActive(link.to) ? '#D6B25E' : 'rgba(245,245,245,0.35)',
              transition: 'color 0.2s',
            }}
          >
            {isActive(link.to) ? (
              <motion.div layoutId="mobile-nav-indicator" style={{ color: '#D6B25E' }}>
                {link.icon}
              </motion.div>
            ) : link.icon}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {link.label}
            </span>
          </Link>
        ))}

        {/* Cart Button (center) */}
        <button
          onClick={openCart}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '10px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: count > 0 ? '#D6B25E' : 'rgba(245,245,245,0.35)',
            position: 'relative',
            transition: 'color 0.2s',
          }}
        >
          <ShoppingBag size={20} />
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: 'absolute',
                top: 6,
                right: '28%',
                background: '#D6B25E',
                color: '#050505',
                borderRadius: '50%',
                width: 15,
                height: 15,
                fontSize: '0.6rem',
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
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Cart
          </span>
        </button>

        {links.slice(2).map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              textDecoration: 'none',
              color: isActive(link.to) ? '#D6B25E' : 'rgba(245,245,245,0.35)',
              transition: 'color 0.2s',
            }}
          >
            {link.icon}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {link.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
