import { useEffect, useState } from 'react'

type ProductMediaPreviewProps = {
  image?: string
  video?: string
  alt: string
  fit?: 'cover' | 'contain'
  controls?: boolean
}

function useVideoPoster(video?: string) {
  const [poster, setPoster] = useState('')

  useEffect(() => {
    setPoster('')
    if (!video) return

    let cancelled = false
    const element = document.createElement('video')
    element.crossOrigin = 'anonymous'
    element.muted = true
    element.playsInline = true
    element.preload = 'metadata'
    element.src = video

    const capture = () => {
      if (cancelled || !element.videoWidth || !element.videoHeight) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = element.videoWidth
        canvas.height = element.videoHeight
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(element, 0, 0, canvas.width, canvas.height)
        setPoster(canvas.toDataURL('image/jpeg', 0.82))
      } catch {
        setPoster('')
      }
    }

    const seekToFrame = () => {
      if (cancelled) return
      try {
        element.currentTime = Math.min(0.1, Math.max(0, (element.duration || 1) - 0.01))
      } catch {
        capture()
      }
    }

    element.addEventListener('loadedmetadata', seekToFrame)
    element.addEventListener('seeked', capture)
    element.addEventListener('loadeddata', capture)
    element.load()

    return () => {
      cancelled = true
      element.removeEventListener('loadedmetadata', seekToFrame)
      element.removeEventListener('seeked', capture)
      element.removeEventListener('loadeddata', capture)
      element.removeAttribute('src')
      element.load()
    }
  }, [video])

  return poster
}

export function ProductMediaPreview({ image, video, alt, fit = 'cover', controls = false }: ProductMediaPreviewProps) {
  const poster = useVideoPoster(video)
  const commonStyle = { width: '100%', height: '100%', objectFit: fit, background: '#050505' } as const

  if (image) {
    return <img src={image} alt={alt} style={commonStyle} />
  }

  if (!video) return null

  if (!controls && poster) {
    return <img src={poster} alt={alt} style={commonStyle} />
  }

  return (
    <video
      src={video}
      poster={poster || undefined}
      muted={!controls}
      controls={controls}
      playsInline
      preload="metadata"
      style={commonStyle}
    />
  )
}
