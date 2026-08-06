// PROTOTYPE — throwaway. Text-parsing helpers shared by the three phone-
// portrait detail-panel variants (wayfinder ticket #21). Not the thing under
// test — each variant styles/positions this content differently.

import type { GraphData } from '../compileGraph.ts'

export interface DetailPanelVariantProps {
  graphData: GraphData
  isOpen: boolean
  moveId: string | null
  onClose: () => void
  onSelectMove: (id: string) => void
}

export const VARIANTS = ['default', 'A', 'B', 'C'] as const
export type Variant = (typeof VARIANTS)[number]

export function parseSectionLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

export function isBulletList(lines: string[]): boolean {
  return lines.length > 0 && lines.every((line) => line.startsWith('- '))
}

export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
