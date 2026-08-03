import type { ForceGraph3DInstance } from '3d-force-graph'
import type { GraphLink, GraphNode } from './compileGraph.ts'

declare global {
  interface Window {
    __jiveGraph?: ForceGraph3DInstance<GraphNode, GraphLink>
    /**
     * Test-only hook: lets e2e tests pause the continuous auto-orbit camera
     * animation so a node's projected screen position stays put between
     * computing click coordinates and dispatching the click, and lets them
     * wait for the force layout to have settled (positions stopped moving)
     * before reading a node's live position.
     */
    __jiveGraphControls?: {
      setAutoOrbitEnabled: (enabled: boolean) => void
      isLayoutStable: () => boolean
    }
  }
}

export {}
