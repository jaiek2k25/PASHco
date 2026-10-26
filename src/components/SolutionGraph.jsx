import { useMemo, useState } from 'react'

const WIDTH = 720
const HEIGHT = 350
const X_MIN = -8
const X_MAX = 8
const Y_MIN = -8
const Y_MAX = 8

function toPoint(x, y) {
  return {
    px: ((x - X_MIN) / (X_MAX - X_MIN)) * WIDTH,
    py: HEIGHT - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * HEIGHT,
  }
}

function makePath(fn) {
  let path = ''
  for (let step = 0; step <= 320; step += 1) {
    const x = X_MIN + (step / 320) * (X_MAX - X_MIN)
    const y = fn(x)
    if (!Number.isFinite(y) || Math.abs(y) > 100) continue
    const { px, py } = toPoint(x, y)
    path += `${path ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `
  }
  return path
}

function Grid() {
  return (
    <g>
      {Array.from({ length: 17 }).map((_, index) => {
        const x = X_MIN + index
        const { px } = toPoint(x, 0)
        return <line key={`v-${x}`} x1={px} y1="0" x2={px} y2={HEIGHT} stroke={x === 0 ? '#7c7c95' : '#e9e9f2'} strokeWidth={x === 0 ? 1.7 : 1} />
      })}
      {Array.from({ length: 17 }).map((_, index) => {
        const y = Y_MIN + index
        const { py } = toPoint(0, y)
        return <line key={`h-${y}`} x1="0" y1={py} x2={WIDTH} y2={py} stroke={y === 0 ? '#7c7c95' : '#e9e9f2'} strokeWidth={y === 0 ? 1.7 : 1} />
      })}
      <text x={WIDTH - 14} y={toPoint(0, 0).py - 8} fontSize="12" fill="#77778c">x</text>
      <text x={toPoint(0, 0).px + 9} y="16" fontSize="12" fill="#77778c">y</text>
    </g>
  )
}

