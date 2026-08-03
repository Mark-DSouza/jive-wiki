import { describe, expect, test } from 'vitest'
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
})
