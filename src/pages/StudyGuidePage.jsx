import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BrainCircuit, CheckCircle2, ClipboardCheck, Clock3, Download, FileText, GraduationCap, Layers3, MoreHorizontal, NotebookPen, Plus, Printer, Search, Sparkles, Trash2, Volume2 } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import SourceModal from '../components/SourceModal'
import { Badge, Button, EmptyState, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, downloadText, safeFileName, truncate } from '../lib/intelligence'

const QUICK_TOOLS = [
  { to: '/flashcards', icon: Layers3, title: 'Flashcard', description: 'Flip to memorize', tone: 'purple' },
  { to: '/quiz', icon: ClipboardCheck, title: 'Quiz', description: 'Practice makes perfect', tone: 'blue' },
  { to: '/home', icon: Sparkles, title: 'AI Solver', description: 'Step-by-step explanation', tone: 'green' },
  { to: '/study-guide', icon: BookOpen, title: 'Study guide', description: 'Summarize with clarity', tone: 'orange' },
  { to: '/exam', icon: GraduationCap, title: 'Exam predictor', description: 'Study what matters', tone: 'pink' },
  { to: '/study-guide?view=cheat', icon: NotebookPen, title: 'Cheat sheet', description: 'Crack the exam', tone: 'yellow' },
]

