import { describe, expect, test } from 'vitest'
import { compileGraph, type ClusterId } from './compileGraph.ts'

function moveFile(
  filename: string,
  name: string,
  transitionsOut: string[],
  cluster: ClusterId = 'circle-cradle',
) {
  return {
    filename,
    content: `---\nname: ${name}\ntransitions_out: [${transitionsOut.join(', ')}]\ncluster: ${cluster}\n---\n`,
  }
}

describe('compileGraph', () => {
  test('a single move with no transitions produces one node and no links', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
    ])

    expect(result).toEqual({
      nodes: [
        { id: 'cradle', name: 'Cradle', cluster: 'circle-cradle', degree: 0 },
      ],
      links: [],
    })
  })

  test('a fixture set of files produces the full node list', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('spin.md', 'Spin', [], 'turns-spins'),
      moveFile(
        'around-the-world.md',
        'Around the World',
        ['cradle'],
        'circle-cradle',
      ),
    ])

    expect(result.nodes).toEqual([
      { id: 'cradle', name: 'Cradle', cluster: 'circle-cradle', degree: 1 },
      { id: 'spin', name: 'Spin', cluster: 'turns-spins', degree: 0 },
      {
        id: 'around-the-world',
        name: 'Around the World',
        cluster: 'circle-cradle',
        degree: 1,
      },
    ])
  })

  test("links are derived from each move's transitions_out", () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('spin.md', 'Spin', [], 'turns-spins'),
      moveFile(
        'hammer-lock.md',
        'Hammer Lock',
        ['spin', 'cradle'],
        'holds-lifts',
      ),
    ])

    expect(result.links).toEqual([
      { source: 'hammer-lock', target: 'spin' },
      { source: 'hammer-lock', target: 'cradle' },
    ])
  })

  test('degree counts both incoming and outgoing edges touching each node', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('spin.md', 'Spin', [], 'turns-spins'),
      moveFile(
        'around-the-world.md',
        'Around the World',
        ['cradle'],
        'circle-cradle',
      ),
      moveFile(
        'hammer-lock.md',
        'Hammer Lock',
        ['spin', 'around-the-world'],
        'holds-lifts',
      ),
    ])

    const degreeById = Object.fromEntries(
      result.nodes.map((node) => [node.id, node.degree]),
    )

    expect(degreeById).toEqual({
      cradle: 1,
      spin: 1,
      'around-the-world': 2,
      'hammer-lock': 2,
    })
  })

  test('a node with no transitions in or out has degree 0', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('turn.md', 'Turn', [], 'turns-spins'),
    ])

    expect(result.nodes.find((node) => node.id === 'turn')?.degree).toBe(0)
  })

  test('cluster is read from frontmatter per node', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('windmill.md', 'Windmill', [], 'holds-lifts'),
      moveFile(
        'closed-cha-cha-cha.md',
        'Closed Cha Cha Cha',
        [],
        'cha-cha-cha',
      ),
      moveFile('spin.md', 'Spin', [], 'turns-spins'),
    ])

    const clusterById = Object.fromEntries(
      result.nodes.map((node) => [node.id, node.cluster]),
    )

    expect(clusterById).toEqual({
      cradle: 'circle-cradle',
      windmill: 'holds-lifts',
      'closed-cha-cha-cha': 'cha-cha-cha',
      spin: 'turns-spins',
    })
  })

  test('throws when a move file is missing the cluster field', () => {
    const files = [
      {
        filename: 'cradle.md',
        content: '---\nname: Cradle\ntransitions_out: []\n---\n',
      },
    ]

    expect(() => compileGraph(files)).toThrow(/cradle\.md.*cluster/)
  })

  test('throws when a move file has an invalid cluster value', () => {
    const files = [
      {
        filename: 'cradle.md',
        content:
          '---\nname: Cradle\ntransitions_out: []\ncluster: not-a-real-cluster\n---\n',
      },
    ]

    expect(() => compileGraph(files)).toThrow(/not-a-real-cluster/)
  })

  test('throws when a transitions_out target does not resolve to an existing slug', () => {
    const files = [
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('hammer-lock.md', 'Hammer Lock', ['spinn'], 'holds-lifts'),
    ]

    expect(() => compileGraph(files)).toThrow(/hammer-lock.*spinn/)
  })

  test('throws when two files resolve to the same slug', () => {
    const files = [
      moveFile('Cradle.md', 'Cradle', [], 'circle-cradle'),
      moveFile('cradle.md', 'Cradle Variant', [], 'circle-cradle'),
    ]

    expect(() => compileGraph(files)).toThrow(/cradle/)
  })

  test('only reads name/transitions_out/cluster from the frontmatter block, not the body', () => {
    const files = [
      {
        filename: 'cradle.md',
        content:
          '---\nname: Cradle\ntransitions_out: []\ncluster: circle-cradle\n---\n\n## Notes/variations\n\ntransitions_out: [not-a-real-target]\nname: Not The Real Name\ncluster: holds-lifts\n',
      },
    ]

    const result = compileGraph(files)

    expect(result).toEqual({
      nodes: [
        { id: 'cradle', name: 'Cradle', cluster: 'circle-cradle', degree: 0 },
      ],
      links: [],
    })
  })
})
