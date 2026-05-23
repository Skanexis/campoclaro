import React, { createContext, useContext, useState, useCallback } from 'react'

export interface CartItem {
  id: string
  name: string
  weight: string
  strain?: string
  price: number
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (id: string, weight: string, strain?: string) => void
  updateQuantity: (id: string, weight: string, delta: number, strain?: string) => void
  openCart: () => void
  closeCart: () => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.weight === item.weight && (i.strain || '') === (item.strain || ''))
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.weight === item.weight && (i.strain || '') === (item.strain || '')
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string, weight: string, strain = '') => {
    setItems(prev => prev.filter(i => !(i.id === id && i.weight === weight && (i.strain || '') === strain)))
  }, [])

  const updateQuantity = useCallback((id: string, weight: string, delta: number, strain = '') => {
    setItems(prev =>
      prev
        .map(i =>
          i.id === id && i.weight === weight && (i.strain || '') === strain
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter(i => i.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, isOpen,
      addItem, removeItem, updateQuantity,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      clearCart,
      total, count
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
