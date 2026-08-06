import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import * as THREE from 'three'
import {
  CLUSTER_IDS,
  findNode,
  type GraphLink,
  type GraphNode,
  type PositionedGraphNode,
} from './compileGraph.ts'
import DetailPanel from './DetailPanel.tsx'
import { loadGraphData } from './loadMoves.ts'
import {
  VARIANTS,
  type Variant,
} from './prototype-mobile-detail-panel/content.ts'
import PrototypeSwitcher from './prototype-mobile-detail-panel/PrototypeSwitcher.tsx'
import VariantA from './prototype-mobile-detail-panel/VariantA.tsx'
import VariantB from './prototype-mobile-detail-panel/VariantB.tsx'
import VariantC from './prototype-mobile-detail-panel/VariantC.tsx'
import { CLUSTER_LABELS, obsidianVoid } from './theme.ts'

// PROTOTYPE wiring for wayfinder ticket #21 (phone-portrait detail panel).
// Dev-only: reads/writes `?variant=` and renders the switcher. Never active
// in a production build. Delete this block, the three Variant* imports, and
// the `prototype-mobile-detail-panel/` folder once the ticket is resolved.
function readVariantFromUrl(): Variant {
  if (!import.meta.env.DEV) return 'default'
  const raw = new URLSearchParams(window.location.search).get('variant')
  return (VARIANTS as readonly string[]).includes(raw ?? '')
    ? (raw as Variant)
    : 'default'
}

// `controls()` is typed `object` upstream; this is the subset of
// TrackballControls' API we tune for touch.
interface TrackballControlsLike {
  panSpeed: number
  zoomSpeed: number
}

function flyToNode(
  graph: ForceGraph3DInstance<GraphNode, GraphLink>,
  node: PositionedGraphNode,
): void {
  const { x = 0, y = 0, z = 0 } = node
  const distRatio =
    1 + obsidianVoid.flyToDistance / Math.hypot(x || 1, y || 1, z || 1)
  graph.cameraPosition(
    { x: x * distRatio, y: y * distRatio, z: z * distRatio },
    { x, y, z },
    obsidianVoid.flyToEaseMs,
  )
}

function addStarfield(scene: THREE.Scene, count: number): void {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const radius = 400 + Math.random() * 600
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
  })
  scene.add(new THREE.Points(geometry, material))
}

function makeNodeObject(node: GraphNode): THREE.Object3D {
  const color = obsidianVoid.clusterColors[node.cluster]
  const size =
    obsidianVoid.nodeBaseSize + node.degree * obsidianVoid.nodeSizePerDegree
  const geometry = new THREE.SphereGeometry(size, 16, 16)
  const material = new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.95,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.nodeId = node.id
  return mesh
}

