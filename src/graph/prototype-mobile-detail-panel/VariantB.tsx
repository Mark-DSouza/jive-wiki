// PROTOTYPE — throwaway. Variant B for wayfinder ticket #21: keeps the
// shipped right-edge panel geometry, but restructures it as header / scroll
// area / sticky footer. The header drops its close button entirely — the
// only way to close is the full-width footer bar pinned to the bottom of
// the panel, always in thumb reach regardless of scroll position.

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
      data-testid={`prototype-b-section-${slugify(title)}`}
      style={sectionStyle}
    >
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={isEmpty ? emptyBodyStyle : bodyStyle}>
        {isEmpty ? 'Not yet documented.' : <SectionBody text={text} />}
      </div>
    </section>
  )
}

function VariantB({
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
    <div
      data-testid="detail-panel"
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      style={{
        ...panelStyle,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      {node && (
        <>
          <div style={headerStyle}>
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
          <div style={scrollAreaStyle}>
            <Section title="Description" text={node.template.description} />
            <Section title="Steps" text={node.template.steps} />
            <Section
              title="Hold/hand position"
              text={node.template.holdHandPosition}
            />
            <Section title="Lead" text={node.template.lead} />
            <section
              data-testid="prototype-b-section-transitions-out"
              style={sectionStyle}
            >
              <h3 style={sectionTitleStyle}>Transitions out</h3>
              {transitionsOut.length === 0 ? (
                <div style={emptyBodyStyle}>Not yet documented.</div>
              ) : (
                <div style={rowListStyle}>
                  {transitionsOut.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`transition-chip-${t.id}`}
                      onClick={() => {
                        onSelectMove(t.id)
                      }}
                      style={rowButtonStyle}
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
          <div style={footerBarStyle}>
            <button
              type="button"
              data-testid="detail-panel-close"
              onClick={onClose}
              style={footerButtonStyle}
            >
              &larr; Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const panelStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '520px',
  maxWidth: '92vw',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(10, 11, 16, 0.94)',
  backdropFilter: 'blur(16px)',
  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.5)',
  zIndex: 15,
  transition: 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
  color: '#f4f4f5',
  fontFamily: obsidianVoid.fontFamily,
}

const headerStyle: CSSProperties = {
  flex: 'none',
  padding: '26px 24px 0',
}

const scrollAreaStyle: CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
  padding: '18px 24px 0',
}

const footerBarStyle: CSSProperties = {
  flex: 'none',
  padding: '12px 24px calc(12px + env(safe-area-inset-bottom, 0px))',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
}

const footerButtonStyle: CSSProperties = {
  width: '100%',
  minHeight: '48px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(255, 255, 255, 0.08)',
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
  marginBottom: '18px',
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
  fontSize: '14px',
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

const rowListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const rowButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  minHeight: '48px',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(255, 255, 255, 0.05)',
  fontSize: '14px',
  cursor: 'pointer',
  color: 'inherit',
  textAlign: 'left',
}

const chipDotStyle: CSSProperties = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  flex: 'none',
}

export default VariantB
