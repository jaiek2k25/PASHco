import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Download, Eraser, Expand,
  HelpCircle, Highlighter, LoaderCircle, MessageCircle, Mic, Minimize2, Pause, PenLine, Play,
  Plus, Printer, RotateCcw, RotateCw, Send, Sparkles, Square, Trash2, Upload, Volume2, VolumeX, Wand2, X,
} from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import { Badge, Button, Modal, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, downloadText, safeFileName, tutorLessons, tutorWhiteboards } from '../lib/intelligence'
import { aiLesson, aiTutorAnswer } from '../lib/aiClient'

const BOARD_W = 1000
const BOARD_H = 620
const INKS = [
  { id: 'ink', label: 'Ink', color: '#20232e' },
  { id: 'violet', label: 'Violet', color: '#6c55f6' },
  { id: 'green', label: 'Green', color: '#16a672' },
  { id: 'amber', label: 'Amber', color: '#e0900b' },
  { id: 'pink', label: 'Pink', color: '#e8508f' },
]

let measureCtx = null
function measureInk(text, size, weight = 600) {
  if (typeof document === 'undefined') return text.length * size * 0.52
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return text.length * size * 0.52
  measureCtx.font = `${weight} ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
  return measureCtx.measureText(text).width
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

function HandLine({ text, x, y, size = 34, color = '#20232e', weight = 600, progress = 1, at = 0, span = 0.5 }) {
  const id = useId().replace(/:/g, '')
  const width = useMemo(() => measureInk(text, size, weight) + 10, [text, size, weight])
  const local = clamp01((progress - at) / Math.max(span, 0.01))
  if (local <= 0) return null
  const visible = width * local
  return (
    <g>
      <clipPath id={`clip-${id}`}><rect x={x - 6} y={y - size * 1.25} width={visible} height={size * 1.9} /></clipPath>
      <text
        x={x}
        y={y}
        fontFamily='"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
        fontSize={size}
        fontWeight={weight}
        fill={color}
        clipPath={`url(#clip-${id})`}
        style={{ letterSpacing: '.3px' }}
      >
        {text}
      </text>
      {local > 0 && local < 0.999 && (
        <g>
          <circle cx={x + visible} cy={y - size * 0.18} r={4.2} fill={color} opacity="0.85" />
          <circle cx={x + visible} cy={y - size * 0.18} r={9} fill={color} opacity="0.12" />
        </g>
      )}
    </g>
  )
}