function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraph3DInstance<GraphNode, GraphLink> | null>(
    null,
  )
  const graphData = useMemo(() => loadGraphData(), [])
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [displayedNodeId, setDisplayedNodeId] = useState<string | null>(null)
  const isPanelOpen = openNodeId !== null
  const [prototypeVariant, setPrototypeVariant] =
    useState<Variant>(readVariantFromUrl)

  function handlePrototypeVariantChange(variant: Variant): void {
    setPrototypeVariant(variant)
    const url = new URL(window.location.href)
    if (variant === 'default') {
      url.searchParams.delete('variant')
    } else {
      url.searchParams.set('variant', variant)
    }
    window.history.replaceState(null, '', url)
  }
  // Keep showing the last-open move's content while the panel slides out,
  // rather than clearing it (which would flash an empty panel mid-animation).
  if (openNodeId !== null && openNodeId !== displayedNodeId) {
    setDisplayedNodeId(openNodeId)
  }

  // useLayoutEffect, not useEffect: this must attach in the same commit as
  // the DOM update that opens the panel. useEffect is scheduled after paint
  // and can be starved by the continuous WebGL render loop's rAF callbacks,
  // leaving a window where a fast Escape press lands before the listener
  // exists.
  useLayoutEffect(() => {
    if (!isPanelOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenNodeId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPanelOpen])

  function handleSelectMove(id: string): void {
    const graph = graphRef.current
    const node = findNode(graphData, id)
    if (graph && node) flyToNode(graph, node)
    setOpenNodeId(id)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const graph = new ForceGraph3D(
      container,
    ) as unknown as ForceGraph3DInstance<GraphNode, GraphLink>

    const initialCamera = graph.cameraPosition()
    let orbitAngle = Math.atan2(initialCamera.x, initialCamera.z) || 0
    let autoOrbitEnabled = true

    // Damp pan/zoom for touch (defaults are 0.3/1.2) rather than disabling
    // pan outright — a two-finger drag should still be able to shift the
    // view on purpose, just without overshooting on a small screen.
    const controls = graph.controls() as unknown as TrackballControlsLike
    controls.panSpeed = 0.15
    controls.zoomSpeed = 1.0

    // Auto-orbit unconditionally repositions the camera every tick, fighting
    // the user's own touch/mouse drag. Pause it for the duration of any
    // actual drag and resume the moment it ends. Deliberately doesn't use
    // TrackballControls' own 'start'/'end' events — those fire on every
    // pointerdown/up including a plain tap-to-select-a-node, which would
    // re-enable auto-orbit a frame before that same tap's fly-to animation
    // starts, fighting it. Tracking real pointer movement past a small
    // threshold ensures a tap is never mistaken for a drag.
    const dragThresholdPx = 4
    let dragOrigin: { x: number; y: number } | null = null
    let isDragging = false
    const handlePointerDown = (event: PointerEvent) => {
      dragOrigin = { x: event.clientX, y: event.clientY }
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragOrigin || isDragging) return
      const moved = Math.hypot(
        event.clientX - dragOrigin.x,
        event.clientY - dragOrigin.y,
      )
      if (moved > dragThresholdPx) {
        isDragging = true
        autoOrbitEnabled = false
      }
    }
    const handlePointerUp = () => {
      dragOrigin = null
      if (isDragging) {
        isDragging = false
        autoOrbitEnabled = true
      }
    }
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerUp)

    graph
      // three-forcegraph mutates each link in place, replacing its
      // string source/target with the resolved node object. Hand it
      // link copies so that mutation doesn't corrupt the pristine
      // `graphData.links` that DetailPanel reads by string id; the
      // nodes array is intentionally shared, since DetailPanel and the
      // engine are both meant to see nodes' live x/y/z positions.
      .graphData({
        nodes: graphData.nodes,
        links: graphData.links.map((link) => ({ ...link })),
      })
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor(obsidianVoid.bg)
      .nodeThreeObject(makeNodeObject)
      .nodeThreeObjectExtend(false)
      .nodeLabel((node) => node.name)
      .linkColor(() => obsidianVoid.linkColor)
      .linkWidth(obsidianVoid.linkWidth)
      .linkDirectionalArrowLength(obsidianVoid.arrowLength)
      .linkDirectionalArrowRelPos(1)
      .onNodeClick((node) => {
        flyToNode(graph, node)
        setOpenNodeId(node.id)
      })
      .onBackgroundClick(() => {
        setOpenNodeId(null)
      })

    addStarfield(graph.scene(), obsidianVoid.starCount)

    graph.onEngineTick(() => {
      if (!autoOrbitEnabled) return
      orbitAngle += obsidianVoid.autoOrbitSpeed * 0.01
      const camPos = graph.cameraPosition()
      const radius = Math.hypot(camPos.x, camPos.z) || 260
      graph.cameraPosition({
        x: radius * Math.sin(orbitAngle),
        y: camPos.y,
        z: radius * Math.cos(orbitAngle),
      })
    })

    let isLayoutStable = false
    graph.onEngineStop(() => {
      isLayoutStable = true
    })

    graphRef.current = graph
    window.__jiveGraph = graph
    window.__jiveGraphControls = {
      setAutoOrbitEnabled: (enabled) => {
        autoOrbitEnabled = enabled
      },
      isLayoutStable: () => isLayoutStable,
    }

    const handleResize = () => {
      graph.width(container.clientWidth).height(container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', handlePointerUp)
      delete window.__jiveGraph
      delete window.__jiveGraphControls
      graphRef.current = null
      // `_destructor` is 3d-force-graph's own documented teardown method
      // (frees the WebGL context/renderer) despite the underscore prefix.
      graph._destructor()
    }
  }, [graphData])

  return (
    <div style={wrapperStyle}>
      <div
        ref={containerRef}
        data-testid="graph-canvas-container"
        style={{
          ...canvasContainerStyle,
          filter: isPanelOpen ? obsidianVoid.dimmedFilter : 'none',
        }}
      />
      {prototypeVariant === 'default' && (
        <DetailPanel
          graphData={graphData}
          isOpen={isPanelOpen}
          moveId={displayedNodeId}
          onClose={() => {
            setOpenNodeId(null)
          }}
          onSelectMove={handleSelectMove}
        />
      )}
      {prototypeVariant === 'A' && (
        <VariantA
          graphData={graphData}
          isOpen={isPanelOpen}
          moveId={displayedNodeId}
          onClose={() => {
            setOpenNodeId(null)
          }}
          onSelectMove={handleSelectMove}
        />
      )}
      {prototypeVariant === 'B' && (
        <VariantB
          graphData={graphData}
          isOpen={isPanelOpen}
          moveId={displayedNodeId}
          onClose={() => {
            setOpenNodeId(null)
          }}
          onSelectMove={handleSelectMove}
        />
      )}
      {prototypeVariant === 'C' && (
        <VariantC
          graphData={graphData}
          isOpen={isPanelOpen}
          moveId={displayedNodeId}
          onClose={() => {
            setOpenNodeId(null)
          }}
          onSelectMove={handleSelectMove}
        />
      )}
      {import.meta.env.DEV && (
        <PrototypeSwitcher
          current={prototypeVariant}
          onChange={handlePrototypeVariantChange}
        />
      )}
      <div data-testid="graph-legend" style={legendStyle}>
        {CLUSTER_IDS.map((clusterId) => (
          <div
            key={clusterId}
            data-testid={`legend-row-${clusterId}`}
            style={legendRowStyle}
          >
            <span
              data-testid={`legend-swatch-${clusterId}`}
              style={{
                ...swatchStyle,
                background: obsidianVoid.clusterColors[clusterId],
              }}
            />
            <span>{CLUSTER_LABELS[clusterId]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const wrapperStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  fontFamily: obsidianVoid.fontFamily,
}

const canvasContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  transition: 'filter 0.4s ease',
}

const legendStyle: CSSProperties = {
  position: 'absolute',
  bottom: '1em',
  left: '1em',
  padding: '0.6em 0.9em',
  borderRadius: '0.5em',
  background: 'rgba(5, 6, 10, 0.55)',
  color: '#f4f4f5',
  fontSize: '0.85em',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4em',
  pointerEvents: 'none',
}

const legendRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5em',
}

const swatchStyle: CSSProperties = {
  display: 'inline-block',
  width: '0.7em',
  height: '0.7em',
  borderRadius: '50%',
}

export default GraphView
