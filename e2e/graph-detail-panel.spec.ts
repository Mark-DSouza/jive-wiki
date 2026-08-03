import { test, expect, type Page } from '@playwright/test'
import type { PositionedGraphNode } from '../src/graph/compileGraph.ts'
import { obsidianVoid } from '../src/graph/theme.ts'

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

async function waitForLayoutStable(page: Page): Promise<void> {
  // Relies on the force simulation's own onEngineStop signal (surfaced via
  // window.__jiveGraphControls, wired up before the first tick) rather than
  // polling node positions for equality between two arbitrary instants,
  // which can spuriously read "stable" mid-simulation and click a node
  // whose projected screen position keeps drifting underneath the click.
  await page.waitForFunction(() => window.__jiveGraphControls?.isLayoutStable())
}

async function pauseAutoOrbit(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (!window.__jiveGraphControls) {
      throw new Error('window.__jiveGraphControls was not set')
    }
    window.__jiveGraphControls.setAutoOrbitEnabled(false)
  })
}

// three-render-objects resolves which object (if any) a click landed on from
// a hover target that's only refreshed by raycasting once per render frame
// after a pointermove, and it re-checks that hover target one more frame
// after pointerup. A single atomic move+press can beat the render loop to
// it and read a stale hover target — misfiring a node click as a background
// click, or vice versa — so give the pointermove a real frame to land
// before pressing.
async function realClick(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y)
  await page.waitForTimeout(50)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      }),
  )
  await page.mouse.down()
  await page.mouse.up()
}

// Picks a viewport corner (in graph-canvas-container coordinates) whose
// projected distance from every node clears a safety margin, so the
// background-click test can't accidentally land on a node whose
// force-directed layout happened to settle near a corner this run.
async function pickBackgroundPoint(
  page: Page,
): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('graph-canvas-container').boundingBox()
  if (!box) throw new Error('graph canvas container has no bounding box')

  const margin = 100
  const corners = [
    { x: margin, y: margin },
    { x: box.width - margin, y: margin },
    { x: margin, y: box.height - margin },
    { x: box.width - margin, y: box.height - margin },
  ]

  const nodeScreenPoints = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    return graph.graphData().nodes.map((node) => {
      const position: PositionedGraphNode = node
      return graph.graph2ScreenCoords(
        position.x ?? 0,
        position.y ?? 0,
        position.z ?? 0,
      )
    })
  })

  const minDistanceToAnyNode = (point: { x: number; y: number }) =>
    Math.min(
      ...nodeScreenPoints.map((node) =>
        Math.hypot(node.x - point.x, node.y - point.y),
      ),
    )

  const clearCorner = corners.find(
    (corner) => minDistanceToAnyNode(corner) >= margin,
  )
  const chosen =
    clearCorner ??
    corners.reduce((best, corner) =>
      minDistanceToAnyNode(corner) > minDistanceToAnyNode(best) ? corner : best,
    )

  return { x: box.x + chosen.x, y: box.y + chosen.y }
}

async function clickNode(page: Page, nodeId: string): Promise<void> {
  const box = await page.getByTestId('graph-canvas-container').boundingBox()
  if (!box) throw new Error('graph canvas container has no bounding box')

  const screenPoint = await page.evaluate((id) => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    const position: PositionedGraphNode | undefined = graph
      .graphData()
      .nodes.find((candidate) => candidate.id === id)
    if (
      position?.x === undefined ||
      position.y === undefined ||
      position.z === undefined
    ) {
      throw new Error(`Node "${id}" has no resolved live position.`)
    }
    return graph.graph2ScreenCoords(position.x, position.y, position.z)
  }, nodeId)

  await realClick(page, box.x + screenPoint.x, box.y + screenPoint.y)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await waitForGraphReady(page)
  await waitForLayoutStable(page)
  await pauseAutoOrbit(page)
})

