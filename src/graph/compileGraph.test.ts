import { describe, expect, test } from 'vitest'
import {
  compileGraph,
  type ClusterId,
  type MoveTemplate,
} from './compileGraph.ts'

const BLANK_TEMPLATE: MoveTemplate = {
  description: '',
  steps: '',
  holdHandPosition: '',
  lead: '',
  notes: '',
}

function moveFile(
  filename: string,
  name: string,
  transitionsOut: string[],
  cluster: ClusterId = 'circle-cradle',
  body = '',
) {
  return {
    filename,
    content: `---\nname: ${name}\ntransitions_out: [${transitionsOut.join(', ')}]\ncluster: ${cluster}\n---\n${body}`,
  }
}

describe('compileGraph', () => {
  test('a single move with no transitions produces one node and no links', () => {
    const result = compileGraph([
      moveFile('cradle.md', 'Cradle', [], 'circle-cradle'),
    ])

    expect(result).toEqual({
      nodes: [
        {
          id: 'cradle',
          name: 'Cradle',
          cluster: 'circle-cradle',
          degree: 0,
          template: BLANK_TEMPLATE,
        },
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
      {
        id: 'cradle',
        name: 'Cradle',
        cluster: 'circle-cradle',
        degree: 1,
        template: BLANK_TEMPLATE,
      },
      {
        id: 'spin',
        name: 'Spin',
        cluster: 'turns-spins',
        degree: 0,
        template: BLANK_TEMPLATE,
      },
      {
        id: 'around-the-world',
        name: 'Around the World',
        cluster: 'circle-cradle',
        degree: 1,
        template: BLANK_TEMPLATE,
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
        {
          id: 'cradle',
          name: 'Cradle',
          cluster: 'circle-cradle',
          degree: 0,
          template: {
            ...BLANK_TEMPLATE,
            notes:
              'transitions_out: [not-a-real-target]\nname: Not The Real Name\ncluster: holds-lifts',
          },
        },
      ],
      links: [],
    })
  })

  describe('template field parsing', () => {
    test('parses each body section into its own template field', () => {
      const files = [
        moveFile(
          'closed-cha-cha-cha.md',
          'Closed Cha Cha Cha',
          [],
          'cha-cha-cha',
          [
            '\n',
            '## Description\n\nA cha cha cha figure done in closed hold.\n\n',
            '## Steps\n\n',
            '## Hold/hand position\n\nClosed hold.\n\n',
            '## Lead\n\n- Extend your left arm.\n- Push and turn her.\n\n',
            '## Notes/variations\n\nAlso performable in open hold.\n',
          ].join(''),
        ),
      ]

      const result = compileGraph(files)

      expect(result.nodes[0]?.template).toEqual({
        description: 'A cha cha cha figure done in closed hold.',
        steps: '',
        holdHandPosition: 'Closed hold.',
        lead: '- Extend your left arm.\n- Push and turn her.',
        notes: 'Also performable in open hold.',
      })
    })

    test('a move file with no body sections parses to an all-blank template', () => {
      const files = [moveFile('turn.md', 'Turn', [], 'turns-spins')]

      const result = compileGraph(files)

      expect(result.nodes[0]?.template).toEqual(BLANK_TEMPLATE)
    })

    test('sections present but empty parse to an empty string, not undefined', () => {
      const files = [
        moveFile(
          'windmill.md',
          'Windmill',
          [],
          'holds-lifts',
          '\n## Description\n\n## Steps\n\n## Hold/hand position\n\n## Lead\n\n## Notes/variations\n',
        ),
      ]

      const result = compileGraph(files)

      expect(result.nodes[0]?.template).toEqual(BLANK_TEMPLATE)
    })

    test('parses a plain-text (non-bulleted) Lead section verbatim', () => {
      const files = [
        moveFile(
          'flick.md',
          'Flick',
          [],
          'holds-lifts',
          '\n## Description\n\n## Steps\n\n## Hold/hand position\n\n## Lead\n\nFlick the hand in front.\n\n## Notes/variations\n',
        ),
      ]

      const result = compileGraph(files)

      expect(result.nodes[0]?.template.lead).toBe('Flick the hand in front.')
    })
  })
})
