import { BrowserRouter, Routes, Route } from 'react-router'
import { CartProvider } from './context/CartContext'
import { Navbar } from './components/campoclaro/Navbar'
import { HomePage } from './components/campoclaro/HomePage'
import { CatalogPage } from './components/campoclaro/CatalogPage'
import { ProductPage } from './components/campoclaro/ProductPage'
import { ProfilePage } from './components/campoclaro/ProfilePage'
import { CartDrawer } from './components/campoclaro/CartDrawer'
import { MobileNav } from './components/campoclaro/MobileNav'
import { AdminPage } from './components/campoclaro/AdminPage'
import { LegalPage } from './components/campoclaro/LegalPage'
import { ContactPage } from './components/campoclaro/ContactPage'

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div
          className="cc-shell"
          style={{
            minHeight: '100vh',
            background: '#050505',
            color: '#F5F5F5',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
          }}
        >
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/contatti" element={<ContactPage />} />
            <Route path="/prodotto/:id" element={<ProductPage />} />
            <Route path="/profilo" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
          </Routes>
          <CartDrawer />
          <MobileNav />
        </div>
      </CartProvider>
    </BrowserRouter>
  )
}
