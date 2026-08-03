import type { CSSProperties } from 'react'
import GraphView from './graph/GraphView.tsx'

function App() {
  return (
    <main style={{ height: '100vh' }}>
      <h1 style={visuallyHidden}>Jive Moves Graph</h1>
      <GraphView />
    </main>
  )
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
}

export default App