function Sketch({ kind, progress }) {
  if (!kind) return null
  const draw = (delay = 0, span = 0.6) => {
    const p = clamp01((progress - delay) / span)
    return { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p, opacity: p > 0 ? 1 : 0 }
  }
  const stroke = { fill: 'none', stroke: '#3b3f52', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }

  if (kind === 'parabola' || kind === 'parabolaRoots') {
    return (
      <g>
        <path d="M650 420 H 930" {...stroke} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(progress / 0.5)} />
        <path d="M790 460 V 150" {...stroke} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(progress / 0.5)} />
        <path d="M675 168 Q 790 500 905 168" {...stroke} strokeWidth={4} {...draw(0.15, 0.6)} />
        <path d="M790 460 l -8 12 M790 460 l 8 12" {...stroke} strokeWidth={2.4} opacity={clamp01((progress - 0.3) * 2)} />
        <path d="M930 420 l -12 -8 M930 420 l -12 8" {...stroke} strokeWidth={2.4} opacity={clamp01((progress - 0.3) * 2)} />
        {kind === 'parabolaRoots' && (
          <g opacity={clamp01((progress - 0.6) * 3)}>
            <circle cx="727" cy="420" r="6" fill="#6c55f6" />
            <circle cx="853" cy="420" r="6" fill="#6c55f6" />
            <text x="700" y="448" fontFamily='"Segoe Print", cursive' fontSize="22" fill="#6c55f6">−1/3</text>
            <text x="838" y="448" fontFamily='"Segoe Print", cursive' fontSize="22" fill="#6c55f6">2</text>
          </g>
        )}
        <text x="906" y="405" fontFamily='"Segoe Print", cursive' fontSize="20" fill="#7c8095">x</text>
        <text x="800" y="172" fontFamily='"Segoe Print", cursive' fontSize="20" fill="#7c8095">y</text>
      </g>
    )
  }

  if (kind === 'leaf') {
    return (
      <g>
        <path d="M780 420 C 690 380, 690 220, 800 170 C 900 230, 880 370, 780 420 Z" {...stroke} strokeWidth={3.4} {...draw(0.05, 0.55)} />
        <path d="M780 420 C 782 350, 786 260, 796 200" {...stroke} strokeWidth={2.4} {...draw(0.3, 0.4)} />
        <path d="M787 330 C 750 315, 730 290, 722 262" {...stroke} strokeWidth={2.2} {...draw(0.45, 0.3)} />
        <path d="M791 295 C 826 282, 846 258, 852 232" {...stroke} strokeWidth={2.2} {...draw(0.5, 0.3)} />
        <g opacity={clamp01((progress - 0.55) * 3)}>
          <circle cx="885" cy="150" r="20" fill="#f7c948" opacity=".7" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line key={angle} x1={885 + Math.cos((angle * Math.PI) / 180) * 25} y1={150 + Math.sin((angle * Math.PI) / 180) * 25} x2={885 + Math.cos((angle * Math.PI) / 180) * 34} y2={150 + Math.sin((angle * Math.PI) / 180) * 34} stroke="#f0b429" strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
        <text x="706" y="465" fontFamily='"Segoe Print", cursive' fontSize="21" fill="#7c8095">sunlight in</text>
      </g>
    )
  }

  if (kind === 'chloroplast') {
    return (
      <g>
        <ellipse cx="800" cy="290" rx="120" ry="72" {...stroke} strokeWidth={3.4} {...draw(0.05, 0.55)} />
        <g {...draw(0.35, 0.45)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01((progress - 0.35) / 0.45)}>
          <path d="M735 265 h 44 M735 290 h 44 M735 315 h 44" stroke="#16a672" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M818 265 h 44 M818 290 h 44 M818 315 h 44" stroke="#16a672" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
        <path d="M700 200 C 740 170, 780 170, 800 190" {...stroke} strokeWidth={2.6} {...draw(0.6, 0.3)} />
        <text x="716" y="432" fontFamily='"Segoe Print", cursive' fontSize="21" fill="#7c8095">thylakoid stacks</text>
      </g>
    )
  }

  if (kind === 'cycle') {
    return (
      <g>
        <path d="M800 185 A 105 105 0 1 1 799 186" {...stroke} strokeWidth={3.4} {...draw(0.05, 0.6)} />
        <path d="M800 168 l 16 16 l -16 16" {...stroke} strokeWidth={3} {...draw(0.55, 0.2)} />
        <g opacity={clamp01((progress - 0.4) * 2.4)} fontFamily='"Segoe Print", cursive' fontSize="22" fill="#4b4f63">
          <text x="806" y="292">growth</text>
          <text x="694" y="392">copy</text>
          <text x="838" y="392">divide</text>
        </g>
      </g>
    )
  }

  if (kind === 'chromosomes') {
    return (
      <g>
        {[
          [720, 250], [800, 250], [880, 250],
          [760, 355], [840, 355],
        ].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`} opacity={clamp01((progress - index * 0.1) * 3)}>
            <path d={`M${cx - 26} ${cy - 34} L${cx + 26} ${cy + 34}`} stroke={index % 2 ? '#e8508f' : '#6c55f6'} strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d={`M${cx + 26} ${cy - 34} L${cx - 26} ${cy + 34}`} stroke={index % 2 ? '#6c55f6' : '#e8508f'} strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        ))}
        <text x="700" y="432" fontFamily='"Segoe Print", cursive' fontSize="21" fill="#7c8095">duplicated chromosomes</text>
      </g>
    )
  }

  if (kind === 'cells') {
    return (
      <g>
        <circle cx="740" cy="300" r="58" {...stroke} strokeWidth={3.2} {...draw(0.05, 0.4)} />
        <circle cx="740" cy="300" r="20" {...stroke} strokeWidth={2.4} {...draw(0.25, 0.25)} />
        <circle cx="872" cy="300" r="58" {...stroke} strokeWidth={3.2} {...draw(0.45, 0.4)} />
        <circle cx="872" cy="300" r="20" {...stroke} strokeWidth={2.4} {...draw(0.65, 0.25)} />
        <path d="M806 275 l 14 12 l -14 12" {...stroke} strokeWidth={2.6} {...draw(0.8, 0.2)} />
        <text x="742" y="392" fontFamily='"Segoe Print", cursive' fontSize="20" fill="#7c8095">one cell</text>
        <text x="858" y="392" fontFamily='"Segoe Print", cursive' fontSize="20" fill="#7c8095">two cells</text>
      </g>
    )
  }

  if (kind === 'tangent') {
    return (
      <g>
        <path d="M660 420 H 930" {...stroke} strokeWidth={2.4} {...draw(0, 0.4)} />
        <path d="M680 430 V 160" {...stroke} strokeWidth={2.4} {...draw(0, 0.4)} />
        <path d="M680 400 Q 780 400 880 205" {...stroke} strokeWidth={3.6} {...draw(0.2, 0.5)} />
        <path d="M746 402 L 862 260" stroke="#e8508f" strokeWidth="3.2" strokeLinecap="round" fill="none" {...draw(0.6, 0.35)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01((progress - 0.6) / 0.35)} />
        <circle cx="800" cy="336" r="6" fill="#e8508f" opacity={clamp01((progress - 0.75) * 4)} />
        <text x="866" y="252" fontFamily='"Segoe Print", cursive' fontSize="20" fill="#e8508f" opacity={clamp01((progress - 0.8) * 4)}>tangent</text>
      </g>
    )
  }

  return null
}

function BoardContent({ content, progress, stepLabel }) {
  const lines = content?.lines || []
  const titleSize = 48
  const bodySize = 32
  return (
    <svg className="wb-ink" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} role="img" aria-label={`Whiteboard for ${lines[0] || 'this step'}`}>
      <g opacity="0.9">
        <text x="64" y="56" fontFamily='"Segoe Print", cursive' fontSize="19" fill="#a3a7b8">wesolve · whiteboard</text>
        <text x={BOARD_W - 64} y="56" textAnchor="end" fontFamily='"Segoe Print", cursive' fontSize="19" fill="#a3a7b8">{stepLabel}</text>
      </g>
      {lines.map((line, index) => {
        const isTitle = index === 0
        const size = isTitle ? titleSize : bodySize
        const y = isTitle ? 150 : 220 + (index - 1) * 58
        return (
          <HandLine
            key={`${line}-${index}`}
            text={line}
            x={64}
            y={y}
            size={size}
            weight={isTitle ? 700 : 600}
            color={isTitle ? '#20232e' : content.highlight === index ? '#6c55f6' : '#3a3e50'}
            progress={progress}
            at={index * 0.11}
            span={0.4}
          />
        )
      })}
      {lines[0] && (
        <path
          d={`M60 168 q ${Math.min(measureInk(lines[0], titleSize, 700), 520) / 2} 14 ${Math.min(measureInk(lines[0], titleSize, 700), 520)} 0`}
          stroke="#6c55f6"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          opacity={clamp01((progress - 0.38) * 3) * 0.55}
        />
      )}
      <Sketch kind={content?.sketch} progress={clamp01((progress - 0.35) / 0.65)} />
    </svg>
  )
}

export default function TutorPage() {
  const { toast, state } = useApp()
  const [lessonId, setLessonId] = useState(tutorLessons[0].id)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(!state.settings.voiceEnabled)
  const [progress, setProgress] = useState(0)
  const [tool, setTool] = useState('pen')
  const [ink, setInk] = useState(INKS[0].color)
  const [brush, setBrush] = useState(4)
  const [strokes, setStrokes] = useState([])
  const [redone, setRedone] = useState([])
  const [lessonOpen, setLessonOpen] = useState(false)
  const [dockTab, setDockTab] = useState('steps')
  const [checkpoint, setCheckpoint] = useState(null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [lasso, setLasso] = useState(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const [resumeHint, setResumeHint] = useState(false)
  const [customLessons, setCustomLessons] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createTopic, setCreateTopic] = useState('')
  const [createMaterial, setCreateMaterial] = useState('')
  const [creating, setCreating] = useState(false)

  const studioRef = useRef(null)
  const canvasRef = useRef(null)
  const pointer = useRef({ active: false, points: [] })
  const frameRef = useRef(null)
  const startedAt = useRef(0)
  const audioRef = useRef(null)

  const allLessons = [...tutorLessons, ...customLessons]
  const lesson = allLessons.find((item) => item.id === lessonId) || tutorLessons[0]
  const stepData = lesson.steps[step] || lesson.steps[0]
  const content = stepData.lines
    ? { lines: stepData.lines, sketch: stepData.sketch || null }
    : ((tutorWhiteboards[lesson.id] || [])[step] || { lines: [stepData.board, stepData.note], sketch: null })
  const currentStep = lesson.steps[step]
  const totalSteps = lesson.steps.length
  const stepPct = ((step + 1) / totalSteps) * 100
  const atEnd = step === totalSteps - 1

  const getBoardMap = useCallback(() => {
    const svg = document.querySelector('.wb-ink')
    const canvas = canvasRef.current
    if (!svg || !canvas) return null
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const scale = Math.min(rect.width / BOARD_W, rect.height / BOARD_H)
    const offsetX = (rect.width - BOARD_W * scale) / 2
    const offsetY = (rect.height - BOARD_H * scale) / 2
    return {
      rect,
      scale,
      offsetX,
      offsetY,
      sx: canvas.width / (canvas.clientWidth || rect.width),
      sy: canvas.height / (canvas.clientHeight || rect.height),
    }
  }, [])

  const toCanvas = useCallback((point, map) => ({
    x: (map.offsetX + point.x * map.scale) * map.sx,
    y: (map.offsetY + point.y * map.scale) * map.sy,
  }), [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const map = getBoardMap()
    if (!map) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.25 : 1
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * map.scale * map.sx
      const start = toCanvas(stroke.points[0], map)
      ctx.moveTo(start.x, start.y)
      for (let index = 1; index < stroke.points.length; index += 1) {
        const next = toCanvas(stroke.points[index], map)
        ctx.lineTo(next.x, next.y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }, [strokes, getBoardMap, toCanvas])

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, rect.width * ratio)
    canvas.height = Math.max(1, rect.height * ratio)
    redraw()
  }, [redraw])

  useEffect(() => {
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    return () => window.removeEventListener('resize', sizeCanvas)
  }, [sizeCanvas])

  useEffect(() => {
    redraw()
  }, [redraw])

  // Reset writing when the step or lesson changes.
  useEffect(() => {
    setProgress(0)
    const started = performance.now()
    startedAt.current = started
    cancelAnimationFrame(frameRef.current)
    const duration = 1500 / speed
    const tick = (now) => {
      const value = clamp01((now - started) / duration)
      setProgress(value)
      if (value < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [step, lessonId, speed])

  const speakCurrent = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || muted) return null
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentStep.speech)
    utterance.rate = 0.96 * speed
    utterance.pitch = 1.02
    utterance.onend = () => {
      window.setTimeout(() => {
        setStep((value) => {
          if (value >= totalSteps - 1) {
            setPlaying(false)
            return value
          }
          return value + 1
        })
      }, 450)
    }
    audioRef.current = utterance
    window.speechSynthesis.speak(utterance)
    return utterance
  }, [currentStep.speech, muted, speed, totalSteps])

  useEffect(() => {
    if (!playing) {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
      return undefined
    }
    const utterance = speakCurrent()
    if (!utterance) {
      const timer = window.setTimeout(() => {
        setStep((value) => {
          if (value >= totalSteps - 1) { setPlaying(false); return value }
          return value + 1
        })
      }, 3200 / speed)
      return () => window.clearTimeout(timer)
    }
    return () => window.speechSynthesis?.cancel()
  }, [playing, step, lessonId, speed, muted])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
    setCheckpoint(null)
    setChat([])
    setStrokes([])
    setRedone([])
    setLasso(null)
    setSaveName(`${lesson.title} — whiteboard`)
  }, [lessonId])

  useEffect(() => {
    setLasso(null)
  }, [step])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const getPoint = (event) => {
    const map = getBoardMap()
    if (!map) return { x: 0, y: 0 }
    const localX = event.clientX - map.rect.left
    const localY = event.clientY - map.rect.top
    return {
      x: Math.max(0, Math.min(BOARD_W, (localX - map.offsetX) / map.scale)),
      y: Math.max(0, Math.min(BOARD_H, (localY - map.offsetY) / map.scale)),
    }
  }

  const pointerDown = (event) => {
    if (tool === 'cursor') return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { active: true, points: [getPoint(event)] }
  }

  const pointerMove = (event) => {
    if (!pointer.current.active) return
    pointer.current.points.push(getPoint(event))
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const map = getBoardMap()
    if (!ctx || !map) return
    const points = pointer.current.points
    const last = points[points.length - 2]
    const current = points[points.length - 1]
    if (!last) return
    const from = toCanvas(last, map)
    const to = toCanvas(current, map)
    ctx.beginPath()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.globalAlpha = tool === 'highlighter' ? 0.25 : 1
    ctx.strokeStyle = ink
    ctx.lineWidth = (tool === 'highlighter' ? brush * 3.4 : tool === 'eraser' ? brush * 4.5 : brush) * map.scale * map.sx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  const pointerUp = () => {
    if (!pointer.current.active) return
    const points = pointer.current.points
    pointer.current = { active: false, points: [] }
    if (points.length < 2) return
    if (tool === 'lasso') {
      const xs = points.map((point) => point.x)
      const ys = points.map((point) => point.y)
      const rect = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }
      setLasso({ points, rect })
      setTool('pen')
      return
    }
    setStrokes((current) => [...current, {
      id: createId('stroke'),
      tool,
      color: ink,
      size: tool === 'highlighter' ? brush * 3.4 : tool === 'eraser' ? brush * 4.5 : brush,
      points,
    }])
    setRedone([])
  }

  const undo = () => {
    setStrokes((current) => {
      if (!current.length) return current
      const last = current[current.length - 1]
      setRedone((future) => [...future, last])
      return current.slice(0, -1)
    })
  }

  const redo = () => {
    setRedone((future) => {
      if (!future.length) return future
      const last = future[future.length - 1]
      setStrokes((current) => [...current, last])
      return future.slice(0, -1)
    })
  }

  const clearInk = () => {
    setStrokes([])
    setRedone([])
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await studioRef.current?.requestFullscreen?.()
      else await document.exitFullscreen?.()
    } catch {
      toast('Fullscreen is not available in this browser.', 'error')
    }
  }

  const askTutor = async (question) => {
    const text = String(question || chatInput).trim()
    if (!text || asking) return
    setPlaying(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setResumeHint(step < totalSteps - 1)
    setChatInput('')
    setDockTab('ask')
    const id = createId('chat')
    setChat((items) => [...items, { id, question: text, answer: 'Thinking…', pending: true }])
    setAsking(true)
    const aiAnswer = await aiTutorAnswer(text, {
      lesson: lesson.title,
      step: `Step ${step + 1}: ${currentStep.board}`,
      board: content.lines.join(' · '),
      subject: lesson.subject,
    })
    const answer = aiAnswer || buildLocalTutorAnswer(text, lesson, currentStep, content)
    setChat((items) => items.map((item) => item.id === id ? { ...item, answer, pending: false } : item))
    setAsking(false)
  }

  const lassoQuestion = () => {
    if (!lasso) return
    const { y, height } = lasso.rect
    const captured = content.lines.filter((line, index) => {
      const lineY = index === 0 ? 150 : 220 + (index - 1) * 58
      return lineY >= y - 40 && lineY <= y + height + 40
    })
    const quoted = captured.length ? captured : content.lines.slice(0, 2)
    setDockTab('ask')
    setPlaying(false)
    setResumeHint(step < totalSteps - 1)
    askTutor(`Explain this part of the board: “${quoted.join(' / ')}”`)
  }

  const toggleMic = () => {
    const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
    if (!Recognition) {
      toast('Voice input is not supported in this browser.', 'error')
      return
    }
    if (listening) {
      recognitionRef.current?.stop?.()
      setListening(false)
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let text = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        text += event.results[index][0].transcript
      }
      setChatInput(text.trim())
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const answerCheckpoint = (index) => {
    setCheckpoint(index)
    if (index === lesson.checkpoint.correctIndex) toast('Exactly right. Checkpoint cleared!')
    else toast('Not quite — re-read the board and try once more.', 'error')
  }

  const createLesson = async () => {
    if (!createTopic.trim() && !createMaterial.trim()) {
      toast('Add a topic, question, or some notes first.', 'error')
      return
    }
    setCreating(true)
    const newLesson = await aiLesson(createTopic.trim() || 'My notes', createMaterial.trim())
    setCustomLessons((items) => [newLesson, ...items].slice(0, 8))
    setLessonId(newLesson.id)
    setCreateOpen(false)
    setCreateTopic('')
    setCreateMaterial('')
    setCreating(false)
    toast(newLesson.source === 'nvidia' ? 'Your whiteboard lesson is ready.' : 'Lesson created with the local engine.')
  }

  const readMaterialFile = (file) => {
    if (!file) return
    if (!/\.(txt|md|csv)$/i.test(file.name)) {
      toast('For the whiteboard, upload a TXT, Markdown, or CSV file. PDF text can be pasted instead.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCreateMaterial(String(reader.result || '').slice(0, 16000))
    reader.readAsText(file)
  }

  const replay = () => {
    setStep(0)
    setCheckpoint(null)
    setPlaying(true)
  }

  const saveNotes = () => {
    const lines = [
      `# ${lesson.title} — whiteboard notes`,
      ``,
      `Subject: ${lesson.subject} · ${lesson.duration}`,
      ``,
      ...lesson.steps.flatMap((item, index) => {
        const detail = (tutorWhiteboards[lesson.id] || [])[index]
        return [`## Step ${index + 1}`, ...(detail?.lines || [item.board]), `> ${item.note}`, ``]
      }),
      chat.length ? '## Questions' : '',
      ...chat.map((item) => `**You:** ${item.question}\n\n**Tutor:** ${item.answer}\n`),
    ].filter(Boolean)
    downloadText(`${safeFileName(lesson.title)}-whiteboard.md`, lines.join('\n'), 'text/markdown')
    setSaveOpen(false)
    toast('Whiteboard notes downloaded.')
  }

  const exportBoard = async () => {
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = BOARD_W * scale
    canvas.height = BOARD_H * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.fillStyle = '#fffdf8'
    ctx.fillRect(0, 0, BOARD_W, BOARD_H)
    const svg = document.querySelector('.wb-ink')
    if (svg) {
      const clone = svg.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      const data = new XMLSerializer().serializeToString(clone)
      const image = new Image()
      const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' }))
      await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; image.src = url })
      ctx.drawImage(image, 0, 0, BOARD_W, BOARD_H)
      URL.revokeObjectURL(url)
    }
    const inkCanvas = canvasRef.current
    const map = getBoardMap()
    if (inkCanvas && map) {
      const sourceX = map.offsetX * map.sx
      const sourceY = map.offsetY * map.sy
      const sourceW = BOARD_W * map.scale * map.sx
      const sourceH = BOARD_H * map.scale * map.sy
      ctx.drawImage(inkCanvas, sourceX, sourceY, sourceW, sourceH, 0, 0, BOARD_W, BOARD_H)
    }
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${safeFileName(lesson.title)}-whiteboard.png`
    link.click()
    setSaveOpen(false)
    toast('Whiteboard exported as a PNG.')
  }

  return (
    <div className={`app-page wb-page ${fullscreen ? 'is-fullscreen' : ''}`}>
      <ToolTabs />

      <div className="wb-studio" ref={studioRef}>
        <header className="wb-header">
          <div className="wb-title">
            <button className="wb-lesson-switch" onClick={() => setLessonOpen((open) => !open)}>
              <span className="wb-subject-dot" style={{ background: lesson.color }} />
              <div><strong>{lesson.title}</strong><small>{lesson.subject} · {lesson.duration}</small></div>
              <ChevronDown size={16} />
            </button>
            {lessonOpen && (
              <div className="wb-lesson-menu">
                {allLessons.map((item) => (
                  <button key={item.id} className={item.id === lesson.id ? 'active' : ''} onClick={() => { setLessonId(item.id); setLessonOpen(false) }}>
                    <span style={{ background: item.color }} />
                    <div><strong>{item.title}</strong><small>{item.subject} · {item.duration}{item.custom ? ' · your lesson' : ''}</small></div>
                    {item.id === lesson.id && <Check size={15} />}
                  </button>
                ))}
                <button className="wb-new-lesson" onClick={() => { setLessonOpen(false); setCreateOpen(true) }}>
                  <span className="wb-new-plus"><Plus size={14} /></span>
                  <div><strong>Teach me something new</strong><small>Topic, question, notes, or a file</small></div>
                </button>
              </div>
            )}
            <Badge tone="purple">NEW</Badge>
          </div>

          <div className="wb-header-actions">
            <div className="wb-step-pill">Step {step + 1} <span>/ {totalSteps}</span></div>
            <button className={`wb-icon-btn ${muted ? 'muted' : ''}`} onClick={() => { setMuted((value) => !value); if (!muted) window.speechSynthesis?.cancel() }} title={muted ? 'Unmute narration' : 'Mute narration'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button className="wb-icon-btn" onClick={() => setShowHelp(true)} title="Whiteboard help"><HelpCircle size={18} /></button>
            <Button size="sm" variant="outline" icon={Plus} onClick={() => setCreateOpen(true)}>New lesson</Button>
            <Button size="sm" variant="outline" icon={Download} onClick={() => setSaveOpen(true)}>Save</Button>
            <button className="wb-icon-btn" onClick={toggleFullscreen} title="Fullscreen">{fullscreen ? <Minimize2 size={18} /> : <Expand size={18} />}</button>
          </div>
        </header>

        <div className="wb-body">
          <div className="wb-board-wrap">
            <div className="wb-board">
              <div className="wb-board-top">
                <span className="wb-board-chip"><PenLine size={13} /> AI Whiteboard</span>
                <span className="wb-board-duration">{currentStep.note}</span>
              </div>
              <div className="wb-surface">
                <div className="wb-grid" aria-hidden="true" />
                <BoardContent content={content} progress={progress} stepLabel={`${step + 1} / ${totalSteps}`} />
                <canvas
                  ref={canvasRef}
                  className={`wb-canvas tool-${tool}`}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerLeave={pointerUp}
                  onPointerCancel={pointerUp}
                />
                {lasso && (
                  <svg className="wb-lasso" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
                    <rect
                      x={lasso.rect.x - 6}
                      y={lasso.rect.y - 6}
                      width={lasso.rect.width + 12}
                      height={lasso.rect.height + 12}
                      rx="18"
                      fill="rgba(108,85,246,.06)"
                      stroke="#6c55f6"
                      strokeWidth="2.5"
                      strokeDasharray="9 7"
                    />
                  </svg>
                )}
                {lasso && (
                  <button
                    className="wb-lasso-ask"
                    style={{
                      left: `${Math.min(88, Math.max(6, ((lasso.rect.x + lasso.rect.width / 2) / BOARD_W) * 100))}%`,
                      top: `${Math.min(88, Math.max(6, ((lasso.rect.y + lasso.rect.height) / BOARD_H) * 100 + 2))}%`,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={lassoQuestion}
                  >
                    <Sparkles size={14} /> Ask about this
                  </button>
                )}
              </div>

              <div className="wb-toolbar">
                <div className="wb-tools">
                  <button className={`wb-tool ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Pen"><PenLine size={17} /></button>
                  <button className={`wb-tool ${tool === 'highlighter' ? 'active' : ''}`} onClick={() => setTool('highlighter')} title="Highlighter"><Highlighter size={17} /></button>
                  <button className={`wb-tool ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser"><Eraser size={17} /></button>
                  <button className={`wb-tool ${tool === 'lasso' ? 'active' : ''}`} onClick={() => setTool('lasso')} title="Circle something to ask about it"><CircleDashed size={17} /></button>
                  <span className="wb-divider" />
                  {INKS.map((item) => (
                    <button
                      key={item.id}
                      className={`wb-swatch ${ink === item.color ? 'active' : ''}`}
                      style={{ '--swatch': item.color }}
                      onClick={() => { setInk(item.color); setTool('pen') }}
                      aria-label={`${item.label} ink`}
                    />
                  ))}
                  <span className="wb-divider" />
                  <label className="wb-size">
                    <span>{brush}px</span>
                    <input type="range" min="2" max="14" value={brush} onChange={(event) => setBrush(Number(event.target.value))} />
                  </label>
                </div>
                <div className="wb-tools secondary">
                  <button className="wb-tool" onClick={undo} disabled={!strokes.length} title="Undo"><RotateCcw size={16} /></button>
                  <button className="wb-tool" onClick={redo} disabled={!redone.length} title="Redo"><RotateCw size={16} /></button>
                  <button className="wb-tool danger" onClick={clearInk} disabled={!strokes.length} title="Clear your ink"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="wb-playback">
                <button className="wb-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause lesson' : 'Play lesson'}>
                  {playing ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className="wb-skip" onClick={() => { setPlaying(false); setStep((value) => Math.max(0, value - 1)) }} disabled={step === 0} aria-label="Previous step"><ChevronLeft size={18} /></button>
                <button className="wb-skip" onClick={() => { setPlaying(false); setStep((value) => Math.min(totalSteps - 1, value + 1)) }} disabled={atEnd} aria-label="Next step"><ChevronRight size={18} /></button>
                <div className="wb-timeline">
                  <ProgressBar value={stepPct} tone="purple" label={`${lesson.steps[step].board}`} />
                  <div className="wb-dots">
                    {lesson.steps.map((item, index) => (
                      <button key={item.board} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => { setPlaying(false); setStep(index) }} aria-label={`Go to step ${index + 1}`} />
                    ))}
                  </div>
                </div>
                <button className="wb-speed" onClick={() => setSpeed((value) => (value === 1 ? 1.25 : value === 1.25 ? 0.8 : 1))}>{speed}×</button>
                <button className="wb-icon-btn small" onClick={replay} title="Replay lesson"><RotateCcw size={16} /></button>
              </div>
            </div>
          </div>

          <aside className="wb-dock">
            <div className="wb-dock-tabs">
              <button className={dockTab === 'steps' ? 'active' : ''} onClick={() => setDockTab('steps')}><Square size={14} /> Lesson</button>
              <button className={dockTab === 'ask' ? 'active' : ''} onClick={() => setDockTab('ask')}><MessageCircle size={14} /> Ask AI</button>
              <button className={dockTab === 'notes' ? 'active' : ''} onClick={() => setDockTab('notes')}><PenLine size={14} /> Notes</button>
            </div>

            {dockTab === 'steps' && (
              <div className="wb-dock-body">
                <div className="wb-narrator">
                  <span className="wb-narrator-avatar"><Sparkles size={16} /></span>
                  <div>
                    <strong>WeSolve Tutor</strong>
                    <p>{currentStep.speech}</p>
                  </div>
                  <button onClick={() => speakCurrent()} aria-label="Read this step aloud"><Volume2 size={16} /></button>
                </div>

                <ol className="wb-step-list">
                  {lesson.steps.map((item, index) => (
                    <li key={item.board}>
                      <button className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => { setPlaying(false); setStep(index) }}>
                        <span>{index < step ? <Check size={12} /> : index + 1}</span>
                        <div><strong>{item.board}</strong><small>{item.note}</small></div>
                      </button>
                    </li>
                  ))}
                </ol>

                <div className={`wb-checkpoint ${atEnd ? 'unlocked' : ''}`}>
                  <div className="wb-checkpoint-head"><Wand2 size={16} /><strong>Quick check</strong>{!atEnd && <small>Finish the lesson to unlock</small>}</div>
                  <p>{lesson.checkpoint.prompt}</p>
                  <div className="wb-checkpoint-options">
                    {lesson.checkpoint.options.map((option, index) => (
                      <button
                        key={option}
                        disabled={!atEnd}
                        className={
                          checkpoint === null ? '' :
                          index === lesson.checkpoint.correctIndex ? 'correct' :
                          checkpoint === index ? 'wrong' : ''
                        }
                        onClick={() => answerCheckpoint(index)}
                      >
                        <span>{String.fromCharCode(65 + index)}</span>{option}
                        {checkpoint !== null && index === lesson.checkpoint.correctIndex && <Check size={14} />}
                        {checkpoint === index && index !== lesson.checkpoint.correctIndex && <X size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dockTab === 'ask' && (
              <div className="wb-dock-body wb-chat">
                <div className="wb-chat-thread">
                  {chat.length === 0 ? (
                    <div className="wb-chat-empty">
                      <span><Sparkles size={20} /></span>
                      <h3>Ask about this step</h3>
                      <p>I can simplify the explanation, work another example, or check your reasoning.</p>
                      <div className="wb-suggestions">
                        {['Explain this more simply', 'Show another example', 'Why does this step work?'].map((question) => (
                          <button key={question} onClick={() => askTutor(question)}>{question}</button>
                        ))}
                      </div>
                    </div>
                  ) : chat.map((item) => (
                    <div className="wb-chat-item" key={item.id}>
                      <div className="wb-chat-q"><strong>You</strong><p>{item.question}</p></div>
                      <div className={`wb-chat-a ${item.pending ? 'pending' : ''}`}>
                        <span><Sparkles size={13} /> WeSolve Tutor</span>
                        <p>{item.answer}</p>
                        {item.pending && <LoaderCircle size={14} className="spin" />}
                      </div>
                    </div>
                  ))}
                </div>
                {resumeHint && (
                  <button className="wb-resume" onClick={() => { setPlaying(true); setResumeHint(false) }}>
                    <Play size={13} /> Resume the lesson from here
                  </button>
                )}
                <form className="wb-composer" onSubmit={(event) => { event.preventDefault(); askTutor() }}>
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={listening ? 'Listening…' : 'Ask a follow-up…'} />
                  <button type="button" className={`wb-mic ${listening ? 'listening' : ''}`} onClick={toggleMic} aria-label="Ask by voice"><Mic size={16} /></button>
                  <button type="submit" disabled={!chatInput.trim() || asking} aria-label="Send"><Send size={16} /></button>
                </form>
              </div>
            )}

            {dockTab === 'notes' && (
              <div className="wb-dock-body">
                <div className="wb-notes-head"><h3>Your board notes</h3><span>{strokes.length} ink strokes</span></div>
                <div className="wb-notes-preview">
                  {lesson.steps.map((item, index) => (
                    <article key={item.board} className={index === step ? 'active' : ''}>
                      <small>Step {index + 1}</small>
                      <strong>{item.board}</strong>
                      <p>{item.note}</p>
                    </article>
                  ))}
                </div>
                <div className="wb-note-tools">
                  <Button variant="outline" icon={Volume2} onClick={() => speakCurrent()}>Read aloud</Button>
                  <Button variant="outline" icon={Download} onClick={() => setSaveOpen(true)}>Export</Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save your whiteboard"
        subtitle="Download the ink board as an image, or keep the full lesson as notes."
        footer={<><Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button><Button variant="outline" icon={Printer} onClick={() => window.print()}>Print / PDF</Button><Button variant="outline" icon={Download} onClick={saveNotes}>Notes</Button><Button icon={Download} onClick={exportBoard}>Board PNG</Button></>}
      >
        <label className="field-label"><span>File name</span><input value={saveName} onChange={(event) => setSaveName(event.target.value)} /></label>
        <p className="modal-hint">The PNG includes the current board content plus any ink you have drawn. Notes include every step and your tutor chat.</p>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Teach me something new"
        subtitle="Your tutor will write the lesson out on the whiteboard and explain it out loud."
        footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button icon={creating ? LoaderCircle : Wand2} onClick={createLesson} disabled={creating}>{creating ? 'Writing the board…' : 'Start lesson'}</Button></>}
      >
        <div className="wb-create">
          <label className="field-label"><span>Topic or question</span><input value={createTopic} onChange={(event) => setCreateTopic(event.target.value)} placeholder="e.g. Why does a negative discriminant mean no real roots?" /></label>
          <label className="field-label"><span>Your notes or source text <small>optional</small></span><textarea rows="5" value={createMaterial} onChange={(event) => setCreateMaterial(event.target.value)} placeholder="Paste lecture notes, a problem statement, or the passage you want to learn." /></label>
          <label className="wb-upload">
            <Upload size={16} />
            <span>{createMaterial ? `${createMaterial.length.toLocaleString()} characters loaded` : 'Upload a TXT, Markdown, or CSV file'}</span>
            <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" onChange={(event) => readMaterialFile(event.target.files?.[0])} />
          </label>
          <p className="modal-hint">With an NVIDIA key connected, the lesson is written by AI. Without one, the local engine builds the board from your question.</p>
        </div>
      </Modal>

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="How the whiteboard works"
        subtitle="Everything is drawn on this board exactly like a live tutoring session."
      >
        <div className="wb-help-grid">
          {[
            [<Play size={18} key="p" />, 'Play', 'Narrates each step and writes across the board automatically.'],
            [<PenLine size={18} key="pen" />, 'Draw', 'Use pens, a highlighter, or the eraser to annotate the board yourself.'],
            [<RotateCcw size={18} key="u" />, 'Undo / redo', 'Every stroke is remembered. Clear only your ink, never the lesson.'],
            [<Expand size={18} key="f" />, 'Fullscreen', 'Open a distraction-free board for study sessions.'],
          ].map(([icon, title, body]) => (
            <div key={title}><span>{icon}</span><div><strong>{title}</strong><p>{body}</p></div></div>
          ))}
        </div>
        <p className="modal-hint">Tip: connect an NVIDIA key to have the tutor answer questions with live AI.</p>
      </Modal>
    </div>
  )
}

function buildLocalTutorAnswer(question, lesson, step, content) {
  const lower = question.toLowerCase()
  if (lower.includes('example')) {
    return `Here is another example in the same style: start from ${content.lines[0] || step.board}, then repeat the same rule. ${step.note} Write the substitution first, then simplify one line at a time — that keeps the signs straight.`
  }
  if (lower.includes('why')) {
    return `Because ${step.note.toLowerCase()} In “${content.lines[0] || step.board}”, each line is just a reversible step, so nothing about the problem changes except its form.`
  }
  return `Let's slow it down. ${content.lines.join('. ')}. ${step.note} If it still feels stuck, tell me which line stops making sense and we can redo only that one.`
}
