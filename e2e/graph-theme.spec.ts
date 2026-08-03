import { test, expect, type Page } from '@playwright/test'
import { CLUSTER_IDS } from '../src/graph/compileGraph.ts'
import { CLUSTER_LABELS, obsidianVoid } from '../src/graph/theme.ts'

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16).toString()
  const g = parseInt(clean.slice(2, 4), 16).toString()
  const b = parseInt(clean.slice(4, 6), 16).toString()
  return `rgb(${r}, ${g}, ${b})`
}

async function waitForGraphReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const graph = window.__jiveGraph
    if (!graph) return false
    let meshCount = 0
    graph.scene().traverse((object) => {
      if ('nodeId' in object.userData) meshCount++
    })
    return meshCount === graph.graphData().nodes.length
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await waitForGraphReady(page)
})

test('graph loads with the correct node/link count and the Obsidian Void background/starfield', async ({
  page,
}) => {
  const state = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    const data = graph.graphData()
    let starPointCount = 0
    graph.scene().traverse((object) => {
      if (object.type === 'Points') {
        const points = object as unknown as {
          geometry: { attributes: { position: { count: number } } }
        }
        starPointCount = points.geometry.attributes.position.count
      }
    })
    return {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      background: graph.backgroundColor(),
      starPointCount,
    }
  })

  expect(state.nodeCount).toBe(11)
  expect(state.linkCount).toBe(6)
  expect(state.background).toBe(obsidianVoid.bg)
  expect(state.starPointCount).toBe(obsidianVoid.starCount)
})

test('node size reflects transition degree', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    const radiusByNodeId = new Map<string, number>()
    graph.scene().traverse((object) => {
      const nodeId = object.userData.nodeId as string | undefined
      const mesh = object as unknown as {
        geometry?: { parameters?: { radius?: number } }
      }
      if (nodeId && mesh.geometry?.parameters?.radius !== undefined) {
        radiusByNodeId.set(nodeId, mesh.geometry.parameters.radius)
      }
    })
    return graph.graphData().nodes.map((node) => ({
      id: node.id,
      degree: node.degree,
      radius: radiusByNodeId.get(node.id),
    }))
  })

  expect(sizes.length).toBe(11)
  for (const { degree, radius } of sizes) {
    expect(radius).toBe(
      obsidianVoid.nodeBaseSize + degree * obsidianVoid.nodeSizePerDegree,
    )
  }

  const degrees = new Set(sizes.map((s) => s.degree))
  expect(degrees.size).toBeGreaterThan(1)
})

test("node color matches its cluster's locked palette color", async ({
  page,
}) => {
  const colors = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    const colorByNodeId = new Map<string, string>()
    graph.scene().traverse((object) => {
      const nodeId = object.userData.nodeId as string | undefined
      const mesh = object as unknown as {
        material?: { color?: { getHexString: () => string } }
      }
      if (nodeId && mesh.material?.color) {
        colorByNodeId.set(nodeId, `#${mesh.material.color.getHexString()}`)
      }
    })
    return graph.graphData().nodes.map((node) => ({
      id: node.id,
      cluster: node.cluster,
      color: colorByNodeId.get(node.id),
    }))
  })

  expect(colors.length).toBe(11)
  for (const { cluster, color } of colors) {
    expect(color).toBe(obsidianVoid.clusterColors[cluster])
  }
})

test('links render with correct source/target direction and visible arrowheads', async ({
  page,
}) => {
  const state = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    return {
      arrowLength: graph.linkDirectionalArrowLength(),
      arrowRelPos: graph.linkDirectionalArrowRelPos(),
      links: graph.graphData().links.map((link) => {
        const source = link.source as unknown as { id: string } | string
        const target = link.target as unknown as { id: string } | string
        return {
          source: typeof source === 'string' ? source : source.id,
          target: typeof target === 'string' ? target : target.id,
        }
      }),
    }
  })

  expect(state.arrowLength).toBe(obsidianVoid.arrowLength)
  expect(state.arrowLength).toBeGreaterThan(0)
  expect(state.arrowRelPos).toBe(1)

  expect(state.links).toContainEqual({
    source: 'hammer-lock',
    target: 'spin',
  })
  expect(state.links).toContainEqual({
    source: 'over-the-shoulder',
    target: 'windmill',
  })
  expect(state.links).not.toContainEqual({
    source: 'spin',
    target: 'hammer-lock',
  })
})

test('the legend renders all four cluster labels with matching swatch colors', async ({
  page,
}) => {
  const legend = page.getByTestId('graph-legend')
  await expect(legend).toBeVisible()

  for (const clusterId of CLUSTER_IDS) {
    const row = page.getByTestId(`legend-row-${clusterId}`)
    await expect(row).toContainText(CLUSTER_LABELS[clusterId])

    const swatch = page.getByTestId(`legend-swatch-${clusterId}`)
    await expect(swatch).toHaveCSS(
      'background-color',
      hexToRgb(obsidianVoid.clusterColors[clusterId]),
    )
  }
})
