export interface MoveFile {
  filename: string
  content: string
}

export interface GraphNode {
  id: string
  name: string
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

  return { nodes, links }
}
