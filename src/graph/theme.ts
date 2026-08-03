import type { ClusterId } from './compileGraph.ts'

export const CLUSTER_LABELS: Record<ClusterId, string> = {
  'cha-cha-cha': 'Cha Cha Cha',
  'turns-spins': 'Turns & Spins',
  'circle-cradle': 'Circle & Cradle',
  'holds-lifts': 'Holds & Lifts',
}

export const obsidianVoid = {
  bg: '#05060a',
  clusterColors: {
    'cha-cha-cha': '#8b5cf6',
    'turns-spins': '#38bdf8',
    'circle-cradle': '#34d399',
    'holds-lifts': '#f472b6',
  } as Record<ClusterId, string>,
  linkColor: 'rgba(255,255,255,0.28)',
  linkWidth: 0.6,
  arrowLength: 4,
  nodeBaseSize: 5,
  nodeSizePerDegree: 2.4,
  autoOrbitSpeed: 0.1,
  starCount: 900,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
} as const
