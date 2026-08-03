import { useEffect, useMemo, useRef } from 'react'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import { loadGraphData } from './loadMoves.ts'

function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphData = useMemo(() => loadGraphData(), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const graph: ForceGraph3DInstance = new ForceGraph3D(container)
      .graphData(graphData)
      .width(container.clientWidth)
      .height(container.clientHeight)

    const handleResize = () => {
      graph.width(container.clientWidth).height(container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // `_destructor` is 3d-force-graph's own documented teardown method
      // (frees the WebGL context/renderer) despite the underscore prefix.
      graph._destructor()
    }
  }, [graphData])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export default GraphView
