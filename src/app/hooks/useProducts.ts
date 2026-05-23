import { useEffect, useState } from 'react'
import { FALLBACK_PRODUCTS, Product } from '../components/campoclaro/data'
import { api } from '../lib/api'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getProducts()
      .then(data => {
        if (!cancelled) setProducts(data)
      })
      .catch(() => {
        if (!cancelled) setProducts(FALLBACK_PRODUCTS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { products, loading }
}
