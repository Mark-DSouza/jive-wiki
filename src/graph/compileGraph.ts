export interface MoveFile {
  filename: string
  content: string
}

export const CLUSTER_IDS = [
  'cha-cha-cha',
  'turns-spins',
  'circle-cradle',
  'holds-lifts',
] as const

export type ClusterId = (typeof CLUSTER_IDS)[number]

export interface MoveTemplate {
  description: string
  steps: string
  holdHandPosition: string
  lead: string
  notes: string
}

export interface GraphNode {
  id: string
  name: string
  cluster: ClusterId
  degree: number
  template: MoveTemplate
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function findNode(
  graphData: GraphData,
  id: string,
): GraphNode | undefined {
  return graphData.nodes.find((node) => node.id === id)
}

/**
 * Once a GraphNode is handed to 3d-force-graph, the force simulation
 * mutates it in place, adding a live x/y/z position (and velocity/fixed
 * fields we don't use). This type names that runtime-augmented shape.
 */
export type PositionedGraphNode = GraphNode & {
  x?: number
  y?: number
  z?: number
}

function matchFrontmatterField(
  filename: string,
  content: string,
  fieldName: string,
  pattern: RegExp,
): string {
  const match = pattern.exec(content)
  if (!match) {
    throw new Error(
      `Move file "${filename}" is missing a "${fieldName}" field.`,
    )
  }
  return match[1]
}

function parseName(filename: string, content: string): string {
  return matchFrontmatterField(
    filename,
    content,
    'name',
    /^name:\s*(.+)$/m,
  ).trim()
}

function parseCluster(filename: string, content: string): ClusterId {
  const raw = matchFrontmatterField(
    filename,
    content,
    'cluster',
    /^cluster:\s*(.+)$/m,
  ).trim()
  if (!(CLUSTER_IDS as readonly string[]).includes(raw)) {
    throw new Error(
      `Move file "${filename}" has an invalid "cluster" value "${raw}"; expected one of ${CLUSTER_IDS.join(', ')}.`,
    )
  }
  return raw as ClusterId
}

function parseTransitionsOut(filename: string, content: string): string[] {
  const inner = matchFrontmatterField(
    filename,
    content,
    'transitions_out',
    /^transitions_out:\s*\[(.*)\]$/m,
  ).trim()
  if (inner === '') return []
  return inner.split(',').map((entry) => entry.trim())
}

const TEMPLATE_SECTION_HEADERS: {
  field: keyof MoveTemplate
  header: string
}[] = [
  { field: 'description', header: 'Description' },
  { field: 'steps', header: 'Steps' },
  { field: 'holdHandPosition', header: 'Hold/hand position' },
  { field: 'lead', header: 'Lead' },
  { field: 'notes', header: 'Notes/variations' },
]

function parseBody(content: string): string {
  const match = /^---\n[\s\S]*?\n---\n([\s\S]*)$/.exec(content)
  return match ? match[1] : content
}

function parseSection(body: string, header: string): string {
  // No 'm' flag: `$` must mean end-of-string here, not end-of-line (which
  // would wrongly match the blank line right after an empty section header).
  const pattern = new RegExp(
    `(?:^|\\n)## ${header}[ \\t]*\\n([\\s\\S]*?)(?=\\n## |$)`,
  )
  const match = pattern.exec(body)
  return match ? match[1].trim() : ''
}

function parseTemplate(content: string): MoveTemplate {
  const body = parseBody(content)
  const template = {} as MoveTemplate
  for (const { field, header } of TEMPLATE_SECTION_HEADERS) {
    template[field] = parseSection(body, header)
  }
  return template
}

function slugify(filename: string): string {
  return filename.replace(/\.md$/, '').toLowerCase()
}

function checkForDuplicateSlugs(files: MoveFile[]): void {
  const seen = new Set<string>()
  for (const file of files) {
    const slug = slugify(file.filename)
    if (seen.has(slug)) {
      throw new Error(`Multiple move files resolve to the same slug "${slug}".`)
    }
    seen.add(slug)
  }
}

export function compileGraph(files: MoveFile[]): GraphData {
  checkForDuplicateSlugs(files)

  const nodes = files.map((file) => ({
    id: slugify(file.filename),
    name: parseName(file.filename, file.content),
    cluster: parseCluster(file.filename, file.content),
    degree: 0,
    template: parseTemplate(file.content),
  }))

  const slugs = new Set(nodes.map((node) => node.id))

  const links = files.flatMap((file) => {
    const source = slugify(file.filename)
    return parseTransitionsOut(file.filename, file.content).map((target) => {
      if (!slugs.has(target)) {
        throw new Error(
          `Move "${source}" has a transitions_out target "${target}" that does not match any move slug.`,
        )
      }
      return { source, target }
    })
  })

  const degreeById = new Map<string, number>()
  for (const link of links) {
    degreeById.set(link.source, (degreeById.get(link.source) ?? 0) + 1)
    degreeById.set(link.target, (degreeById.get(link.target) ?? 0) + 1)
  }
  for (const node of nodes) {
    node.degree = degreeById.get(node.id) ?? 0
  }

  return { nodes, links }
}
