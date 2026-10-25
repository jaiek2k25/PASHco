import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { evaluate } from 'mathjs'
import { ArrowRight, BarChart3, BookOpen, BrainCircuit, Calculator, Camera, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Copy, FlaskConical, History, Image as ImageIcon, Link2, LoaderCircle, Mic, Paperclip, Play, Plus, RotateCcw, Search, Send, Sigma, Sparkles, TableProperties, ThumbsDown, ThumbsUp, Trash2, Upload, Volume2, WandSparkles, X } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import SolutionGraph from '../components/SolutionGraph'
import { Badge, Button, Modal, Segmented } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createFollowupAnswer, createId, extractTextFromFile, sampleProblems, truncate, wordCount } from '../lib/intelligence'
import { aiOcr, aiSolve, aiTutorAnswer, blobUrlToDataUrl, getLastAiError } from '../lib/aiClient'
import { getServiceSettings } from '../lib/serviceSettings'

const hasAiKey = () => Boolean(getServiceSettings().nvidiaApiKey)

const EXAMPLE_ICONS = { Geometry: Sigma, Algebra: BarChart3, Chemistry: FlaskConical, Accounting: TableProperties }
const MODEL_LABELS = [
  { short: 'GPT', className: 'model-gpt' },
  { short: 'G', className: 'model-google' },
  { short: 'AI', className: 'model-claude' },
  { short: 'S', className: 'model-wesolve' },
]

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function CalculatorModal({ open, onClose }) {
  const [expression, setExpression] = useState('')
  const [memory, setMemory] = useState([])
  const buttons = [
    ['sin(', 'cos(', 'tan(', '('],
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['0', '.', 'π', '+'],
    ['√(', '^', '%', '='],
  ]

  const calculate = () => {
    if (!expression.trim()) return
    try {
      const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√\(/g, 'sqrt(').replace(/%/g, '/100')
      const result = evaluate(normalized)
      const line = `${expression} = ${result}`
      setMemory((items) => [line, ...items].slice(0, 5))
      setExpression(String(result))
    } catch {
      setExpression('Error')
    }
  }

  const insert = (value) => {
    if (value === '=') return calculate()
    if (expression === 'Error') return setExpression(value)
    setExpression((current) => current + value)
  }

  return (
    <Modal open={open} onClose={onClose} title="Scientific calculator" subtitle="Build an expression, then send it to the solver." width={440}>
      <div className="calculator">
        <div className="calculator-display"><small>{memory[0] || 'Scientific mode'}</small><strong>{expression || '0'}</strong></div>
        <div className="calculator-grid">
          {buttons.flat().map((button) => <button key={button} className={button === '=' ? 'equals' : /[0-9.]/.test(button) ? 'number' : 'operation'} onClick={() => insert(button)}>{button}</button>)}
        </div>
        <div className="calculator-actions">
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setExpression('')}>Clear</Button>
          <Button size="sm" icon={ArrowRight} onClick={() => { onClose(expression); setExpression('') }}>Send to solve</Button>
        </div>
      </div>
    </Modal>
  )
}

function CropModal({ open, file, onClose, onDone }) {
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(50)
  const [offsetY, setOffsetY] = useState(50)
  const [preview, setPreview] = useState('')
  const imageRef = useRef(null)

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreview(url)
    setZoom(1)
    setOffsetX(50)
    setOffsetY(50)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const done = () => {
    const image = imageRef.current
    const canvas = document.createElement('canvas')
    const size = 640
    canvas.width = size
    canvas.height = Math.round(size * 0.72)
    if (image?.complete) {
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight * (canvas.width / canvas.height)) / zoom
      const sx = ((100 - offsetX) / 100) * Math.max(0, image.naturalWidth - sourceSize)
      const sy = ((100 - offsetY) / 100) * Math.max(0, image.naturalHeight - sourceSize / (canvas.width / canvas.height))
      ctx.drawImage(image, sx, sy, sourceSize, sourceSize / (canvas.width / canvas.height), 0, 0, canvas.width, canvas.height)
      onDone({ name: `cropped-${file.name.replace(/\.[^.]+$/, '')}.png`, url: canvas.toDataURL('image/png'), size: canvas.width * canvas.height, type: 'image/png', isImage: true, id: createId('attachment') })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Crop image" subtitle="Frame the problem you want WeSolve to solve." width={720} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={done}>Done</Button></>}>
      <div className="crop-workspace">
        <div className="crop-preview">
          {preview && <img ref={imageRef} src={preview} alt="Crop preview" style={{ transform: `scale(${zoom})`, objectPosition: `${offsetX}% ${offsetY}%` }} />}
          <div className="crop-frame" />
        </div>
        <div className="crop-controls">
          <label><span>Zoom <strong>{zoom.toFixed(1)}×</strong></span><input type="range" min="1" max="2.5" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          <label><span>Horizontal position <strong>{offsetX}%</strong></span><input type="range" min="0" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label>
          <label><span>Vertical position <strong>{offsetY}%</strong></span><input type="range" min="0" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label>
          <p><CircleHelp size={15} /> For image-only questions, type or dictate the problem after adding the image for best results.</p>
        </div>
      </div>
    </Modal>
  )
}