test('clicking a node opens the panel with the correct move name, cluster, and fields', async ({
  page,
}) => {
  await clickNode(page, 'hammer-lock')

  const panel = page.getByTestId('detail-panel')
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(page.getByTestId('detail-panel-name')).toHaveText('Hammer Lock')
  await expect(page.getByTestId('detail-panel-cluster')).toHaveText(
    'Holds & Lifts',
  )

  await expect(page.getByTestId('panel-section-description')).toContainText(
    'Not yet documented.',
  )
  await expect(page.getByTestId('panel-section-steps')).toContainText(
    'Not yet documented.',
  )
  await expect(
    page.getByTestId('panel-section-hold-hand-position'),
  ).toContainText('Not yet documented.')
  await expect(page.getByTestId('panel-section-lead')).toContainText(
    'Raise left hand.',
  )
  await expect(
    page.getByTestId('panel-section-notes-variations'),
  ).toContainText('Not yet documented.')

  await expect(page.getByTestId('transition-chip-spin')).toContainText('Spin')
  await expect(
    page.getByTestId('transition-chip-around-the-world'),
  ).toContainText('Around the World')
})

test('panel closes via the × button', async ({ page }) => {
  await clickNode(page, 'cradle')
  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'false',
  )

  await page.getByTestId('detail-panel-close').click()

  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'true',
  )
})

test('panel closes via Escape', async ({ page }) => {
  await clickNode(page, 'cradle')
  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'false',
  )

  await page.keyboard.press('Escape')

  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'true',
  )
})

test('panel closes via clicking empty graph background', async ({ page }) => {
  await clickNode(page, 'cradle')
  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'false',
  )

  const backgroundPoint = await pickBackgroundPoint(page)
  await realClick(page, backgroundPoint.x, backgroundPoint.y)

  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'true',
  )
})

test('clicking a Transitions-out chip chains directly to the target move without closing the panel', async ({
  page,
}) => {
  await clickNode(page, 'hammer-lock')
  await expect(page.getByTestId('detail-panel-name')).toHaveText('Hammer Lock')
  await page.waitForTimeout(1000) // let the fly-to-hammer-lock camera ease finish
  const cameraAtHammerLock = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    return graph.cameraPosition()
  })

  await page.getByTestId('transition-chip-spin').click()

  // The panel must stay open (never toggle aria-hidden) through the chain —
  // proof the graph wasn't "returned to first" before landing on the target.
  await expect(page.getByTestId('detail-panel')).toHaveAttribute(
    'aria-hidden',
    'false',
  )
  await expect(page.getByTestId('detail-panel-name')).toHaveText('Spin')
  await expect(page.getByTestId('detail-panel-cluster')).toHaveText(
    'Turns & Spins',
  )
  await expect(page.getByTestId('panel-section-description')).toContainText(
    'A double turn.',
  )

  // And the camera actually flew to spin's own node, not back to some
  // default/reset framing — distance from camera to spin's live position
  // should land near the app's configured fly-to distance.
  await page.waitForTimeout(1000) // let the fly-to-spin camera ease finish
  const result = await page.evaluate(() => {
    const graph = window.__jiveGraph
    if (!graph) throw new Error('window.__jiveGraph was not set')
    const spin: PositionedGraphNode | undefined = graph
      .graphData()
      .nodes.find((node) => node.id === 'spin')
    const camera = graph.cameraPosition()
    if (spin?.x === undefined || spin.y === undefined || spin.z === undefined) {
      throw new Error('spin node has no resolved live position')
    }
    const distanceToSpin = Math.hypot(
      camera.x - spin.x,
      camera.y - spin.y,
      camera.z - spin.z,
    )
    return { camera, distanceToSpin }
  })

  expect(result.distanceToSpin).toBeGreaterThan(obsidianVoid.flyToDistance - 20)
  expect(result.distanceToSpin).toBeLessThan(obsidianVoid.flyToDistance + 20)
  expect(result.camera).not.toEqual(cameraAtHammerLock)
})