export default function StudyGuidePage() {
  const { state, currentPack, saveStudySet, setCurrentPack, deleteStudySet, toast } = useApp()
  const [sourceOpen, setSourceOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [reading, setReading] = useState(false)
  const [menu, setMenu] = useState(null)

  useEffect(() => {
    if (window.location.search.includes('view=cheat')) setTab('cheat')
  }, [])

  const guide = currentPack.guide || { title: currentPack.title, summary: '', topics: [], keyTerms: [], reviewQuestions: [], examples: [] }
  const packText = [
    `# ${guide.title}`,
    '',
    '## Summary',
    guide.summary,
    '',
    '## Topics',
    ...guide.topics.flatMap((topic) => [`### ${topic.name}`, ...topic.bullets.map((bullet) => `- ${bullet}`), '']),
    '## Key terms',
    ...guide.keyTerms.map((item) => `- **${item.term}**: ${item.definition}`),
    '',
    '## Review questions',
    ...guide.reviewQuestions.map((question, index) => `${index + 1}. ${question}`),
    '',
    '## Cheat sheet',
    ...(currentPack.cheatSheet || []).map((line) => `- ${line}`),
  ].join('\n')

  const readAloud = () => {
    if (!window.speechSynthesis) {
      toast('Speech synthesis is not available in this browser.', 'error')
      return
    }
    window.speechSynthesis.cancel()
    if (reading) {
      setReading(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(`${guide.title}. ${guide.summary}. ${guide.topics.map((topic) => `${topic.name}. ${topic.bullets.join('. ')}`).join('. ')}`)
    utterance.rate = 0.95
    utterance.onend = () => setReading(false)
    setReading(true)
    window.speechSynthesis.speak(utterance)
  }

  const generate = (pack) => {
    saveStudySet({ ...pack, id: createId('pack') })
    setSourceOpen(false)
    setTab('overview')
  }

  return (
    <div className="app-page study-guide-page">
      <ToolTabs />
      <div className="study-banner">
        <div className="study-banner-copy"><Badge tone="light"><Sparkles size={13} /> AI Study</Badge><h1>Ace your exams in less time</h1><p>Turn your study materials into an exam prep bundle.</p><Button variant="light" icon={Plus} onClick={() => setSourceOpen(true)}>Create new</Button></div>
        <div className="study-banner-art"><div className="banner-paper one"><span /><span /><span /></div><div className="banner-paper two"><Layers3 size={22} /></div><div className="banner-paper three"><ClipboardCheck size={20} /></div></div>
      </div>

      <section className="quick-tools-section">
        <div className="section-heading inline"><div><h2>Quick tools</h2><p>Everything you need from one set of notes.</p></div></div>
        <div className="quick-tools-grid">{QUICK_TOOLS.map((tool) => <Link to={tool.to} key={tool.title} className={`quick-tool quick-${tool.tone}`}><span><tool.icon size={21} /></span><div><strong>{tool.title}</strong><small>{tool.description}</small></div><ArrowRight size={16} /></Link>)}</div>
      </section>

      <section className="study-set-section">
        <div className="section-heading inline"><div><h2>Recent study sets</h2><p>Your generated materials are stored locally in this browser.</p></div><Button variant="outline" icon={Plus} onClick={() => setSourceOpen(true)}>New study set</Button></div>
        <div className="study-set-grid">{state.studySets.map((pack) => <div className={`study-set-card ${pack.id === currentPack.id ? 'active' : ''}`} key={pack.id} role="button" tabIndex={0} onClick={() => setCurrentPack(pack.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setCurrentPack(pack.id) }}><div className="set-card-icon"><BookOpen size={20} /></div><div className="set-card-top"><strong>{truncate(pack.title, 34)}</strong><span className="set-menu-wrap" onClick={(event) => event.stopPropagation()}><button onClick={() => setMenu(menu === pack.id ? null : pack.id)}><MoreHorizontal size={18} /></button>{menu === pack.id && <span className="set-menu"><button onClick={() => { setCurrentPack(pack.id); setMenu(null) }}>Open</button><button onClick={() => { deleteStudySet(pack.id); setMenu(null) }}><Trash2 size={13} /> Delete</button></span>}</span></div><p>{truncate(pack.summary || pack.guide?.summary || 'Generated from your materials.', 92)}</p><div className="set-card-meta"><span><Layers3 size={14} /> {pack.flashcards?.length || 0} cards</span><span><ClipboardCheck size={14} /> {pack.quiz?.length || 0} questions</span></div><small>{new Date(pack.createdAt).toLocaleDateString()}</small></div>)}</div>
      </section>

      <section className="guide-content-section">
        <PageHeader
          eyebrow="STUDY GUIDE"
          title={guide.title}
          description={guide.summary}
          actions={<><Button variant="outline" icon={reading ? Sparkles : Volume2} onClick={readAloud}>{reading ? 'Stop voice' : 'Listen'}</Button><Button variant="outline" icon={Download} onClick={() => { downloadText(`${safeFileName(guide.title)}-study-guide.md`, packText, 'text/markdown'); toast('Study guide downloaded.') }}>Export</Button><Button variant="outline" icon={Printer} onClick={() => window.print()}>Print</Button></>}
        />
        <div className="guide-tabs-bar">{[
          ['overview', 'Overview'],
          ['topics', 'Topic breakdown'],
          ['terms', 'Key terms'],
          ['questions', 'Review questions'],
          ['cheat', 'Cheat sheet'],
        ].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>

        <div className="guide-tab-content">
          {tab === 'overview' && (
            <div className="guide-overview-grid">
              <article className="guide-main-card"><div className="guide-card-label"><Sparkles size={17} /> Summary</div><h2>What this guide covers</h2><p>{guide.summary}</p><div className="guide-example-list"><h3>Important source ideas</h3>{guide.examples.map((example, index) => <div key={index}><span>{index + 1}</span><p>{example}</p></div>)}</div></article>
              <aside className="guide-side-stack"><div className="side-card"><h3>Readiness</h3><ProgressBar value={Math.round(guide.topics.reduce((total, topic) => total + topic.mastery, 0) / Math.max(guide.topics.length, 1))} label="Guide mastery" tone="purple" /><p className="side-note">Review the lowest-confidence topics first.</p></div><div className="side-card linked-actions"><h3>Keep studying</h3><Link to="/flashcards"><Layers3 size={17} /> Open flashcards <ArrowRight size={15} /></Link><Link to="/quiz"><ClipboardCheck size={17} /> Take the quiz <ArrowRight size={15} /></Link><Link to="/tutor"><BrainCircuit size={17} /> Ask the tutor <ArrowRight size={15} /></Link></div></aside>
            </div>
          )}

          {tab === 'topics' && <div className="topic-grid">{guide.topics.map((topic, index) => <article className="topic-card" key={topic.name}><div className="topic-card-top"><span>0{index + 1}</span><ProgressBar value={topic.mastery} tone={topic.mastery > 65 ? 'green' : 'orange'} /></div><h3>{topic.name}</h3><ul>{topic.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><div className="topic-card-foot"><span>{topic.mastery}% mastery</span><Link to="/quiz">Practice <ArrowRight size={14} /></Link></div></article>)}</div>}

          {tab === 'terms' && <div className="terms-list">{guide.keyTerms.map((item, index) => <article key={`${item.term}-${index}`}><div className="term-index">{String(index + 1).padStart(2, '0')}</div><div><h3>{item.term}</h3><p>{item.definition}</p></div><button onClick={() => { if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${item.term}. ${item.definition}`)) }}><Volume2 size={17} /></button></article>)}</div>}

          {tab === 'questions' && <div className="review-question-list">{guide.reviewQuestions.map((question, index) => <article key={question}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{question}</h3><p>Jot down your answer before checking the source. Explaining the idea aloud makes the retrieval stronger.</p></div><Link to="/quiz"><Button size="sm" variant="outline">Practice</Button></Link></article>)}</div>}

          {tab === 'cheat' && (
            <div className="cheat-sheet-print"><div className="cheat-header"><div><Badge tone="purple">One-page review</Badge><h2>{guide.title} — cheat sheet</h2></div><Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>Print</Button></div><div className="cheat-sheet-grid">{(currentPack.cheatSheet || []).map((item, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></article>)}</div><div className="cheat-formulas"><h3>Study checklist</h3><div><CheckCircle2 size={16} /> Define every key term without notes</div><div><CheckCircle2 size={16} /> Explain each topic in two sentences</div><div><CheckCircle2 size={16} /> Complete the linked quiz and review mistakes</div></div></div>
          )}
        </div>
      </section>

      <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generate} title="Create a new study set" cta="Generate study bundle" generatedTitle="My study set" />
    </div>
  )
}
