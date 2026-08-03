// PROTOTYPE — throwaway. Answers issue #19 ("touch camera control behavior")
// for the mobile-compatibility wayfinder map (issue #18): does the default
// touch gesture mapping need tuning, and should auto-orbit pause while the
// user is manipulating the camera? Not meant to reach main as-is — see
// docs/agents/... wayfinder map for how the winning variant gets folded in.
/* eslint-disable react-refresh/only-export-components -- prototype file, throwaway */
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

export type CameraVariantKey = 'A' | 'B' | 'C'

export const CAMERA_VARIANTS: Record<
  CameraVariantKey,
  { name: string; description: string }
> = {
  A: {
    name: 'Baseline',
    description:
      'Ships today: default TrackballControls, auto-orbit never pauses.',
  },
  B: {
    name: 'No-pan + delayed resume',
    description:
      'Pan disabled (rotate + pinch-zoom only), rotate slowed for touch, auto-orbit pauses on touch and resumes 600ms after release.',
  },
  C: {
    name: 'Damped pan + instant resume',
    description:
      'Pan kept but slowed, auto-orbit pauses on touch and resumes the instant it ends.',
  },
}

const VARIANT_KEYS = Object.keys(CAMERA_VARIANTS) as CameraVariantKey[]

function readVariantFromUrl(): CameraVariantKey {
  const raw = new URLSearchParams(window.location.search).get('variant')
  return raw !== null && (VARIANT_KEYS as string[]).includes(raw)
    ? (raw as CameraVariantKey)
    : 'A'
}

export function useCameraVariant(): [
  CameraVariantKey,
  (variant: CameraVariantKey) => void,
] {
  const [variant, setVariantState] = useState<CameraVariantKey>(() =>
    import.meta.env.DEV ? readVariantFromUrl() : 'A',
  )

  function setVariant(next: CameraVariantKey): void {
    setVariantState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    window.history.replaceState(null, '', url)
  }

  return [variant, setVariant]
}

function cycle(current: CameraVariantKey, direction: 1 | -1): CameraVariantKey {
  const index = VARIANT_KEYS.indexOf(current)
  const nextIndex =
    (index + direction + VARIANT_KEYS.length) % VARIANT_KEYS.length
  return VARIANT_KEYS[nextIndex]
}

export function CameraControlPrototypeSwitcher({
  variant,
  onChange,
}: {
  variant: CameraVariantKey
  onChange: (variant: CameraVariantKey) => void
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'ArrowLeft') onChange(cycle(variant, -1))
      if (event.key === 'ArrowRight') onChange(cycle(variant, 1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [variant, onChange])

  if (!import.meta.env.DEV) return null

  const info = CAMERA_VARIANTS[variant]

  return (
    <div style={barStyle}>
      <button
        style={arrowStyle}
        onClick={() => {
          onChange(cycle(variant, -1))
        }}
      >
        ←
      </button>
      <span style={labelStyle} title={info.description}>
        {variant} — {info.name}
      </span>
      <button
        style={arrowStyle}
        onClick={() => {
          onChange(cycle(variant, 1))
        }}
      >
        →
      </button>
    </div>
  )
}

const barStyle: CSSProperties = {
  position: 'fixed',
  bottom: '0.5em',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4em',
  maxWidth: '90vw',
  padding: '0.3em 0.6em',
  borderRadius: '999px',
  background: 'rgba(255, 61, 129, 0.85)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '11px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  zIndex: 9999,
}

const arrowStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: '1.1em',
  cursor: 'pointer',
  padding: '0 0.2em',
  lineHeight: 1,
}

const labelStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '70vw',
}
