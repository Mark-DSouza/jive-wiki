import { describe, expect, test } from 'vitest'
import { compileGraph } from './compileGraph.ts'

function moveFile(filename: string, name: string, transitionsOut: string[]) {
  return {
    filename,
    content: `---\nname: ${name}\ntransitions_out: [${transitionsOut.join(', ')}]\n---\n`,
  }
}

describe('compileGraph', () => {
  test('a single move with no transitions produces one node and no links', () => {
    const result = compileGraph([moveFile('cradle.md', 'Cradle', [])])

    expect(result).toEqual({
      nodes: [{ id: 'cradle', name: 'Cradle' }],
      links: [],
    })
  })

  test('a fixture set of files produces the full node list', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', []),
      moveFile('spin.md', 'Spin', []),
      moveFile('around-the-world.md', 'Around the World', ['cradle']),
    ])

    expect(result.nodes).toEqual([
      { id: 'cradle', name: 'Cradle' },
      { id: 'spin', name: 'Spin' },
      { id: 'around-the-world', name: 'Around the World' },
    ])
  })

  test("links are derived from each move's transitions_out", () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', []),
      moveFile('spin.md', 'Spin', []),
      moveFile('hammer-lock.md', 'Hammer Lock', ['spin', 'cradle']),
    ])

    expect(result.links).toEqual([
      { source: 'hammer-lock', target: 'spin' },
      { source: 'hammer-lock', target: 'cradle' },
    ])
  })

  test('throws when a transitions_out target does not resolve to an existing slug', () => {
    const files = [
      moveFile('cradle.md', 'Cradle', []),
      moveFile('hammer-lock.md', 'Hammer Lock', ['spinn']),
    ]

    expect(() => compileGraph(files)).toThrow(/hammer-lock.*spinn/)
  })

  test('throws when two files resolve to the same slug', () => {
    const files = [
      moveFile('Cradle.md', 'Cradle', []),
      moveFile('cradle.md', 'Cradle Variant', []),
    ]

    expect(() => compileGraph(files)).toThrow(/cradle/)
  })

  test('only reads name/transitions_out from the frontmatter block, not the body', () => {
    const files = [
      {
        filename: 'cradle.md',
        content:
          '---\nname: Cradle\ntransitions_out: []\n---\n\n## Notes/variations\n\ntransitions_out: [not-a-real-target]\nname: Not The Real Name\n',
      },
    ]

    const result = compileGraph(files)

    expect(result).toEqual({
      nodes: [{ id: 'cradle', name: 'Cradle' }],
      links: [],
    })
  })
})
