// PROTOTYPE — throwaway. Variant C for wayfinder ticket #21: the smallest
// diff from shipped. Same top-anchored right-edge panel and top-right close
// button as production, but adds a floating close FAB pinned to the
// viewport's bottom-right corner (thumb zone, independent of the panel's
// own scroll position) and swaps the wrapped chip row for full-width
// stacked rows.

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
      data-testid={`prototype-c-section-${slugify(title)}`}
      style={sectionStyle}
    >
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={isEmpty ? emptyBodyStyle : bodyStyle}>
        {isEmpty ? 'Not yet documented.' : <SectionBody text={text} />}
      </div>
    </section>
  )
}

function VariantC({
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
        <div style={panelHeaderStyle}>
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
        {node && (
          <div style={contentStyle}>
            <h2 style={nameStyle}>{node.name}</h2>
            <div
              style={{
                ...clusterTagStyle,
                color: obsidianVoid.clusterColors[node.cluster],
              }}
            >
              {CLUSTER_LABELS[node.cluster]}
            </div>
            <Section title="Description" text={node.template.description} />
            <Section title="Steps" text={node.template.steps} />
            <Section
              title="Hold/hand position"
              text={node.template.holdHandPosition}
            />
            <Section title="Lead" text={node.template.lead} />
            <section
              data-testid="prototype-c-section-transitions-out"
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
        )}
      </div>
      {isOpen && (
        <button
          type="button"
          data-testid="prototype-c-fab-close"
          aria-label="Close"
          onClick={onClose}
          style={fabStyle}
        >
          &times;
        </button>
      )}
    </>
  )
}

const panelStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '520px',
  maxWidth: '92vw',
  background: 'rgba(10, 11, 16, 0.82)',
  backdropFilter: 'blur(16px)',
  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.5)',
  zIndex: 15,
  padding: '26px 24px',
  overflowY: 'auto',
  transition: 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
  color: '#f4f4f5',
  fontFamily: obsidianVoid.fontFamily,
}

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
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
}

const fabStyle: CSSProperties = {
  position: 'fixed',
  right: '20px',
  bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  background: 'rgba(20, 22, 30, 0.92)',
  color: '#f4f4f5',
  fontSize: '24px',
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  zIndex: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const contentStyle: CSSProperties = {}

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

export default VariantC
