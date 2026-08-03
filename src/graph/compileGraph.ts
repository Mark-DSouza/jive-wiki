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

export interface GraphNode {
  id: string
  name: string
  cluster: ClusterId
  degree: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
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
