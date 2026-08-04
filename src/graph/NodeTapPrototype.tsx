// PROTOTYPE — throwaway. Answers issue #20 ("node tap interaction") for the
// mobile-compatibility wayfinder map (issue #18): does the node hit-target
// need to be larger than the visible sphere for touch, and does losing the
// hover-preview step (no touch equivalent) matter given tap already opens
// the full detail panel? Not meant to reach main as-is — see wayfinder map
// #18 for how the winning variant gets folded in.
/* eslint-disable react-refresh/only-export-components -- prototype file, throwaway */
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

export type NodeTapVariantKey = 'A' | 'B' | 'C'

export const NODE_TAP_VARIANTS: Record<
  NodeTapVariantKey,
  { name: string; description: string }
> = {
  A: {
    name: 'Baseline',
    description:
      'Ships today: the visible sphere is the only hit-target, no tap feedback beyond the panel opening.',
  },
  B: {
    name: 'Padded hit-target',
    description:
      'Invisible sphere around each node (size + 6 world units) is the real hit-target; visible sphere unchanged.',
  },
  C: {
    name: 'Padded + tap pulse',
    description:
      'Same padded hit-target as B, plus a quick scale/glow pulse on the tapped node as touch-down feedback.',
  },
}

const VARIANT_KEYS = Object.keys(NODE_TAP_VARIANTS) as NodeTapVariantKey[]

function readVariantFromUrl(): NodeTapVariantKey {
  const raw = new URLSearchParams(window.location.search).get('variant')
  return raw !== null && (VARIANT_KEYS as string[]).includes(raw)
    ? (raw as NodeTapVariantKey)
    : 'A'
}

export function useNodeTapVariant(): [
  NodeTapVariantKey,
  (variant: NodeTapVariantKey) => void,
] {
  const [variant, setVariantState] = useState<NodeTapVariantKey>(() =>
    import.meta.env.DEV ? readVariantFromUrl() : 'A',
  )

  function setVariant(next: NodeTapVariantKey): void {
    setVariantState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    window.history.replaceState(null, '', url)
  }

  return [variant, setVariant]
}

function cycle(
  current: NodeTapVariantKey,
  direction: 1 | -1,
): NodeTapVariantKey {
  const index = VARIANT_KEYS.indexOf(current)
  const nextIndex =
    (index + direction + VARIANT_KEYS.length) % VARIANT_KEYS.length
  return VARIANT_KEYS[nextIndex]
}

export function NodeTapPrototypeSwitcher({
  variant,
  onChange,
}: {
  variant: NodeTapVariantKey
  onChange: (variant: NodeTapVariantKey) => void
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

  const info = NODE_TAP_VARIANTS[variant]

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
