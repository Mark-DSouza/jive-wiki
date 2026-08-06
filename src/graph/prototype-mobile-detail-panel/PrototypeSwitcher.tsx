// PROTOTYPE — throwaway. Floating bottom-centre switcher for wayfinder
// ticket #21's detail-panel variants. Dev-only: never rendered in a
// production build (gated where it's mounted in GraphView.tsx).

import type { CSSProperties } from 'react'
import { useCallback, useEffect } from 'react'
import { VARIANTS, type Variant } from './content.ts'

const LABELS: Record<Variant, string> = {
  default: 'Baseline (shipped)',
  A: 'A — Bottom sheet',
  B: 'B — Sticky footer bar',
  C: 'C — FAB + stacked rows',
}

interface PrototypeSwitcherProps {
  current: Variant
  onChange: (variant: Variant) => void
}

function PrototypeSwitcher({ current, onChange }: PrototypeSwitcherProps) {
  const index = VARIANTS.indexOf(current)

  const cycle = useCallback(
    (delta: number) => {
      const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length]
      onChange(next)
    },
    [index, onChange],
  )

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (target?.isContentEditable) return
      if (event.key === 'ArrowLeft') cycle(-1)
      if (event.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [cycle])

  return (
    <div style={barStyle} data-testid="prototype-switcher">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => {
          cycle(-1)
        }}
        style={arrowStyle}
      >
        &larr;
      </button>
      <span style={labelStyle}>{LABELS[current]}</span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => {
          cycle(1)
        }}
        style={arrowStyle}
      >
        &rarr;
      </button>
    </div>
  )
}

const barStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: '16px',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '999px',
  background: '#fff',
  color: '#111',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  zIndex: 999,
}

const arrowStyle: CSSProperties = {
  border: 'none',
  background: '#eee',
  borderRadius: '50%',
  width: '28px',
  height: '28px',
  cursor: 'pointer',
  fontSize: '14px',
  lineHeight: 1,
}

const labelStyle: CSSProperties = {
  minWidth: '160px',
  textAlign: 'center',
}

export default PrototypeSwitcher
