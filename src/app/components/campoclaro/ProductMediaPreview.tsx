import { useEffect, useRef, useState } from 'react'

type ProductMediaPreviewProps = {
  image?: string
  video?: string
  alt: string
  fit?: 'cover' | 'contain'
  controls?: boolean
}

function useInView() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

export function ProductMediaPreview({ image, video, alt, fit = 'cover', controls = false }: ProductMediaPreviewProps) {
  const { ref, visible } = useInView()
  const commonStyle = { width: '100%', height: '100%', objectFit: fit, background: '#050505', display: 'block' } as const

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', background: '#050505' }}>
      {image && visible && (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          style={commonStyle}
        />
      )}
      {!image && video && visible && (
        <video
          src={video}
          muted={!controls}
          controls={controls}
          playsInline
          preload={controls ? 'metadata' : 'none'}
          style={commonStyle}
        />
      )}
    </div>
  )
}
