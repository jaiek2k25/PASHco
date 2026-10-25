import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BrainCircuit, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Eraser, Maximize2, MessageCircle, Mic, Pause, Pencil, Play, RotateCcw, Send, Sparkles, Volume2, X } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import { Badge, Button, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, tutorLessons } from '../lib/intelligence'
import { aiTutorAnswer } from '../lib/aiClient'

export default function TutorPage() {
  const { toast } = useApp()
  const [lessonId, setLessonId] = useState(tutorLessons[0].id)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [color, setColor] = useState('#6c55f6')
  const [brush, setBrush] = useState(3)
  const [checkpointAnswer, setCheckpointAnswer] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState([])
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPoint = useRef(null)

  const lesson = tutorLessons.find((item) => item.id === lessonId) || tutorLessons[0]
  const currentStep = lesson.steps[step]
  const progress = ((step + 1) / lesson.steps.length) * 100

  useEffect(() => {
    setStep(0)
    setPlaying(false)
    setCheckpointAnswer(null)
    setChat([])
    clearCanvas()
  }, [lessonId])

  useEffect(() => {
    if (!playing || !window.speechSynthesis) return undefined
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentStep.speech)
    utterance.rate = 0.96
    utterance.pitch = 1.02
    utterance.onend = () => {
      window.setTimeout(() => {
        setStep((value) => {
          if (value >= lesson.steps.length - 1) {
            setPlaying(false)
            return value
          }
          return value + 1
        })
      }, 500)
    }
    window.speechSynthesis.speak(utterance)
    return () => window.speechSynthesis.cancel()
  }, [playing, step, lesson.id])

  useEffect(() => {
    if (playing && !window.speechSynthesis) {
      const timer = window.setTimeout(() => setStep((value) => {
        if (value >= lesson.steps.length - 1) { setPlaying(false); return value }
        return value + 1
      }), 2600)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [playing, step, lesson.steps.length])

  function resizeCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    const snapshot = canvas.width ? canvas.toDataURL() : null
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (snapshot) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height)
      image.src = snapshot
    }
  }

  useEffect(() => {
    resizeCanvas()
    const onResize = () => resizeCanvas()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function getPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const pointerDown = (event) => {
    if (!drawing) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastPoint.current = getPoint(event)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
  }

  const pointerMove = (event) => {
    if (!drawing || !drawingRef.current) return
    const point = getPoint(event)
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = color
    ctx.lineWidth = brush
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPoint.current = point
  }

  const pointerUp = () => {
    drawingRef.current = false
    lastPoint.current = null
  }

  const speakStep = () => {
    if (!window.speechSynthesis) {
      toast('Speech is not supported in this browser.', 'error')
      return
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentStep.speech))
  }

  const sendQuestion = async (event) => {
    event.preventDefault()
    const question = chatInput.trim()
    if (!question) return
    const pendingId = createId('chat')
    setChat((items) => [...items, { id: pendingId, question, answer: 'Thinking with NVIDIA AI…', pending: true }])
    setChatInput('')
    const aiAnswer = await aiTutorAnswer(question, {
      lesson: lesson.title,
      step: `Step ${step + 1}: ${currentStep.board}`,
      board: currentStep.board,
      subject: lesson.subject,
    })
    const answer = aiAnswer || `Good question. In this lesson, we are focusing on “${currentStep.note}”. ${currentStep.speech} If that still feels unclear, try the simpler explanation: ${currentStep.board} means we apply one rule at a time and check the result.`
    setChat((items) => items.map((item) => item.id === pendingId ? { ...item, answer, pending: false } : item))
  }

  return (
    <div className="app-page tutor-page">
      <ToolTabs />
      <PageHeader
        eyebrow="WHITEBOARD TUTOR"
        title="Learn it out loud, see it written"
        description="A one-on-one lesson that speaks while writing each step on the board."
        actions={<><Button variant="outline" icon={Download} onClick={() => window.print()}>Save as PDF</Button><Button icon={playing ? Pause : Play} onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause lesson' : 'Start lesson'}</Button></>}
      />

      <div className="tutor-layout">
        <aside className="tutor-lessons">
          <div className="tutor-lessons-head"><h3>Lessons</h3><Badge tone="purple">4 available</Badge></div>
          {tutorLessons.map((item) => (
            <button key={item.id} className={item.id === lessonId ? 'active' : ''} onClick={() => setLessonId(item.id)}>
              <span style={{ background: `${item.color}18`, color: item.color }}><BrainCircuit size={18} /></span>
              <div><strong>{item.title}</strong><small>{item.subject} · {item.duration}</small></div>
              {item.id === lessonId && <ChevronRight size={16} />}
            </button>
          ))}
          <div className="tutor-daily"><Sparkles size={18} /><div><strong>10 free minutes daily</strong><p>Pro unlocks unlimited tutoring.</p></div></div>
          <div className="tutor-mini-tip"><CircleHelp size={17} /><p>Ask a question at any time. The tutor uses the current board step as context.</p></div>
        </aside>

        <div className="tutor-main">
          <div className="whiteboard-wrap">
            <div className="whiteboard-toolbar">
              <div className="toolbar-left"><Badge tone="live"><span className="live-dot" /> LIVE LESSON</Badge><span>{lesson.title}</span></div>
              <div className="toolbar-right">
                <button className={drawing ? 'active' : ''} onClick={() => setDrawing((value) => !value)} title="Draw on board"><Pencil size={17} /></button>
                <button onClick={clearCanvas} title="Clear drawing"><Eraser size={17} /></button>
                <button onClick={speakStep} title="Read this step"><Volume2 size={17} /></button>
                <button onClick={() => { document.querySelector('.whiteboard-wrap')?.requestFullscreen?.(); toast('Whiteboard opened in fullscreen when supported.') }} title="Fullscreen"><Maximize2 size={17} /></button>
              </div>
            </div>
            <div className="whiteboard" style={{ '--lesson-color': lesson.color }}>
              <div className="board-grid" />
              <canvas ref={canvasRef} className={`drawing-canvas ${drawing ? 'active' : ''}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={pointerUp} />
              <div className="board-content">
                <div className="board-step-label"><span>STEP {step + 1}</span><i /></div>
                <h2 key={`${lesson.id}-${step}`}>{currentStep.board}</h2>
                <p>{currentStep.note}</p>
                <div className="board-doodles"><span className="doodle-one">✦</span><span className="doodle-two">∑</span><span className="doodle-three">↗</span></div>
              </div>
              {drawing && <div className="drawing-palette">{['#6c55f6', '#1dbf73', '#f59e0b', '#ef4444', '#111827'].map((item) => <button key={item} style={{ background: item }} className={color === item ? 'active' : ''} onClick={() => setColor(item)} aria-label={`Use ${item} color`} />)}<input type="range" min="2" max="10" value={brush} onChange={(event) => setBrush(Number(event.target.value))} title="Brush size" /></div>}
            </div>
            <div className="whiteboard-controls">
              <button onClick={() => { setPlaying(false); setStep((value) => Math.max(0, value - 1)) }} disabled={step === 0}><ChevronLeft size={18} /> Previous</button>
              <div className="board-step-dots">{lesson.steps.map((item, index) => <button key={item.board} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => { setStep(index); setPlaying(false) }}>{index + 1}</button>)}</div>
              <button onClick={() => { setPlaying(false); setStep((value) => Math.min(lesson.steps.length - 1, value + 1)) }} disabled={step === lesson.steps.length - 1}>Next <ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="tutor-bottom-grid">
            <div className="checkpoint-card">
              <div className="checkpoint-head"><span><CircleHelp size={18} /></span><div><small>CHECKPOINT</small><h3>Quick understanding check</h3></div></div>
              <p>{lesson.checkpoint.prompt}</p>
              <div className="checkpoint-options">{lesson.checkpoint.options.map((option, index) => <button key={option} className={`${checkpointAnswer === index ? (index === lesson.checkpoint.correctIndex ? 'correct' : 'incorrect') : ''}`} onClick={() => { setCheckpointAnswer(index); toast(index === lesson.checkpoint.correctIndex ? 'Correct! Great work.' : 'Not quite — review the board and try again.') }}>{option}{checkpointAnswer === index && index === lesson.checkpoint.correctIndex && <Check size={16} />}{checkpointAnswer === index && index !== lesson.checkpoint.correctIndex && <X size={16} />}</button>)}</div>
            </div>
            <div className="tutor-chat-card">
              <div className="tutor-chat-head"><MessageCircle size={18} /><div><small>ASK THE TUTOR</small><h3>Confused about a step?</h3></div></div>
              <div className="tutor-chat-messages">
                {chat.length === 0 ? <div className="tutor-chat-empty"><Sparkles size={20} /><p>Ask for a simpler explanation, an example, or to repeat the current step.</p></div> : chat.map((item) => <div key={item.id}><div className="chat-bubble user"><strong>You</strong><p>{item.question}</p></div><div className={`chat-bubble ai ${item.pending ? 'pending-answer' : ''}`}><strong>Solvely Tutor</strong><p>{item.answer}</p></div></div>)}
              </div>
              <form onSubmit={sendQuestion}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask a follow-up…" /><button aria-label="Send question"><Send size={17} /></button></form>
            </div>
          </div>
        </div>

        <aside className="tutor-side">
          <div className="side-card lesson-progress"><h3>Lesson progress</h3><ProgressBar value={progress} label={`${step + 1} of ${lesson.steps.length} steps`} /><div className="lesson-step-list">{lesson.steps.map((item, index) => <button key={item.board} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => { setStep(index); setPlaying(false) }}><span>{index < step ? <Check size={13} /> : index + 1}</span><div><strong>{item.board}</strong><small>{item.note}</small></div></button>)}</div></div>
          <div className="side-card voice-card"><Mic size={21} /><h3>Voice explanations</h3><p>Each board step is narrated by your browser’s speech engine. Use headphones for the best experience.</p><Button variant="outline" size="sm" className="full-width" icon={Volume2} onClick={speakStep}>Repeat current step</Button></div>
          <div className="side-card tutor-next"><BookOpen size={21} /><h3>Turn this into study notes</h3><p>Generate a connected guide, flashcards, and a quiz from this topic.</p><Link to="/study-guide"><Button size="sm" className="full-width" iconRight={ArrowRight}>Create study set</Button></Link></div>
        </aside>
      </div>
    </div>
  )
}
