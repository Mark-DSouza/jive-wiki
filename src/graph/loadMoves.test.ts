import { describe, expect, test } from 'vitest'
import { CLUSTER_IDS } from './compileGraph.ts'
import { loadGraphData } from './loadMoves.ts'

describe('loadGraphData', () => {
  test('compiles the real content/moves dataset without throwing', () => {
    expect(() => loadGraphData()).not.toThrow()
  })

  test('produces the full real move/transition dataset', () => {
    const result = loadGraphData()

    expect(result.nodes).toHaveLength(11)
    expect(result.links).toHaveLength(6)
  })

  test('every node has a cluster from the fixed set and a computed degree', () => {
    const result = loadGraphData()

    for (const node of result.nodes) {
      expect(CLUSTER_IDS).toContain(node.cluster)
      expect(node.degree).toBeGreaterThanOrEqual(0)
    }
  })
})