function BarGraph({ values }) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1)
  return (
    <div className="bar-graph">
      {values.slice(0, 16).map((value, index) => (
        <div className="bar-item" key={index}>
          <div className="bar-track"><i style={{ height: `${Math.max(6, (Math.abs(value) / max) * 100)}%` }} /></div>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function SolutionGraph({ graph }) {
  const [a, setA] = useState(graph?.kind === 'quadratic' && Math.abs(graph.a) < 8 ? graph.a : -1)
  const [m, setM] = useState(graph?.kind === 'linear' && Math.abs(graph.m) < 8 ? graph.m : 1)
  const [c, setC] = useState(graph?.kind === 'quadratic' && Math.abs(graph.c) < 8 ? graph.c : 6)

  const parabolaPath = useMemo(() => makePath((x) => a * x * x), [a])
  const linePath = useMemo(() => makePath((x) => m * x + c), [m, c])
  const intersections = useMemo(() => {
    // a x² = m x + c  →  a x² - m x - c = 0
    if (Math.abs(a) < 1e-8) {
      if (Math.abs(m) < 1e-8) return []
      const x = -c / m
      return [{ x, y: m * x + c }]
    }
    const discriminant = m * m + 4 * a * c
    if (discriminant < 0) return []
    const root = Math.sqrt(discriminant)
    return [(-(-m) + root) / (2 * a), (-(-m) - root) / (2 * a)]
      .map((x) => ({ x, y: m * x + c }))
      .filter((point) => point.x >= X_MIN && point.x <= X_MAX && point.y >= Y_MIN && point.y <= Y_MAX)
  }, [a, m, c])

  if (graph?.kind === 'bars') return <div className="solution-graph"><div className="graph-header"><div><h3>Data visualization</h3><p>Each bar represents one value in the data set.</p></div></div><BarGraph values={graph.values || []} /></div>
  if (graph?.kind === 'circle') return (
    <div className="solution-graph"><div className="graph-header"><div><h3>Circle diagram</h3><p>Visualizing r = {Number(graph.radius).toFixed(2)} units.</p></div></div>
      <div className="shape-visual"><svg viewBox="0 0 300 220"><circle cx="150" cy="110" r="78" fill="rgba(111,84,246,.10)" stroke="#6f54f6" strokeWidth="3" /><line x1="150" y1="110" x2="228" y2="110" stroke="#f59e0b" strokeWidth="3" /><circle cx="150" cy="110" r="4" fill="#25253b" /><text x="184" y="101" fill="#6b5b2c" fontWeight="700">r</text></svg></div>
    </div>
  )
  if (graph?.kind === 'triangle') return (
    <div className="solution-graph"><div className="graph-header"><div><h3>Right triangle diagram</h3><p>Legs a = {graph.a}, b = {graph.b}</p></div></div>
      <div className="shape-visual"><svg viewBox="0 0 320 220"><path d="M50 180 L50 50 L260 180 Z" fill="rgba(111,84,246,.08)" stroke="#6f54f6" strokeWidth="3" /><path d="M50 160 L70 160 L70 180" fill="none" stroke="#6f54f6" strokeWidth="2" /><text x="25" y="120" fill="#6f54f6" fontWeight="700">a</text><text x="145" y="205" fill="#6f54f6" fontWeight="700">b</text><text x="158" y="103" fill="#f59e0b" fontWeight="700">c</text></svg></div>
    </div>
  )

  return (
    <div className="solution-graph">
      <div className="graph-header">
        <div><h3>Interactive graph</h3><p>Adjust the parameters and watch the curves and intersection points update.</p></div>
        <div className="graph-legend"><span><i className="purple" /> f(x) = {Number(a).toFixed(1)}x²</span><span><i className="green" /> g(x) = {Number(m).toFixed(1)}x + {Number(c).toFixed(1)}</span></div>
      </div>
      <div className="graph-layout">
        <div className="graph-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
            <Grid />
            <path d={parabolaPath} fill="none" stroke="#7054f5" strokeWidth="3.5" />
            <path d={linePath} fill="none" stroke="#18b77a" strokeWidth="3.5" />
            {intersections.map((point, index) => {
              const { px, py } = toPoint(point.x, point.y)
              return <g key={index}><circle cx={px} cy={py} r="6" fill="#ffbd2e" stroke="#fff" strokeWidth="2" /><text x={px + 9} y={py - 9} fontSize="12" fill="#55556d">({point.x.toFixed(1)}, {point.y.toFixed(1)})</text></g>
            })}
          </svg>
          <div className="axis-labels"><span>−8</span><span>−4</span><span>0</span><span>4</span><span>8</span></div>
        </div>
        <div className="graph-controls">
          <div className="parameter-group"><h4>Parameters</h4>
            <label><span>Parabola Coeff (a)</span><strong>{Number(a).toFixed(1)}</strong><input type="range" min="-3" max="3" step="0.1" value={a} onChange={(event) => setA(Number(event.target.value))} /></label>
            <label><span>Line Gradient (m)</span><strong>{Number(m).toFixed(1)}</strong><input type="range" min="-5" max="5" step="0.1" value={m} onChange={(event) => setM(Number(event.target.value))} /></label>
            <label><span>Line Y-Intercept (c)</span><strong>{Number(c).toFixed(1)}</strong><input type="range" min="-8" max="8" step="0.1" value={c} onChange={(event) => setC(Number(event.target.value))} /></label>
          </div>
          <div className="intersection-list"><h4>Intersections</h4>{intersections.length ? intersections.map((point, index) => <div key={index}><i /> ({point.x.toFixed(1)}, {point.y.toFixed(1)})</div>) : <p>No visible intersections in this window.</p>}</div>
          <p className="graph-hint">Adjust <strong>a</strong> to change curvature, <strong>m</strong> for line slope, and <strong>c</strong> for the y-intercept.</p>
        </div>
      </div>
    </div>
  )
}
