import { compileGraph, type GraphData } from './compileGraph.ts'

const moveFileContents = import.meta.glob('/content/moves/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function filenameFromPath(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function loadGraphData(): GraphData {
  const files = Object.entries(moveFileContents).map(([path, content]) => ({
    filename: filenameFromPath(path),
    content,
  }))

  return compileGraph(files)
}
