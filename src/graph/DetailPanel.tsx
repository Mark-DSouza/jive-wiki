import type { CSSProperties } from 'react'
import { findNode, type GraphData, type GraphNode } from './compileGraph.ts'
import { CLUSTER_LABELS, obsidianVoid } from './theme.ts'

interface DetailPanelProps {
  graphData: GraphData
  isOpen: boolean
  moveId: string | null
  onClose: () => void
  onSelectMove: (id: string) => void
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseSectionLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function SectionBody({ text }: { text: string }) {
  const lines = parseSectionLines(text)
  const isBulletList =
    lines.length > 0 && lines.every((line) => line.startsWith('- '))

  if (isBulletList) {
    return (
      <ul style={listStyle}>
        {lines.map((line, index) => (
          <li key={index}>{line.slice(2).trim()}</li>
        ))}
      </ul>
    )
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} style={paragraphStyle}>
          {paragraph}
        </p>
      ))}
    </>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  const isEmpty = text.trim() === ''
  return (
    <section
      data-testid={`panel-section-${slugify(title)}`}
      style={sectionStyle}
    >
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={isEmpty ? emptyBodyStyle : bodyStyle}>
        {isEmpty ? 'Not yet documented.' : <SectionBody text={text} />}
      </div>
    </section>
  )
}

function TransitionsOutSection({
  targets,
  onSelectMove,
}: {
  targets: GraphNode[]
  onSelectMove: (id: string) => void
}) {
  const isEmpty = targets.length === 0
  return (
    <section data-testid="panel-section-transitions-out" style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Transitions out</h3>
      <div style={isEmpty ? emptyBodyStyle : bodyStyle}>
        {isEmpty ? (
          'Not yet documented.'
        ) : (
          <div style={chipRowStyle}>
            {targets.map((target) => (
              <button
                key={target.id}
                type="button"
                data-testid={`transition-chip-${target.id}`}
                onClick={() => {
                  onSelectMove(target.id)
                }}
                style={chipStyle}
              >
                <span
                  style={{
                    ...chipDotStyle,
                    background: obsidianVoid.clusterColors[target.cluster],
                  }}
                />
                {target.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function DetailPanel({
  graphData,
  isOpen,
  moveId,
  onClose,
  onSelectMove,
}: DetailPanelProps) {
  const node = moveId ? (findNode(graphData, moveId) ?? null) : null

  const transitionsOut = node
    ? graphData.links
        .filter((link) => link.source === node.id)
        .map((link) => findNode(graphData, link.target))
        .filter((target): target is GraphNode => target !== undefined)
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
          <h2 data-testid="detail-panel-name" style={nameStyle}>
            {node.name}
          </h2>
          <div
            data-testid="detail-panel-cluster"
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
          <TransitionsOutSection
            targets={transitionsOut}
            onSelectMove={onSelectMove}
          />
          <Section title="Notes/variations" text={node.template.notes} />
        </div>
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
  width: '30px',
  height: '30px',
  cursor: 'pointer',
  fontSize: '15px',
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

const chipRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
}

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px 5px 8px',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(255, 255, 255, 0.05)',
  fontSize: '13px',
  cursor: 'pointer',
  margin: '0 6px 6px 0',
  color: 'inherit',
}

const chipDotStyle: CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flex: 'none',
}

export default DetailPanel