function AnswerSkeleton() {
  return (
    <div className="answer-skeleton">
      <div className="skeleton-line wide" /><div className="skeleton-line medium" />
      <div className="skeleton-card"><div className="skeleton-circle" /><div><div className="skeleton-line" /><div className="skeleton-line short" /></div></div>
      <div className="skeleton-line" /><div className="skeleton-line medium" /><div className="skeleton-line wide" />
    </div>
  )
}

export default function SolverPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state, canSolve, consumeSolve, setUpgradeOpen, toast } = useApp()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('solve')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('answer')
  const [attachments, setAttachments] = useState([])
  const [link, setLink] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [uploadKind, setUploadKind] = useState('file')
  const [listening, setListening] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState([])
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoStep, setVideoStep] = useState(0)
  const fileRef = useRef(null)
  const composerRef = useRef(null)

  const questionFromUrl = searchParams.get('q')
  useEffect(() => {
    if (questionFromUrl) setInput(questionFromUrl)
  }, [questionFromUrl])

  useEffect(() => {
    if (!videoPlaying || !result?.steps?.length) return undefined
    const timer = window.setInterval(() => {
      setVideoStep((step) => {
        if (step >= result.steps.length - 1) {
          setVideoPlaying(false)
          return step
        }
        return step + 1
      })
    }, 1800)
    return () => window.clearInterval(timer)
  }, [videoPlaying, result])

  const solve = async (questionText = input) => {
    const question = String(questionText || '').trim()
    if (!question && attachments.length === 0) {
      toast('Type a question or attach study material first.', 'error')
      return
    }
    if (mode === 'research') {
      navigate(`/research?q=${encodeURIComponent(question)}`)
      return
    }
    if (!canSolve()) {
      setUpgradeOpen(true)
      return
    }
    setLoading(true)
    setResult(null)
    setChat([])
    setActiveTab('answer')
    setFeedback(null)
    const [solution] = await Promise.all([
      aiSolve(question, attachments),
      new Promise((resolve) => window.setTimeout(resolve, 650)),
    ])
    setResult(solution)
    consumeSolve(solution)
    setLoading(false)
    if (solution.source === 'nvidia') {
      toast('Answer generated with NVIDIA AI.')
    } else if (hasAiKey()) {
      toast(`NVIDIA AI is unreachable, so the local engine answered. ${getLastAiError()?.message || ''}`.trim(), 'error')
    }
    window.setTimeout(() => document.querySelector('.solution-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const addFiles = async (files, shouldCrop = false) => {
    const list = Array.from(files || []).slice(0, 5)
    if (!list.length) return
    const image = shouldCrop ? list.find((file) => file.type.startsWith('image/')) : null
    if (image) setCropFile(image)
    if (image && shouldCrop) setCropOpen(true)
    const next = []
    for (const file of list) {
      if (shouldCrop && file === image) continue
      const attachment = {
        id: createId('attachment'),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        isImage: file.type.startsWith('image/'),
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      }
      next.push(attachment)
      if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
        try {
          const text = await extractTextFromFile(file)
          attachment.textContent = text.slice(0, 12000)
          setInput((current) => `${current}${current ? '\n' : ''}${text.slice(0, 3000)}`)
          toast(`${file.name} text added to the composer.`)
        } catch {
          toast(`Could not read ${file.name}.`, 'error')
        }
      }
    }
    if (next.length) {
      setAttachments((current) => [...current, ...next])
      next.filter((attachment) => attachment.isImage).forEach(extractImageText)
    }
  }

  const openPicker = (kind) => {
    setUploadKind(kind)
    window.setTimeout(() => fileRef.current?.click(), 0)
  }

  const extractImageText = async (attachment) => {
    try {
      const dataUrl = attachment.url?.startsWith('data:image/') ? attachment.url : await blobUrlToDataUrl(attachment.url)
      if (!dataUrl || dataUrl.length > 9 * 1024 * 1024) return
      const text = await aiOcr(dataUrl)
      if (text) {
        attachment.textContent = text
        setInput((current) => `${current}${current ? '\n\n' : ''}${text}`.slice(0, 12000))
        toast('Image text extracted with NVIDIA vision AI.')
      }
    } catch {
      // OCR remains optional; the local solver can still use typed text.
    }
  }

  const addCropped = (attachment) => {
    setAttachments((current) => [...current, attachment])
    toast('Cropped image added to your question.')
    extractImageText(attachment)
  }

  const addLink = () => {
    if (!link.trim()) return
    const url = link.trim()
    setAttachments((current) => [...current, { id: createId('attachment'), name: url.replace(/^https?:\/\//, '').slice(0, 45), size: 0, type: 'link', url, isImage: false, isLink: true }])
    setLink('')
    setLinkOpen(false)
    toast('Link added as a source.')
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast('Voice input is not supported in this browser. Try Chrome or Edge.', 'error')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); toast('Microphone access was unavailable.', 'error') }
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput((current) => `${current}${current ? ' ' : ''}${transcript}`)
      toast('Voice input added.')
    }
    recognition.start()
  }

  const askFollowup = async (text = chatInput) => {
    const question = text.trim()
    if (!question || !result) return
    setChatInput('')
    const pendingId = createId('chat')
    setChat((items) => [...items, { id: pendingId, question, answer: 'Thinking with NVIDIA AI…', pending: true }])
    const aiAnswer = await aiTutorAnswer(question, {
      lesson: result.subject,
      finalAnswer: result.finalAnswer,
      subject: result.subject,
      board: result.steps.map((step) => step.title).join(' → '),
    })
    const answer = aiAnswer || createFollowupAnswer(question, result)
    setChat((items) => items.map((item) => item.id === pendingId ? { ...item, answer, pending: false } : item))
  }

  const copySolution = async () => {
    if (!result) return
    const content = `${result.question}\n\nFinal answer: ${result.finalAnswer}\n\n${result.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.body}`).join('\n')}`
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      toast('Solution copied to clipboard.')
    } catch {
      toast('Clipboard access was blocked.', 'error')
    }
  }

  const openHistoryItem = (item) => {
    setResult(item)
    setInput(item.question)
    setChat([])
    setActiveTab('answer')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setResult(null)
    setInput('')
    setAttachments([])
    setChat([])
    setActiveTab('answer')
    setVideoPlaying(false)
    setVideoStep(0)
  }

  const accepted = useMemo(() => uploadKind === 'images' ? 'image/*' : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,image/*', [uploadKind])

  return (
    <div className="solver-page app-page">
      <ToolTabs />
      <input ref={fileRef} type="file" hidden multiple accept={accepted} onChange={(event) => { addFiles(event.target.files, uploadKind === 'images'); event.target.value = '' }} />

      {!result && !loading && (
        <div className="solver-home">
          <div className="solver-hero">
            <div className="solver-avatar"><Sparkles size={20} /></div>
            <div className="solver-title-pill"><Sparkles size={14} /> WeSolve AI</div>
            <h1>What can I help you solve today?</h1>
            <p>Ask any question, upload a photo, paste a link, or explore what your study workspace can do.</p>
          </div>

          <div className="composer-wrap" ref={composerRef}>
            <div className="composer-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files, false) }}>
              <div className="composer-mode-row">
                <Segmented
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[{ value: 'solve', label: 'AI Solver', icon: Sparkles }, { value: 'research', label: 'AI Research', icon: Search }]}
                />
                <span className="word-count">{wordCount(input)} words</span>
              </div>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={mode === 'solve' ? 'Type your homework question here…  e.g. Solve 3x + 6 = 42' : 'Enter a research topic, assignment, or question…'} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) solve() }} />
              {attachments.length > 0 && (
                <div className="attachment-list">
                  {attachments.map((attachment) => (
                    <div className="attachment-chip" key={attachment.id}>
                      {attachment.isImage ? <img src={attachment.url} alt="" /> : attachment.isLink ? <Link2 size={16} /> : <Paperclip size={16} />}
                      <div><strong>{truncate(attachment.name, 26)}</strong><small>{attachment.isLink ? 'Web source' : formatSize(attachment.size)}</small></div>
                      <button onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))} aria-label="Remove attachment"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="composer-bottom">
                <div className="composer-tools">
                  <button onClick={() => openPicker('file')}><Upload size={17} /><span>Upload file</span></button>
                  <button onClick={() => openPicker('images')}><ImageIcon size={17} /><span>Upload images</span></button>
                  <button onClick={() => setLinkOpen(true)}><Link2 size={17} /><span>Paste link</span></button>
                  <button onClick={() => setCalculatorOpen(true)}><Calculator size={17} /><span>Calculator</span></button>
                </div>
                <div className="composer-submit">
                  <button className={`voice-button ${listening ? 'listening' : ''}`} onClick={startVoice} title="Voice input"><Mic size={18} /></button>
                  <Button onClick={() => solve()} disabled={loading} icon={mode === 'solve' ? Sparkles : Search}>{mode === 'solve' ? 'Solve' : 'Search'}</Button>
                </div>
              </div>
              {listening && <div className="listening-banner"><span className="pulse-dot" /> Listening… speak your question clearly.</div>}
            </div>
            <div className="composer-footnote"><ShieldCheckMini /> Free plan: {Math.max(0, 2 - state.solvesUsed)} of 2 solves remaining · <button onClick={() => setUpgradeOpen(true)}>Get unlimited</button></div>
          </div>

          <div className="quick-prompt-row">
            <button onClick={() => solve('Solve for x: 3x + 6 = 42')}><Sigma size={16} /> Solve a linear equation</button>
            <button onClick={() => solve('What is photosynthesis?')}><FlaskConical size={16} /> Explain photosynthesis</button>
            <button onClick={() => solve('Find the mean, median and standard deviation of 4, 8, 6, 5, 3, 7')}><BarChart3 size={16} /> Analyze a data set</button>
            <button onClick={() => solve('Find the derivative of 4x^3 - 3x^2 + 2')}><WandSparkles size={16} /> Differentiate a function</button>
          </div>

          <div className="accuracy-banner">
            <div className="model-stack">{MODEL_LABELS.map((model) => <span key={model.short} className={model.className}>{model.short}</span>)}</div>
            <div><strong>Cross-check across AI models for highest accuracy</strong><p>Every answer is normalized, solved symbolically, and verified numerically.</p></div>
            <Badge tone="green">3 independent checks</Badge>
          </div>

          <section className="examples-section">
            <div className="section-heading inline"><div><div className="section-kicker">EXPLORE</div><h2>Solver examples</h2><p>See how WeSolve handles different subjects and answer formats.</p></div><Link to="/history">View history <ArrowRight size={15} /></Link></div>
            <div className="examples-grid">
              {sampleProblems.map((problem) => {
                const Icon = EXAMPLE_ICONS[problem.category] || Sparkles
                return (
                  <button className={`example-card example-${problem.id}`} key={problem.id} onClick={() => solve(problem.prompt)}>
                    <div className="example-visual">
                      <span className="example-icon"><Icon size={20} /></span>
                      <strong>{problem.expression}</strong>
                      <small>{problem.label}</small>
                    </div>
                    <div className="example-copy"><span>{problem.category}</span><h3>{problem.title}</h3><p>{truncate(problem.prompt, 78)}</p><div>Try this example <ChevronRight size={15} /></div></div>
                  </button>
                )
              })}
            </div>
          </section>

          {state.history.length > 0 && (
            <section className="recent-section">
              <div className="section-heading inline"><div><h2>Recent questions</h2><p>Pick up where you left off.</p></div><Link to="/history">See all <ArrowRight size={15} /></Link></div>
              <div className="recent-list">{state.history.slice(0, 4).map((item) => <button key={item.id} onClick={() => openHistoryItem(item)}><span><History size={17} /></span><div><strong>{truncate(item.question, 80)}</strong><small>{item.subject} · {item.finalAnswer}</small></div><ChevronRight size={17} /></button>)}</div>
            </section>
          )}
        </div>
      )}

      {loading && (
        <div className="solver-loading"><div className="loading-header"><LoaderCircle className="spin" size={18} /><span>WeSolve is reading your question…</span></div><AnswerSkeleton /></div>
      )}

      {result && !loading && (
        <div className="solution-layout">
          <div className="solution-panel">
            <div className="solution-topbar">
              <div className="solution-question"><span className="solution-avatar"><Sparkles size={17} /></span><div><small>Your question · {result.subject} {result.source === 'nvidia' && <Badge tone="green" className="inline-badge">NVIDIA AI</Badge>}</small><h2>{result.question}</h2></div></div>
              <div className="solution-actions"><Button variant="ghost" size="sm" icon={Plus} onClick={reset}>New question</Button><button className="icon-button" onClick={copySolution} title="Copy solution">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
            </div>

            {result.attachments?.length > 0 && <div className="solution-attachments">{result.attachments.map((item) => <span key={item.id}><Paperclip size={14} />{truncate(item.name, 30)}</span>)}</div>}

            <button className="thought-bar"><span><CheckCircle2 size={16} /> Thought for 1s</span><span>See all <ChevronRight size={15} /></span></button>

            <div className="check-strip">
              <div className="check-orbit-mini">{MODEL_LABELS.slice(0, 4).map((model) => <span key={model.short} className={model.className}>{model.short}</span>)}</div>
              <div><strong>{result.checks.filter((check) => check.passed).length} checks agree on this answer</strong><p>Cross-checked by symbolic, numeric, and contextual reasoning.</p></div>
              <Badge tone="green">{result.confidence}% confidence</Badge>
            </div>

            <div className="solution-tabs">
              {[
                ['answer', 'Answer'],
                ['steps', 'Solving steps'],
                ['video', 'Video'],
                ['graph', 'Visual'],
              ].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
            </div>

            <div className="solution-content">
              {activeTab === 'answer' && (
                <>
                  <div className="final-answer"><div className="final-label">FINAL ANSWER <button onClick={copySolution}><Copy size={15} /></button></div><strong>{result.finalAnswer}</strong><p>{result.answerText}</p></div>
                  <div className="helpfulness-card"><div><span>Hold on a second 👋</span><strong>Was the solution helpful?</strong></div><div className="feedback-actions"><button className={feedback === 'yes' ? 'active yes' : ''} onClick={() => { setFeedback('yes'); toast('Thanks for your feedback!') }}><ThumbsUp size={19} /><small>YES</small></button><button className={feedback === 'no' ? 'active no' : ''} onClick={() => { setFeedback('no'); toast('We’ll keep improving this explanation.') }}><ThumbsDown size={19} /><small>NO</small></button></div></div>
                  <div className="answer-short-steps"><div className="section-label"><span>Solving steps</span><button onClick={() => setActiveTab('steps')}>See all <ArrowRight size={14} /></button></div>{result.steps.slice(0, 2).map((step, index) => <div className="short-step" key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.body}</p></div></div>)}</div>
                </>
              )}

              {activeTab === 'steps' && (
                <div className="steps-list">
                  {result.steps.map((step, index) => <article className="step-card" key={step.title}><div className="step-number">STEP {index + 1}</div><h3>{step.title}</h3><p>{step.body}</p>{step.math && <code>{step.math}</code>}</article>)}
                  <div className="verification-box"><CheckCircle2 size={20} /><div><strong>Verification complete</strong><p>{result.checks.map((check) => check.label).join(' · ')}</p></div></div>
                </div>
              )}

              {activeTab === 'video' && (
                <div className="video-explanation">
                  <div className="video-stage">
                    <div className="video-grid" />
                    <div className="video-equation">{result.finalAnswer}</div>
                    <div className="video-step-card"><small>STEP {videoStep + 1} OF {result.steps.length}</small><h3>{result.steps[videoStep]?.title}</h3><p>{result.steps[videoStep]?.body}</p></div>
                    <button className="video-play" onClick={() => setVideoPlaying((playing) => !playing)}>{videoPlaying ? 'Ⅱ' : <Play size={22} fill="currentColor" />}</button>
                  </div>
                  <div className="video-timeline">{result.steps.map((step, index) => <button key={step.title} className={index === videoStep ? 'active' : index < videoStep ? 'done' : ''} onClick={() => { setVideoStep(index); setVideoPlaying(false) }}><i />{step.title}</button>)}</div>
                </div>
              )}

              {activeTab === 'graph' && <SolutionGraph graph={result.graph} />}
            </div>

            <div className="followups">
              <div className="section-label"><span><Sparkles size={15} /> Recommended follow-ups</span></div>
              <div className="followup-suggestions">{result.followups.map((followup) => <button key={followup} onClick={() => askFollowup(followup)}>{followup}<ChevronRight size={15} /></button>)}</div>
              {chat.map((message) => <div className="chat-thread" key={message.id}><div className="chat-user"><span>You</span><p>{message.question}</p></div><div className={`chat-ai ${message.pending ? 'pending-answer' : ''}`}><span><Sparkles size={13} /> WeSolve</span><p>{message.answer}</p><button onClick={() => { if (window.speechSynthesis) { const utterance = new SpeechSynthesisUtterance(message.answer); window.speechSynthesis.speak(utterance) } }}><Volume2 size={14} /> Read aloud</button></div></div>)}
              <form className="followup-input" onSubmit={(event) => { event.preventDefault(); askFollowup() }}><button type="button" onClick={() => toast('Attachments are available on the new question screen.')}><Plus size={18} /></button><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask follow-up…" /><button type="submit" aria-label="Send follow-up"><Send size={17} /></button></form>
            </div>
          </div>

          <aside className="solution-sidebar">
            <div className="side-card tools-card"><h3>Continue learning</h3><Link to="/tutor"><span><BrainCircuit size={17} /></span><div><strong>Whiteboard Tutor</strong><small>Get this explained step by step</small></div><ChevronRight size={16} /></Link><Link to="/flashcards"><span><BookOpen size={17} /></span><div><strong>Make flashcards</strong><small>Turn this topic into a deck</small></div><ChevronRight size={16} /></Link><Link to="/quiz"><span><CheckCircle2 size={17} /></span><div><strong>Take a quiz</strong><small>Test your understanding</small></div><ChevronRight size={16} /></Link></div>
            <div className="side-card checks-card"><h3>Accuracy checks</h3>{result.checks.map((check) => <div key={check.label}><span className={check.passed ? 'passed' : 'review'}>{check.passed ? <Check size={13} /> : <CircleHelp size={13} />}</span><div><strong>{check.label}</strong><small>{check.model}</small></div></div>)}</div>
            <div className="side-card tip-card"><Sparkles size={20} /><h3>Study tip</h3><p>Try to predict the next step before revealing it. Active recall makes the explanation stick.</p></div>
          </aside>
        </div>
      )}

      <CalculatorModal open={calculatorOpen} onClose={(expression) => { setCalculatorOpen(false); if (typeof expression === 'string' && expression) { setInput(expression); toast('Calculator expression added.') } }} />
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Add link" subtitle="Public webpages and document links are supported." footer={<><Button variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button><Button onClick={addLink}>Add link</Button></>}>
        <label className="field-label"><span>Paste a URL</span><div className="input-with-icon"><Link2 size={17} /><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://example.com/lecture-notes" /></div></label>
        <p className="modal-hint">Use links as context for research and study guides. This demo stores sources in your browser.</p>
      </Modal>
      <CropModal open={cropOpen} file={cropFile} onClose={() => setCropOpen(false)} onDone={addCropped} />
    </div>
  )
}

function ShieldCheckMini() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" stroke="currentColor" strokeWidth="2" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
