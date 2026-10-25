import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCheck, Clock3, Download, FileText, Layers3, Mic, MicOff, Pause, Play, RotateCcw, Save, Sparkles, Square, Volume2 } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import { Badge, Button, EmptyState } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, downloadText, generateStudyPack, safeFileName, wordCount } from '../lib/intelligence'
import { aiFallbackReason, aiNotes } from '../lib/aiClient'

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export default function NotesPage() {
  const navigate = useNavigate()
  const { state, saveNote, saveStudySet, toast } = useApp()
  const [course, setCourse] = useState('BIO 101 — Cell biology')
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [note, setNote] = useState(null)
  const [generatingNotes, setGeneratingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState('notes')
  const recorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const finalTextRef = useRef('')

  useEffect(() => () => {
    recognitionRef.current?.stop?.()
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    if (!recording || paused) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording, paused])

  const startRecording = async () => {
    finalTextRef.current = transcript.trim()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    try {
      if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const recorder = new MediaRecorder(stream)
        chunksRef.current = []
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
        recorder.start()
        recorderRef.current = recorder
      }
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = (event) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const text = event.results[i][0].transcript
            if (event.results[i].isFinal) finalTextRef.current = `${finalTextRef.current} ${text}`.trim()
            else interim += text
          }
          setTranscript(`${finalTextRef.current}${interim ? ` ${interim}` : ''}`.trim())
        }
        recognition.onerror = () => toast('Live transcription paused. You can still paste a transcript.', 'error')
        recognition.start()
        recognitionRef.current = recognition
      } else {
        toast('Live transcription is not supported here. Paste your transcript after recording.', 'error')
      }
      setSeconds(0)
      setPaused(false)
      setRecording(true)
    } catch {
      toast('Microphone permission was denied. Paste a transcript to continue.', 'error')
    }
  }

  const stopRecording = () => {
    setRecording(false)
    setPaused(false)
    recognitionRef.current?.stop?.()
    recognitionRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (transcript.trim()) toast('Recording stopped. Transcript is ready.')
  }

  const generateNotes = async () => {
    if (!transcript.trim()) {
      toast('Record or paste a transcript first.', 'error')
      return
    }
    setGeneratingNotes(true)
    const summary = await aiNotes(transcript, course || 'Untitled lecture')
    summary.duration = seconds
    setNote(summary)
    saveNote(summary)
    setActiveTab('notes')
    setGeneratingNotes(false)
    toast(summary.source === 'nvidia'
      ? 'Notes generated with AI and saved.'
      : `Notes built by the offline engine. ${aiFallbackReason()}`,
    summary.source === 'nvidia' ? 'success' : 'error')
  }

  const createStudySet = (destination) => {
    if (!transcript.trim()) {
      toast('Add a transcript first.', 'error')
      return
    }
    const pack = generateStudyPack(transcript, `${course || 'Lecture'} study set`)
    saveStudySet({ ...pack, id: createId('pack') })
    navigate(destination === 'quiz' ? '/quiz' : '/flashcards')
  }

  const noteText = note ? [
    `# ${note.course} — AI notes`,
    '',
    '## Summary', note.summary,
    '',
    '## Key points', ...note.keyPoints.map((point) => `- ${point}`),
    '',
    '## Keywords', note.keywords.join(', '),
    '',
    '## Action items', ...note.actionItems.map((item) => `- ${item}`),
    '',
    '## Transcript', note.transcript,
  ].join('\n') : ''

  return (
    <div className="app-page notes-page">
      <ToolTabs />
      <PageHeader
        eyebrow="AI LIVE NOTES"
        title="When the lecture moves too fast, we keep up"
        description="Record a lecture, review a live transcript, and turn it into structured notes and study sets."
        actions={<Button variant="outline" icon={RotateCcw} onClick={() => { setTranscript(''); setNote(null); setSeconds(0); finalTextRef.current = '' }}>New session</Button>}
      />

      <div className="notes-layout">
        <div className="notes-main">
          <div className="recorder-card">
            <div className="recorder-head"><div><Badge tone={recording ? 'live' : 'gray'}>{recording ? <><span className="live-dot" /> LIVE</> : 'READY'}</Badge><h2>{course || 'Untitled lecture'}</h2></div><div className="recorder-time"><Clock3 size={17} /> {formatTime(seconds)}</div></div>
            <label className="course-input"><span>Course</span><input value={course} onChange={(event) => setCourse(event.target.value)} placeholder="BIO 101 — Cell biology" /></label>
            <div className={`recorder-wave ${recording && !paused ? 'active' : ''}`}>{Array.from({ length: 64 }).map((_, index) => <i key={index} style={{ '--height': `${18 + ((index * 37) % 72)}%`, '--delay': `${(index % 12) * -0.12}s` }} />)}</div>
            <div className="recorder-controls">
              {!recording ? <Button size="lg" icon={Mic} onClick={startRecording}>Start recording</Button> : <><Button variant="outline" icon={paused ? Play : Pause} onClick={() => { setPaused((value) => !value); if (paused) recognitionRef.current?.start?.(); else recognitionRef.current?.stop?.() }}>{paused ? 'Resume' : 'Pause'}</Button><Button variant="danger" icon={Square} onClick={stopRecording}>Stop recording</Button></>}
              <Button variant="outline" icon={Sparkles} onClick={generateNotes} disabled={!transcript.trim() || generatingNotes}>{generatingNotes ? 'Generating…' : 'Generate notes'}</Button>
            </div>
            <p className="recorder-note">Live transcription uses your browser’s Speech Recognition API. Audio stays on this device in this demo.</p>
          </div>

          <div className="transcript-card">
            <div className="transcript-head"><div><h3>Live transcript</h3><p>{wordCount(transcript)} words · edit any recognition mistakes before generating notes.</p></div><Badge tone="purple">Auto-save</Badge></div>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={recording ? 'Listening… your lecture transcript will appear here.' : 'Paste a lecture transcript here, or start recording above.'} rows="9" />
            {transcript && <div className="transcript-actions"><Button variant="outline" size="sm" icon={Layers3} onClick={() => createStudySet('flashcards')}>Make flashcards</Button><Button variant="outline" size="sm" icon={ClipboardCheck} onClick={() => createStudySet('quiz')}>Make quiz</Button><Button size="sm" icon={Sparkles} onClick={generateNotes} disabled={generatingNotes}>{generatingNotes ? 'Generating…' : 'Generate AI notes'}</Button></div>}
          </div>

          {note && (
            <div className="generated-notes">
              <div className="generated-notes-tabs">{[['notes', 'Structured notes'], ['summary', 'Summary'], ['transcript', 'Transcript']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</div>
              {activeTab === 'notes' && <div className="notes-output"><div className="notes-output-head"><div><Badge tone="green"><Check size={13} /> Notes ready</Badge><h2>{note.course}</h2></div><Button variant="outline" size="sm" icon={Download} onClick={() => downloadText(`${safeFileName(note.course)}-notes.md`, noteText, 'text/markdown')}>Export</Button></div><div className="key-points"><h3>Key points</h3>{note.keyPoints.map((point, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{point}</p></div>)}</div><div className="note-keywords"><h3>Keywords</h3>{note.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><div className="action-items"><h3>What to do next</h3>{note.actionItems.map((item) => <div key={item}><Check size={15} />{item}</div>)}</div></div>}
              {activeTab === 'summary' && <div className="notes-summary-output"><h3>Summary</h3><p>{note.summary}</p><button onClick={() => { if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(note.summary)) }}><Volume2 size={17} /> Listen to summary</button></div>}
              {activeTab === 'transcript' && <div className="notes-transcript-output"><h3>Full transcript</h3><p>{note.transcript}</p></div>}
            </div>
          )}
        </div>

        <aside className="notes-side">
          <div className="side-card save-notes-card"><Save size={21} /><h3>Recent notes</h3>{state.notes.length ? state.notes.slice(0, 5).map((item) => <button key={item.id} onClick={() => { setNote(item); setTranscript(item.transcript); setCourse(item.course) }}><FileText size={16} /><div><strong>{item.course}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><ChevronRight size={15} /></button>) : <p>Your generated lecture notes will appear here.</p>}</div>
          <div className="side-card lecture-tips"><Sparkles size={21} /><h3>Capture better lectures</h3><ul><li>Place your device close to the speaker.</li><li>Add headings to the transcript while recording.</li><li>Generate notes immediately after class.</li><li>Turn key points into flashcards.</li></ul></div>
          <div className="side-card lecture-tools"><h3>One-click study sets</h3><button onClick={() => createStudySet('flashcards')}><span><Layers3 size={17} /></span><div><strong>Flashcards</strong><small>Terms & definitions</small></div><ArrowRight size={15} /></button><button onClick={() => createStudySet('quiz')}><span><ClipboardCheck size={17} /></span><div><strong>Quiz</strong><small>Practice questions</small></div><ArrowRight size={15} /></button><button onClick={() => navigate('/study-guide')}><span><BookOpen size={17} /></span><div><strong>Study guide</strong><small>Structured review</small></div><ArrowRight size={15} /></button></div>
        </aside>
      </div>
    </div>
  )
}
