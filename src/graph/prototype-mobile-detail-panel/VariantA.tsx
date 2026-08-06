// PROTOTYPE — throwaway. Variant A for wayfinder ticket #21: bottom sheet.
// Slides up from the bottom instead of in from the right, so the header
// (name + close) lands mid-screen — inside one-handed thumb reach — rather
// than pinned to the top edge. Dismiss via backdrop tap, close button, or
// the bottom "Close" bar.

import type { CSSProperties } from 'react'
import { findNode } from '../compileGraph.ts'
import { CLUSTER_LABELS, obsidianVoid } from '../theme.ts'
import {
  type DetailPanelVariantProps,
  isBulletList,
  paragraphsOf,
  parseSectionLines,
  slugify,
} from './content.ts'

function SectionBody({ text }: { text: string }) {
  const lines = parseSectionLines(text)
  if (isBulletList(lines)) {
    return (
      <ul style={listStyle}>
        {lines.map((line, i) => (
          <li key={i}>{line.slice(2).trim()}</li>
        ))}
      </ul>
    )
  }
  return (
    <>
      {paragraphsOf(text).map((p, i) => (
        <p key={i} style={paragraphStyle}>
          {p}
        </p>
      ))}
    </>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  const isEmpty = text.trim() === ''
  return (
    <section
      data-testid={`prototype-a-section-${slugify(title)}`}
      style={sectionStyle}
    >
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={isEmpty ? emptyBodyStyle : bodyStyle}>
        {isEmpty ? 'Not yet documented.' : <SectionBody text={text} />}
      </div>
    </section>
  )
}

function VariantA({
  graphData,
  isOpen,
  moveId,
  onClose,
  onSelectMove,
}: DetailPanelVariantProps) {
  const node = moveId ? (findNode(graphData, moveId) ?? null) : null
  const transitionsOut = node
    ? graphData.links
        .filter((link) => link.source === node.id)
        .map((link) => findNode(graphData, link.target))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
    : []

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        data-testid="prototype-a-backdrop"
        onClick={onClose}
        style={{
          ...backdropStyle,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        data-testid="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        style={{
          ...sheetStyle,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div style={dragHandleStyle} />
        {node && (
          <>
            <div style={headerRowStyle}>
              <div>
                <h2 style={nameStyle}>{node.name}</h2>
                <div
                  style={{
                    ...clusterTagStyle,
                    color: obsidianVoid.clusterColors[node.cluster],
                  }}
                >
                  {CLUSTER_LABELS[node.cluster]}
                </div>
              </div>
              <button
                type="button"
                data-testid="detail-panel-close"
                aria-label="Close"
                onClick={onClose}
                style={closeButtonStyle}
              >
                &times;
              </button>
            </div>
            <div style={scrollAreaStyle}>
              <Section title="Description" text={node.template.description} />
              <Section title="Steps" text={node.template.steps} />
              <Section
                title="Hold/hand position"
                text={node.template.holdHandPosition}
              />
              <Section title="Lead" text={node.template.lead} />
              <section
                data-testid="prototype-a-section-transitions-out"
                style={sectionStyle}
              >
                <h3 style={sectionTitleStyle}>Transitions out</h3>
                {transitionsOut.length === 0 ? (
                  <div style={emptyBodyStyle}>Not yet documented.</div>
                ) : (
                  <div style={chipRowStyle}>
                    {transitionsOut.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`transition-chip-${t.id}`}
                        onClick={() => {
                          onSelectMove(t.id)
                        }}
                        style={chipStyle}
                      >
                        <span
                          style={{
                            ...chipDotStyle,
                            background: obsidianVoid.clusterColors[t.cluster],
                          }}
                        />
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <Section title="Notes/variations" text={node.template.notes} />
            </div>
            <button
              type="button"
              data-testid="prototype-a-bottom-close"
              onClick={onClose}
              style={bottomCloseBarStyle}
            >
              Close
            </button>
          </>
        )}
      </div>
    </>
  )
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  border: 'none',
  padding: 0,
  cursor: 'default',
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 14,
  transition: 'opacity 0.3s ease',
}

const sheetStyle: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '82vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(10, 11, 16, 0.94)',
  backdropFilter: 'blur(16px)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  borderTopLeftRadius: '20px',
  borderTopRightRadius: '20px',
  boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.5)',
  zIndex: 15,
  transition: 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
  color: '#f4f4f5',
  fontFamily: obsidianVoid.fontFamily,
}

const dragHandleStyle: CSSProperties = {
  width: '36px',
  height: '4px',
  borderRadius: '999px',
  background: 'rgba(255, 255, 255, 0.25)',
  margin: '10px auto 0',
  flex: 'none',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '14px 20px 12px',
  flex: 'none',
}

const closeButtonStyle: CSSProperties = {
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'inherit',
  borderRadius: '999px',
  width: '44px',
  height: '44px',
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
}

const scrollAreaStyle: CSSProperties = {
  overflowY: 'auto',
  padding: '0 20px',
}

const bottomCloseBarStyle: CSSProperties = {
  flex: 'none',
  margin: '12px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
  padding: '14px',
  minHeight: '48px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'inherit',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
}

const nameStyle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 4px',
}

const clusterTagStyle: CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.85,
}

const sectionStyle: CSSProperties = {
  marginBottom: '18px',
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.55,
  fontWeight: 600,
  margin: '0 0 6px',
}

const bodyStyle: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.55,
  opacity: 0.92,
}

const emptyBodyStyle: CSSProperties = {
  ...bodyStyle,
  opacity: 0.35,
  fontStyle: 'italic',
}

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '18px',
}

const paragraphStyle: CSSProperties = {
  margin: '0 0 8px',
}

const chipRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
}

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px 10px 10px',
  minHeight: '44px',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(255, 255, 255, 0.05)',
  fontSize: '14px',
  cursor: 'pointer',
  margin: '0 8px 8px 0',
  color: 'inherit',
}

const chipDotStyle: CSSProperties = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  flex: 'none',
}

export default VariantA
