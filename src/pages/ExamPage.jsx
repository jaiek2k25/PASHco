import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, FileText, Flag, GraduationCap, Layers3, NotebookPen, Play, Plus, RotateCcw, Sparkles, Target, TrendingUp, Trophy, Upload, X } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import SourceModal from '../components/SourceModal'
import { Badge, Button, Modal, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, downloadText, estimateScore, getDemoExamQuestions, safeFileName, truncate } from '../lib/intelligence'
import { aiExamPrediction } from '../lib/aiClient'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function PlanIcon({ index }) {
  const icons = [BookOpen, Layers3, ClipboardCheck, Target, Sparkles, GraduationCap, Trophy]
  const Icon = icons[index % icons.length]
  return <Icon size={18} />
}

export default function ExamPage() {
  const { currentPack, state, saveExam, saveStudySet, toast } = useApp()
  const [sourceOpen, setSourceOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [details, setDetails] = useState(() => state.exams[0]?.details || { exam: 'Biology Final', goal: '90%', date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString().slice(0, 10) })
  const [mode, setMode] = useState('overview')
  const [examType, setExamType] = useState('diagnostic')
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [flagged, setFlagged] = useState(new Set())
  const [result, setResult] = useState(state.exams[0]?.result || null)
  const [retakeOpen, setRetakeOpen] = useState(false)
  const [showPlan, setShowPlan] = useState(Boolean(state.exams[0]?.result))
  const [aiPrediction, setAiPrediction] = useState(null)

  const topics = aiPrediction?.predictedTopics?.length ? aiPrediction.predictedTopics : (currentPack.predictedTopics || [])
  const weakTopics = result?.weakTopics?.length ? result.weakTopics : (aiPrediction?.weakTopics?.length ? aiPrediction.weakTopics : topics.slice(-3).map((item) => item.topic))
  const readiness = result?.readiness || Math.round(topics.reduce((total, item) => total + item.mastery, 0) / Math.max(topics.length, 1))
  const studyPlan = useMemo(() => {
    if (aiPrediction?.reviewPlan?.length) {
      return aiPrediction.reviewPlan.slice(0, 7).map((item, index) => ({
        day: item.day || DAYS[index] || `Day ${index + 1}`,
        topic: item.topic || 'Mixed review',
        task: item.task || 'Review your notes and practice active recall.',
        minutes: item.minutes || 30,
      }))
    }
    return DAYS.map((day, index) => ({
      day,
      topic: weakTopics[index % Math.max(weakTopics.length, 1)] || 'Mixed review',
      task: [
        'Review notes and define key terms',
        'Study flashcards for 20 minutes',
        'Complete a focused practice quiz',
        'Work through two example questions',
        'Explain each topic aloud from memory',
        'Take a timed mock exam',
        'Review mistakes and rest',
      ][index],
      minutes: [35, 25, 40, 45, 30, 55, 20][index],
    }))
  }, [aiPrediction, weakTopics.join('|')])

  useEffect(() => {
    if (!state.exams[0]) return
    setDetails(state.exams[0].details || details)
    setResult(state.exams[0].result || null)
    setShowPlan(Boolean(state.exams[0].result))
  }, [state.exams])

  const startExam = (type) => {
    const sourceQuestions = type === 'diagnostic' ? getDemoExamQuestions(currentPack) : currentPack.quiz.slice(type === 'mock1' ? 0 : 3, type === 'mock1' ? 8 : 11)
    const list = sourceQuestions.length ? sourceQuestions : getDemoExamQuestions(currentPack)
    setExamType(type)
    setQuestions(list)
    setAnswers([])
    setIndex(0)
    setFlagged(new Set())
    setMode('runner')
    setTab('overview')
  }

  const submitExam = () => {
    const score = estimateScore(answers, questions)
    const examRecord = {
      id: createId('exam'),
      createdAt: new Date().toISOString(),
      type: examType,
      details,
      result: score,
      weakTopics: score.weakTopics,
      packTitle: currentPack.title,
    }
    setResult(score)
    setShowPlan(true)
    saveExam(examRecord)
    setMode('overview')
    setTab(examType === 'diagnostic' ? 'plan' : 'topics')
    toast(examType === 'diagnostic' ? 'Diagnostic complete — your study plan is ready.' : 'Mock exam submitted.')
  }

  const generateMaterials = async (pack) => {
    saveStudySet({ ...pack, id: createId('pack') })
    setSourceOpen(false)
    const prediction = await aiExamPrediction(pack.sourceText || pack.summary || '', details)
    if (prediction) {
      setAiPrediction(prediction)
      setTab('topics')
      toast('NVIDIA AI predicted your likely exam topics.')
    } else {
      toast('Materials added. Your predictions now use this study set.')
    }
  }

  const exportPlan = () => {
    const text = [`# Exam plan — ${details.exam}`, '', `Goal: ${details.goal}`, `Exam date: ${details.date}`, `Predicted score: ${result?.predictedScore || 68}%`, `Readiness: ${readiness}%`, '', '## Predicted topics', ...topics.map((item) => `- ${item.topic}: ${item.likelihood}% likelihood, ${item.mastery}% mastery`), '', '## 7-day study plan', ...studyPlan.map((item) => `- ${item.day} (${item.minutes} min): ${item.topic} — ${item.task}`), '', '## Cheat sheet', ...(currentPack.cheatSheet || [])].join('\n')
    downloadText(`${safeFileName(details.exam)}-plan.md`, text, 'text/markdown')
    toast('Exam plan downloaded.')
  }

  return (
    <div className="app-page exam-page">
      <ToolTabs />
      <PageHeader
        eyebrow="EXAM PREDICTOR"
        title="Study what matters most"
        description="Upload materials, take a diagnostic, and get a predictive score, mock exams, and a daily plan."
        actions={<><Button variant="outline" icon={Upload} onClick={() => setSourceOpen(true)}>Upload materials</Button><Button icon={Play} onClick={() => result ? setRetakeOpen(true) : startExam('diagnostic')}>{result ? 'Retake diagnostic' : 'Start my diagnostic'}</Button></>}
      />

      {mode === 'runner' ? (
        <div className="exam-runner">
          <div className="exam-runner-top"><div><Badge tone="purple">{examType === 'diagnostic' ? '10-MIN DIAGNOSTIC' : 'MOCK EXAM'}</Badge><h2>{details.exam}</h2><p>{questions.length} adaptive questions · choose the best answer</p></div><div className="exam-runner-actions"><button onClick={() => setMode('overview')}><X size={17} /> Exit</button><Button icon={Flag} onClick={submitExam}>Submit exam</Button></div></div>
          <ProgressBar value={((index + 1) / questions.length) * 100} label={`Question ${index + 1} of ${questions.length}`} />
          <div className="exam-runner-grid">
            <div className="runner-question-card">
              <div className="runner-question-head"><span>QUESTION {index + 1}</span><button className={flagged.has(index) ? 'flagged' : ''} onClick={() => setFlagged((items) => { const copy = new Set(items); copy.has(index) ? copy.delete(index) : copy.add(index); return copy })}><Flag size={16} /> {flagged.has(index) ? 'Flagged' : 'Flag'}</button></div>
              <h3>{questions[index]?.prompt}</h3>
              <div className="runner-options">{questions[index]?.options.map((option, optionIndex) => <button key={`${option}-${optionIndex}`} className={answers[index] === optionIndex ? 'selected' : ''} onClick={() => setAnswers((items) => { const copy = [...items]; copy[index] = optionIndex; return copy })}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{answers[index] === optionIndex && <Check size={17} />}</button>)}</div>
              <div className="runner-nav"><Button variant="outline" icon={ChevronLeft} onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>Previous</Button>{index === questions.length - 1 ? <Button icon={Flag} onClick={submitExam}>Submit exam</Button> : <Button iconRight={ChevronRight} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>Next question</Button>}</div>
            </div>
            <aside className="runner-side"><div className="side-card"><h3>Answer overview</h3><div className="runner-dots">{questions.map((item, itemIndex) => <button key={item.id || itemIndex} className={`${itemIndex === index ? 'current' : ''} ${answers[itemIndex] !== undefined ? 'answered' : ''} ${flagged.has(itemIndex) ? 'flagged' : ''}`} onClick={() => setIndex(itemIndex)}>{itemIndex + 1}</button>)}</div><p>{answers.filter((answer) => answer !== undefined).length} of {questions.length} answered</p></div><div className="side-card"><Clock3 size={20} /><h3>Take your time</h3><p>This short diagnostic adapts its recommendations to your answers. You can revisit any question before submitting.</p></div></aside>
          </div>
        </div>
      ) : (
        <>
          <div className="exam-overview-grid">
            <div className="exam-hero-card">
              <div className="exam-hero-icon"><GraduationCap size={26} /></div>
              <div><Badge tone="light">EXAM READINESS</Badge><h2>{details.exam}</h2><p>Goal {details.goal} · {new Date(details.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
              <div className="readiness-circle" style={{ '--readiness': `${readiness * 3.6}deg` }}><div><strong>{readiness}%</strong><span>ready</span></div></div>
            </div>
            <div className="exam-score-card"><small>PREDICTED SCORE</small><strong>{result?.predictedScore || 68}%</strong><div><TrendingUp size={16} /> {result ? 'Based on your diagnostic' : 'Take the diagnostic to personalize'}</div></div>
            <div className="exam-weak-card"><small>WEAKEST SKILLS</small><div>{weakTopics.length ? weakTopics.slice(0, 3).map((topic) => <span key={topic}>{truncate(topic, 18)}</span>) : <span>Complete diagnostic</span>}</div></div>
          </div>

          <div className="exam-details-bar">
            <label><span><GraduationCap size={16} /> Which exam?</span><input value={details.exam} onChange={(event) => setDetails((item) => ({ ...item, exam: event.target.value }))} placeholder="Biology Final" /></label>
            <label><span><Target size={16} /> Goal score</span><select value={details.goal} onChange={(event) => setDetails((item) => ({ ...item, goal: event.target.value }))}><option>70%</option><option>80%</option><option>85%</option><option>90%</option><option>95%</option></select></label>
            <label><span><CalendarDays size={16} /> Exam date</span><input type="date" value={details.date} onChange={(event) => setDetails((item) => ({ ...item, date: event.target.value }))} /></label>
            <Button variant="outline" icon={Sparkles} onClick={() => { toast('Exam details saved locally.'); if (result) setTab('plan') }}>Save details</Button>
          </div>

          <div className="exam-tab-bar">{[['overview', 'Overview'], ['mock', 'Mock exams'], ['topics', 'Predicted topics'], ['plan', 'Study plan'], ['cheat', 'Cheat sheet']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>

          <div className="exam-tab-content">
            {tab === 'overview' && (
              <div className="exam-overview-content">
                <div className="diagnostic-card"><div className="diagnostic-icon"><Sparkles size={25} /></div><div><Badge tone="purple">YOUR DIAGNOSTIC IS READY</Badge><h3>Answer 10 adaptive questions to get a predicted score and focused study plan.</h3><p>No payment required. Your answers stay in this browser.</p></div><div className="diagnostic-actions"><Button icon={Play} onClick={() => result ? setRetakeOpen(true) : startExam('diagnostic')}>{result ? 'Retake 10-min diagnostic' : 'Start 10-min diagnostic'}</Button><button onClick={() => setTab('plan')}>Edit details</button></div></div>
                <div className="exam-material-grid"><div className="side-card"><div className="side-card-head"><h3>Your materials</h3><Badge tone="gray">{currentPack.sources?.length || 1}</Badge></div><div className="material-list"><div><FileText size={17} /><div><strong>{currentPack.title}</strong><small>{currentPack.flashcards?.length || 0} cards · {currentPack.quiz?.length || 0} questions</small></div><Check size={16} /></div>{(currentPack.sources || []).slice(0, 3).map((source) => <div key={source.id}><FileText size={17} /><div><strong>{truncate(source.name, 28)}</strong><small>Added source</small></div><Check size={16} /></div>)}</div><Button variant="outline" size="sm" className="full-width" icon={Plus} onClick={() => setSourceOpen(true)}>Add more material</Button></div>
                  <div className="side-card next-step-card"><Target size={22} /><h3>What to study next</h3>{showPlan ? <><p>Start with your weakest diagnostic topics:</p><div className="weak-list">{weakTopics.slice(0, 3).map((topic, index) => <div key={topic}><span>{index + 1}</span><strong>{topic}</strong><small>{20 + index * 5} min</small></div>)}</div><Button size="sm" className="full-width" onClick={() => setTab('plan')}>Open study plan</Button></> : <><p>Complete the diagnostic to unlock a personalized 7-day review plan.</p><Button size="sm" className="full-width" onClick={() => startExam('diagnostic')}>Start diagnostic</Button></>}</div>
                </div>
              </div>
            )}

            {tab === 'mock' && (
              <div className="mock-grid">{[
                { id: 'mock1', title: 'Mock Exam 1', likelihood: '≥90% likely', description: 'The must-know questions. Nail these first.', duration: '34 mins', count: '25 Questions', tone: 'purple' },
                { id: 'mock2', title: 'Mock Exam 2', likelihood: '80–90% likely', description: 'Highly likely questions. Practice makes perfect.', duration: '42 mins', count: '25 Questions', tone: 'blue' },
              ].map((mock) => <article className={`mock-card mock-${mock.tone}`} key={mock.id}><div className="mock-card-top"><span><ClipboardCheck size={20} /></span><Badge tone={mock.tone === 'purple' ? 'green' : 'blue'}>{mock.likelihood}</Badge></div><h3>{mock.title}</h3><p>{mock.description}</p><div className="mock-meta"><span><Clock3 size={15} /> {mock.duration}</span><span><FileText size={15} /> {mock.count}</span></div><div className="mock-status"><span>Not started</span><button onClick={() => startExam(mock.id)}>Start exam <ArrowRight size={15} /></button></div></article>)}</div>
            )}

            {tab === 'topics' && (
              <div className="predicted-topics"><div className="topics-table-head"><span>Topic</span><span>Likelihood</span><span>Mastery</span><span>Action</span></div>{topics.map((item, index) => <div className="topics-table-row" key={item.topic}><div className="topic-name"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.topic}</strong></div><div><ProgressBar value={item.likelihood} tone="purple" /></div><div><ProgressBar value={item.mastery} tone={item.mastery > 65 ? 'green' : 'orange'} /></div><Link to="/quiz"><Button size="sm" variant="outline">Practice</Button></Link></div>)}</div>
            )}

            {tab === 'plan' && (
              <div className="study-plan"><div className="plan-header"><div><Badge tone="purple">7-DAY SPRINT</Badge><h2>Your personalized review plan</h2><p>Focused on {weakTopics.slice(0, 3).join(', ') || 'your weakest topics'} before {new Date(details.date).toLocaleDateString()}.</p></div><Button variant="outline" icon={Download} onClick={exportPlan}>Export plan</Button></div><div className="plan-timeline">{studyPlan.map((item, index) => <article key={item.day}><div className="plan-day"><span><PlanIcon index={index} /></span><div><strong>{item.day}</strong><small>Day {index + 1}</small></div></div><div className="plan-content"><h3>{item.topic}</h3><p>{item.task}</p></div><div className="plan-time"><Clock3 size={15} /> {item.minutes} min</div><Link to={index % 2 ? '/quiz' : '/flashcards'}><Button size="sm" variant="outline">{index % 2 ? 'Quiz' : 'Review'}</Button></Link></article>)}</div></div>
            )}

            {tab === 'cheat' && (
              <div className="exam-cheat-sheet"><div className="cheat-header"><div><Badge tone="purple">PRINTABLE SUMMARY</Badge><h2>{details.exam} cheat sheet</h2></div><Button variant="outline" icon={Download} onClick={exportPlan}>Download</Button></div><div className="cheat-sheet-grid">{(currentPack.cheatSheet || []).map((line, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{line}</p></article>)}</div></div>
            )}
          </div>
        </>
      )}

      <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generateMaterials} title="Upload exam materials" description="Add notes, past exams, and slides. Solvely will use them to build predicted topics and mock questions." cta="Analyze materials" generatedTitle={`${details.exam} materials`} />
      <Modal open={retakeOpen} onClose={() => setRetakeOpen(false)} title="Retake this diagnostic test?" subtitle="Retaking will replace your current result, answers, and score analysis." footer={<><Button variant="ghost" onClick={() => setRetakeOpen(false)}>Keep result</Button><Button onClick={() => { setRetakeOpen(false); startExam('diagnostic') }}>Retake diagnostic</Button></>}><p className="modal-hint">This action only affects the local demo workspace.</p></Modal>
    </div>
  )
}
