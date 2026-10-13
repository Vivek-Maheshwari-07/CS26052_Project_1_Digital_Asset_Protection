import * as React from 'react'
import { ImageOff } from 'lucide-react'

import { cn } from '@/lib/utils'

type RemoteImageProps = {
  src: string | null
  alt: string
  /** CSS aspect-ratio for the frame, e.g. "4 / 3". */
  ratio: string
  className?: string
  imgClassName?: string
  onMeasured?: (heightOverWidth: number) => void
}

/** Image frame with a shimmer while loading and a clear fallback when the file is missing. */
export function RemoteImage({ src, alt, ratio, className, imgClassName, onMeasured }: RemoteImageProps) {
  const [state, setState] = React.useState<'loading' | 'loaded' | 'failed'>(src ? 'loading' : 'failed')

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)} style={{ aspectRatio: ratio }}>
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-accent" />}
      {state === 'failed' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <ImageOff className="size-6" aria-hidden="true" />
          Image unavailable
        </div>
      ) : (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            setState('loaded')
            const img = e.currentTarget
            if (img.naturalWidth) onMeasured?.(img.naturalHeight / img.naturalWidth)
          }}
          onError={() => setState('failed')}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-500',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  )
}
