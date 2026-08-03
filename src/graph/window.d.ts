import type { ForceGraph3DInstance } from '3d-force-graph'
import type { GraphLink, GraphNode } from './compileGraph.ts'

declare global {
  interface Window {
    __jiveGraph?: ForceGraph3DInstance<GraphNode, GraphLink>
  }
}

export {}
