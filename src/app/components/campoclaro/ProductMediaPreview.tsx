import { useEffect, useRef, useState } from 'react'

type ProductMediaPreviewProps = {
  image?: string
  video?: string
  alt: string
  fit?: 'cover' | 'contain'
  controls?: boolean
  previewSeconds?: number
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

export function ProductMediaPreview({ image, video, alt, fit = 'cover', controls = false, previewSeconds = 4 }: ProductMediaPreviewProps) {
  const { ref, visible } = useInView()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isVideoPreview = Boolean(video && !image && !controls)
  const commonStyle = { width: '100%', height: '100%', objectFit: fit, background: '#050505', display: 'block' } as const

  useEffect(() => {
    if (!visible || !isVideoPreview) return
    const element = videoRef.current
    if (!element) return

    element.currentTime = 0
    const playPromise = element.play()
    if (playPromise) playPromise.catch(() => undefined)
  }, [isVideoPreview, video, visible])

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
          ref={videoRef}
          src={video}
          aria-label={alt}
          muted
          autoPlay={isVideoPreview}
          controls={controls}
          playsInline
          preload={controls ? 'metadata' : 'auto'}
          onLoadedMetadata={() => {
            if (!isVideoPreview) return
            const element = videoRef.current
            if (!element) return
            element.currentTime = 0
            const playPromise = element.play()
            if (playPromise) playPromise.catch(() => undefined)
          }}
          onTimeUpdate={event => {
            if (!isVideoPreview || event.currentTarget.currentTime < previewSeconds) return
            event.currentTarget.currentTime = 0
            const playPromise = event.currentTarget.play()
            if (playPromise) playPromise.catch(() => undefined)
          }}
          style={commonStyle}
        />
      )}
    </div>
  )
}
