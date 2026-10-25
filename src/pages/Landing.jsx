import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, BrainCircuit, Calculator, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CirclePlay, ClipboardCheck, Clock3, CloudUpload, Code2, FlaskConical, Globe2, GraduationCap, KeyRound, Layers3, Lightbulb, Menu, Mic2, NotebookPen, Play, Search, ShieldCheck, Sigma, Sparkles, Star, Target, TrendingUp, Upload, Users, WandSparkles, X, Zap } from 'lucide-react'
import { Brand, BrandMark } from '../components/Brand'
import { Badge, Button } from '../components/Common'
import { useApp } from '../context/AppContext'

const HERO_SLIDES = [
  { id: 'notes', tag: 'FOR CLASS', title: 'AI Notes', description: 'Turn live lectures into transcripts and structured notes', icon: Mic2 },
  { id: 'guide', tag: 'FOR STUDY', title: 'Study Guide', description: 'From dense study materials to clear, topic-by-topic walkthroughs', icon: BookOpen },
  { id: 'solver', tag: 'FOR HOMEWORK', title: 'Homework Solver', description: 'Get accurate, step by step solutions for all subjects', icon: Sigma },
  { id: 'mock', tag: 'FOR EXAM', title: 'Mock Exam', description: 'Practice with simulated exams built from your materials', icon: GraduationCap },
  { id: 'cheat', tag: 'FOR EXAM', title: 'Cheatsheet', description: 'Key formulas, concepts, and terms on one compact page', icon: NotebookPen },
  { id: 'quiz', tag: 'FOR STUDY', title: 'Quiz', description: 'Quiz yourself with customized questions and explanations', icon: ClipboardCheck },
  { id: 'flashcards', tag: 'FOR STUDY', title: 'Flashcards', description: 'Memorize faster with flashcards generated from your materials', icon: Layers3 },
]

const FEATURE_TABS = [
  { id: 'exams', label: 'For Exams', accent: '#6d55f7' },
  { id: 'study', label: 'For Study', accent: '#377dff' },
  { id: 'homework', label: 'For Homework', accent: '#8b5cf6' },
  { id: 'class', label: 'For Class', accent: '#0eb981' },
]

const FEATURE_CONTENT = {
  exams: {
    eyebrow: 'FOR EXAM',
    title: 'AI study tools for exam prep to help you ace exams 10X faster',
    description: 'Upload your notes and past exams. WeSolve predicts the topics most likely to appear, generates mock exams, cheat sheets and a review plan.',
    cta: 'Start your exam prep for FREE',
    route: '/exam',
    cards: [
      { eyebrow: 'Prediction + simulation', title: 'Exam Predictor + Mock Exam', body: 'AI predicts likely topics and turns them into realistic mock tests, helping students rehearse coverage, timing, and pressure before exam day.', preview: 'mock' },
      { eyebrow: 'Printable summary', title: 'Cheat Sheet', body: 'Every key formula, definition, and diagram on one page — built for last-minute review, and ready to walk into your open-note exam with.', preview: 'cheat' },
      { eyebrow: 'Daily prep', title: 'Review Plan', body: 'A daily plan tells you what to review next. A readiness score tells you how close you are to exam-ready.', preview: 'plan' },
    ],
  },
  study: {
    eyebrow: 'FOR STUDY',
    title: 'Master any course, your way',
    description: 'Upload your slides, PDFs, or YouTube links. WeSolve turns them into the AI study tools that actually fit how you learn.',
    cta: 'Start learning your way',
    route: '/study-guide',
    cards: [
      { eyebrow: 'Structured reading', title: 'Topic Breakdown + Study Guide', body: 'WeSolve breaks your course into bite-sized topics with voice explanation, so every unit clicks before you move on.', preview: 'guide' },
      { eyebrow: 'Read, flip, review', title: 'Flashcards', body: 'Auto-generated flashcards that focus on what you need to memorize, so the key ideas stick, fast.', preview: 'flash' },
      { eyebrow: 'Practice smarter', title: 'Quiz', body: 'Adaptive quizzes that pinpoint your weak spots and explain exactly why each answer is right or wrong.', preview: 'quiz' },
    ],
  },
  homework: {
    eyebrow: 'FOR HOMEWORK',
    title: 'Accuracy first. Multi-model cross-check',
    description: 'Drag and drop any problem — photo, PDF, or typed text. WeSolve cross-checks with multiple top AI models to deliver the most accurate answer.',
    cta: 'Solve homework with confidence',
    route: '/home',
    cards: [
      { eyebrow: 'Cross-check engine', title: 'Multi-Model Cross-Check', body: 'Drag and drop homework files or images. WeSolve instantly cross-checks with multiple top-tier models, delivering accurate solutions.', preview: 'check' },
      { eyebrow: 'Rendered explanations', title: 'Video & Visual Explanations', body: 'Go beyond a wall of text to visually break down 3D geometry, calculus graphs, and physics simulations.', preview: 'visual' },
      { eyebrow: 'All subjects', title: 'Explanations for All Subjects', body: 'Designed for geometry, calculus plotting, physics force analysis, biochemical structures and all difficult fields.', preview: 'subjects' },
    ],
  },
  class: {
    eyebrow: 'FOR CLASS',
    title: 'When the lecture moves too fast, we keep up',
    description: 'Hit record on any lecture. WeSolve transcribes, takes notes, and turns them into study sets — so you can focus on understanding, not scribbling.',
    cta: 'Turn lectures into notes',
    route: '/notes',
    cards: [
      { eyebrow: 'Capture everything', title: 'Live Recording + Auto Transcription', body: 'Hit record and get a searchable transcript — with timestamps, section structure, and the key moments highlighted.', preview: 'record' },
      { eyebrow: 'Never miss a key idea', title: 'AI Generated Notes', body: 'A long lecture condensed into clean notes — with sections, summaries, and the takeaways you actually care about.', preview: 'notes' },
      { eyebrow: 'Study in one tap', title: 'Lectures to Study Sets', body: 'With one click, your lecture turns into flashcards, quizzes, podcasts, and more.', preview: 'sets' },
    ],
  },
}

const TESTIMONIALS = [
  { name: 'Sophia Campbell', school: 'Texas A&M University', title: 'I stopped re-reading the same pages', quote: 'I used to highlight everything and still not know what mattered. Now I upload the lecture slides and reading, and it pulls out the exact concepts I need to review.' },
  { name: 'Emma Lindsay', school: 'Johns Hopkins University', title: 'Saved me the night before my exam', quote: 'I dumped in 3 PDFs. The study guide came out organized by topic, and I could jump straight to the parts I was weak on.' },
  { name: 'Vikram Kumar', school: 'MIT', title: 'Flashcards that don’t feel generic', quote: 'This one used my notes and even kept the diagrams from the slides, so the cards actually looked like what I saw in class.' },
  { name: 'Aidan Walton', school: 'Cornell University', title: 'Works even when my files are messy', quote: 'My professor posts low-quality PDFs and screenshots. I uploaded everything anyway and it still pulled the important images and explained the steps clearly.' },
  { name: 'Olivia Dennis', school: 'Harvard University', title: 'Helped me study when overwhelmed', quote: 'When I see a 60-page reading, I freeze. This breaks it into a guide and quizzes so I can do it in small chunks and actually retain it.' },
  { name: 'Joshua Blackburn', school: 'Ohio State University', title: 'Easily explains college level calculus', quote: 'It gives all the steps and explanations. The explanation allowed me to reach the answer and understand how it was found.' },
]

const FAQS = [
  ['What are AI study tools?', 'AI study tools automatically convert course materials — lectures, PDFs, PPTs, videos, and homework questions — into notes, flashcards, quizzes, summaries, and step-by-step solutions. WeSolve integrates these capabilities into one app.'],
  ['What is the best AI study tool?', 'The best tool depends on whether your priority is homework, notes, or exam prep. WeSolve brings the full workflow together with multi-model cross-checking for homework answers.'],
  ['Are WeSolve’s AI study tools free?', 'Yes. A free version includes basic homework help and study tools. Unlimited unlocks unlimited study guides, flashcards, quizzes, notes, and exam prep across devices.'],
  ['Are the homework answers accurate?', 'WeSolve uses several AI passes to cross-check every problem and flag conflicting results. Students should still verify important formal assignments with textbooks, teachers, or course materials.'],
  ['Which devices are supported?', 'The experience supports Web, iOS, Android, and Chrome or Edge extensions, so your study tools can follow you between devices.'],
  ['What kind of content can I upload?', 'You can upload PDFs, PPTs, images of problems, text, and YouTube video links. You can also record live lectures and generate notes, quizzes, and study materials.'],
]

const TOOLS = ['AI Math Solver', 'Word Problem Solver', 'Equation Solver', 'Photo Math Solver', 'AI Statistics Solver', 'Solve for x Calculator', 'Algebra Calculator', 'Scientific Calculator', 'AI Geometry Calculator', 'Fraction Calculator', 'AI Humanizer', 'AI Detector', 'AI Paraphraser', 'Plagiarism Checker', 'Word Counter', 'Grammar Checker', 'AI Quiz Maker', 'AI Flashcard Maker', 'AI Study Guide Maker', 'AI Cheat Sheet Maker']

const UNIVERSITIES = ['UC Berkeley', 'UCLA', 'Stanford', 'McGill', 'Texas A&M', 'MIT', 'Cornell', 'Columbia', 'University of Florida', 'UChicago']

function HeroMockup({ id }) {
  if (id === 'notes') {
    return (
      <div className="hero-mock notes-mock">
        <div className="mock-top"><span className="recording-dot" /> Recording · BIO 101 <small>12:04</small></div>
        <div className="waveform">{Array.from({ length: 40 }).map((_, index) => <i key={index} style={{ height: `${14 + ((index * 17) % 58)}%` }} />)}</div>
        <div className="transcript-box"><span>00:12</span><p>Photosynthesis begins when chlorophyll absorbs light energy…</p></div>
        <div className="notes-summary"><Sparkles size={14} /><strong>Auto summary</strong><p>Three key stages: light absorption, ATP creation, and sugar production.</p></div>
      </div>
    )
  }
  if (id === 'guide') {
    return (
      <div className="hero-mock guide-mock">
        <div className="mock-top"><BookOpen size={16} /> Biology Unit 3 <small>Study guide</small></div>
        <div className="guide-tabs"><button className="active">Topics</button><button>Mitosis</button><button>DNA</button><button>Enzymes</button></div>
        <div className="guide-rows">
          <div><span>01</span><p><strong>How cells divide</strong><small>Interphase · PMAT · cytokinesis</small></p><Check size={16} /></div>
          <div><span>02</span><p><strong>DNA replication</strong><small>Enzymes · leading strand · base pairing</small></p><Check size={16} /></div>
          <div><span>03</span><p><strong>Protein synthesis</strong><small>Transcription · translation</small></p><CirclePlay size={16} /></div>
        </div>
        <div className="tutor-strip"><div><BrainCircuit size={16} /></div><p><strong>Ask AI Tutor</strong><span>Explain mitosis like I’m new to biology</span></p><ArrowRight size={15} /></div>
      </div>
    )
  }
  if (id === 'solver') {
    return (
      <div className="hero-mock solver-mock">
        <div className="mock-top"><Badge tone="purple">Guided steps</Badge><span>Algebra</span><small>Step 2 of 3</small></div>
        <div className="solver-equation">Solve for x: <strong>3x + 6 = 42</strong></div>
        <div className="solver-steps">
          <div><span>1</span><p>Subtract 6 from both sides</p><code>3x = 36</code></div>
          <div className="active"><span>2</span><p>Divide both sides by 3</p><code>x = 12</code></div>
        </div>
        <div className="solver-final"><span>Final answer</span><strong>x = 12</strong><Check size={17} /></div>
      </div>
    )
  }
  if (id === 'mock') {
    return (
      <div className="hero-mock exam-mock">
        <div className="mock-top"><GraduationCap size={17} /> Mock Exam <small>Ready</small></div>
        <h4>Biology Mock 01</h4>
        <div className="exam-stats"><div><strong>52</strong><span>Questions</span></div><div><strong>96%</strong><span>Prediction accuracy</span></div></div>
        <div className="readiness"><span>Readiness</span><strong>84%</strong></div>
        <div className="readiness-track"><i /></div>
        <button className="mock-primary">Start exam <ArrowRight size={15} /></button>
      </div>
    )
  }
  if (id === 'cheat') {
    return (
      <div className="hero-mock cheat-mock">
        <div className="mock-top"><NotebookPen size={17} /> Exam Cheatsheet <small>1 page</small></div>
        <div className="cheat-grid">
          {[
            ['Concept', 'Cell Cycle'], ['Formula', 'Rate Laws'], ['Pitfall', 'Common Traps'], ['Diagram', 'Membrane Flow'],
            ['Term', 'Osmosis'], ['Method', 'Graph Checks'], ['Memory', 'Key Mnemonic'], ['Compare', 'Mitosis vs Meiosis'],
          ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
        </div>
      </div>
    )
  }
  if (id === 'quiz') {
    return (
      <div className="hero-mock quiz-mock">
        <div className="mock-top"><ClipboardCheck size={17} /> Quick quiz <small>4 questions</small></div>
        <h4>Which organelle is known as the powerhouse of the cell?</h4>
        <div className="quiz-options">
          <button className="selected"><span>A</span>Mitochondria<Check size={15} /></button>
          <button><span>B</span>Nucleus</button>
          <button><span>C</span>Golgi body</button>
          <button><span>D</span>Ribosome</button>
        </div>
        <div className="quiz-progress"><span>1 of 4 completed</span><div><i /></div><button>Check answer</button></div>
      </div>
    )
  }
  return (
    <div className="hero-mock flash-mock">
      <div className="mock-top"><Layers3 size={17} /> Deck <small>12 / 48</small></div>
      <div className="flash-card"><small>Term</small><h4>Photosynthesis</h4><p>Tap the card to reveal the definition</p></div>
      <div className="flash-actions"><button>Unknown</button><button>Known</button></div>
      <div className="flash-progress"><i /></div>
    </div>
  )
}

function FeaturePreview({ id }) {
  if (id === 'mock') return <div className="feature-preview preview-mock"><div className="mini-head"><span>Mock Exam 2</span><Badge tone="green">80–90% likely</Badge></div><h5>Cell biology · Unit 3</h5><div className="mini-bars">{[72, 48, 90, 64, 82].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><div className="mini-foot"><Clock3 size={14} /> 42 mins · 25 questions<ArrowRight size={16} /></div></div>
  if (id === 'cheat') return <div className="feature-preview preview-cheat"><div className="paper-lines"><i /><i /><i /><i /><i /><i /><i /><i /></div><h5>Biology final cheat sheet</h5><div className="formula-chip">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</div><div className="mini-tags"><span>Enzymes</span><span>Osmosis</span><span>Mitosis</span><span>ATP</span></div></div>
  if (id === 'plan') return <div className="feature-preview preview-plan"><div className="mini-head"><span>7-day sprint</span><strong>78%</strong></div>{[['Mon', 'Cell structure', true], ['Tue', 'Enzymes', true], ['Wed', 'Genetics', false], ['Thu', 'Practice test', false]].map(([day, task, done]) => <div className="plan-row" key={day}><span>{day}</span><p>{task}</p><i className={done ? 'done' : ''}>{done ? <Check size={12} /> : ''}</i></div>)}</div>
  if (id === 'guide') return <div className="feature-preview preview-guide"><div className="mini-head"><span>Topic breakdown</span><small>8 topics</small></div>{['Cell structure', 'Membranes', 'Enzymes', 'Cell cycle'].map((topic, index) => <div className="guide-row" key={topic}><span>0{index + 1}</span><p>{topic}</p><div><i style={{ width: `${90 - index * 13}%` }} /></div></div>)}</div>
  if (id === 'flash') return <div className="feature-preview preview-flash"><div className="stack-card back" /><div className="stack-card middle" /><div className="stack-card front"><small>Definition</small><h5>Active recall</h5><p>Retrieving information from memory without looking at notes.</p></div></div>
  if (id === 'quiz') return <div className="feature-preview preview-quiz"><div className="mini-head"><span>Adaptive quiz</span><Badge tone="blue">Q4</Badge></div><h5>Which statement best describes an enzyme?</h5>{['A biological catalyst', 'A cell organelle', 'A genetic code'].map((option, index) => <div className={`mini-option ${index === 0 ? 'correct' : ''}`} key={option}>{option}</div>)}</div>
  if (id === 'check') return <div className="feature-preview preview-check"><div className="check-orbit"><div className="center"><ShieldCheck size={22} /></div><span className="m1">GPT</span><span className="m2">G</span><span className="m3">AI</span><span className="m4">S</span></div><div className="check-result"><Check size={15} /> 3 models agree</div></div>
  if (id === 'visual') return <div className="feature-preview preview-visual"><div className="graph-grid" /><svg viewBox="0 0 300 150" preserveAspectRatio="none"><path d="M0 127 C55 20 90 20 145 76 S240 135 300 18" fill="none" stroke="#7257f2" strokeWidth="4" /><path d="M0 127 C55 20 90 20 145 76 S240 135 300 18 L300 150 L0 150Z" fill="rgba(114,87,242,.12)" /></svg><button><Play size={14} fill="currentColor" /> Video explanation</button></div>
  if (id === 'subjects') return <div className="feature-preview preview-subjects"><div className="subject-hex"><Sigma size={26} /></div><div className="subject-icons"><span><FlaskConical size={18} /></span><span><Code2 size={18} /></span><span><TrendingUp size={18} /></span><span><Globe2 size={18} /></span></div><p>Geometry · Calculus · Physics · Chemistry · Finance</p></div>
  if (id === 'record') return <div className="feature-preview preview-record"><div className="record-button"><Mic2 size={23} /></div><p>Recording lecture</p><div className="waveform small">{Array.from({ length: 24 }).map((_, index) => <i key={index} style={{ height: `${20 + ((index * 29) % 70)}%` }} />)}</div><small>Live transcript is being generated…</small></div>
  if (id === 'notes') return <div className="feature-preview preview-notes"><div className="mini-head"><span>Structured notes</span><Badge tone="purple">AI</Badge></div><h5>Introduction to chemical bonds</h5><p><strong>Summary</strong> Ionic bonds form when electrons transfer between atoms.</p><ul><li>Covalent bonds share electron pairs</li><li>Polarity depends on electronegativity</li><li>Hydrogen bonds stabilize water</li></ul></div>
  return <div className="feature-preview preview-sets"><div className="set-card"><Layers3 size={18} /><strong>Flashcards</strong><small>24 cards</small></div><div className="set-card"><ClipboardCheck size={18} /><strong>Quiz</strong><small>12 questions</small></div><div className="set-card"><BookOpen size={18} /><strong>Study guide</strong><small>6 topics</small></div><div className="set-card"><NotebookPen size={18} /><strong>Summary</strong><small>2 pages</small></div></div>
}

function LandingNav() {
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { state, setAuthOpen, setServiceSettingsOpen } = useApp()
  const navigate = useNavigate()

  const menu = (id) => ({
    onMouseEnter: () => setOpenMenu(id),
    onMouseLeave: () => setOpenMenu(null),
  })

  return (
    <header className="landing-nav">
      <div className="landing-nav-inner">
        <Brand />
        <nav className="landing-links">
          <div className="nav-dropdown-wrap" {...menu('tools')}>
            <button className={openMenu === 'tools' ? 'active' : ''} onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}>AI Study Tools <ChevronDown size={15} /></button>
            {openMenu === 'tools' && (
              <div className="mega-menu">
                <div className="mega-intro"><Badge tone="purple">Workspace</Badge><h3>Everything you need to learn faster</h3><p>One connected workspace from homework question to exam day.</p><Link to="/home" className="mega-link">Open workspace <ArrowRight size={15} /></Link></div>
                <div className="mega-grid">
                  {[
                    ['Sparkles', 'Homework Solver', 'Step-by-step solutions for any subject', '/home'],
                    ['Mic2', 'AI Live Notes', 'Record lectures and generate clean notes', '/notes'],
                    ['GraduationCap', 'Exam Predictor', 'Predict topics and practice mock exams', '/exam'],
                    ['BookOpen', 'AI Study Guide', 'Turn dense materials into clear topics', '/study-guide'],
                    ['Layers3', 'Flashcards', 'Generate cards from your own material', '/flashcards'],
                    ['ClipboardCheck', 'Quiz', 'Practice with adaptive questions', '/quiz'],
                  ].map(([iconName, name, desc, to]) => {
                    const icons = { Sparkles, Mic2, GraduationCap, BookOpen, Layers3, ClipboardCheck }
                    const Icon = icons[iconName]
                    return <Link to={to} key={name}><span><Icon size={18} /></span><div><strong>{name}</strong><small>{desc}</small></div></Link>
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="nav-dropdown-wrap" {...menu('resources')}>
            <button className={openMenu === 'resources' ? 'active' : ''} onClick={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}>Resources <ChevronDown size={15} /></button>
            {openMenu === 'resources' && (
              <div className="mega-menu compact-menu">
                <div className="mega-grid">
                  <Link to="/pricing"><span><Target size={18} /></span><div><strong>Pricing</strong><small>Compare Free and Unlimited</small></div></Link>
                  <Link to="/home"><span><Calculator size={18} /></span><div><strong>Calculators</strong><small>Solve for x, algebra, geometry</small></div></Link>
                  <a href="#tools"><span><WandSparkles size={18} /></span><div><strong>Free tools</strong><small>Explore the full collection</small></div></a>
                  <a href="#faq"><span><Lightbulb size={18} /></span><div><strong>Help center</strong><small>Answers to common questions</small></div></a>
                </div>
              </div>
            )}
          </div>
          <Link to="/pricing">Pricing</Link>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-actions">
          {state.user ? (
            <Button variant="primary" size="sm" iconRight={ArrowRight} onClick={() => navigate('/home')}>Open app</Button>
          ) : (
            <>
              <button className="text-button hide-mobile" onClick={() => setServiceSettingsOpen(true)}><KeyRound size={15} /> Connect AI</button>
              <button className="text-button hide-mobile" onClick={() => setAuthOpen(true)}>Log in</button>
              <Button size="sm" iconRight={ArrowRight} onClick={() => navigate('/home')}>Try for Free</Button>
            </>
          )}
          <button className="icon-button mobile-nav-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen && (
        <div className="mobile-landing-menu">
          <Link to="/home">Homework Solver</Link>
          <Link to="/study-guide">AI Study</Link>
          <Link to="/notes">AI Live Notes</Link>
          <Link to="/exam">Exam Predictor</Link>
          <Link to="/pricing">Pricing</Link>
          <a href="#reviews">Reviews</a>
          <button onClick={() => { setServiceSettingsOpen(true); setMobileOpen(false) }}>Connect AI</button>
          <button onClick={() => setAuthOpen(true)}>Log in</button>
        </div>
      )}
    </header>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { setAuthOpen, setServiceSettingsOpen } = useApp()
  const [slide, setSlide] = useState(2)
  const [featureTab, setFeatureTab] = useState('exams')
  const [testimonial, setTestimonial] = useState(0)
  const [faq, setFaq] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % HERO_SLIDES.length), 6000)
    return () => window.clearInterval(timer)
  }, [])

  const activeSlide = HERO_SLIDES[slide]
  const feature = FEATURE_CONTENT[featureTab]
  const visibleTestimonials = [0, 1, 2].map((offset) => TESTIMONIALS[(testimonial + offset) % TESTIMONIALS.length])

  const goToWorkspace = (route = '/home') => navigate(route)

  return (
    <div className="landing-page">
      <LandingNav />

      <main>
        <section className="hero-section">
          <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <Badge tone="purple" className="hero-badge"><Sparkles size={14} /> Trusted by 10M+ students worldwide</Badge>
              <h1>AI Study Tools<br /><span>built for students</span></h1>
              <p>The AI study tool trusted by 10M+ students from 5,000+ universities worldwide.</p>
              <div className="hero-cta">
                <Button size="lg" iconRight={ArrowRight} onClick={() => goToWorkspace('/home')}>Get Started for Free</Button>
                <Button size="lg" variant="outline" icon={Play} onClick={() => navigate('/mobile')}>Get the app</Button>
              </div>
              <div className="hero-trust"><div className="avatar-stack"><span>A</span><span>M</span><span>J</span><span>S</span></div><div><div className="stars">★★★★★</div><small>4.8 average rating from students</small></div></div>
              <div className="hero-ai-note"><span className="ai-orb"><Sparkles size={13} /></span><div><strong>Live NVIDIA AI</strong><small>Multi-model answers, image OCR, and study generation</small></div><button onClick={() => setServiceSettingsOpen(true)}>Connect your key <ArrowRight size={13} /></button></div>
            </div>

            <div className="hero-showcase">
              <div className="showcase-glow" />
              <div className="showcase-header">
                <span className="showcase-tag">{activeSlide.tag}</span>
                <div className="showcase-title"><activeSlide.icon size={18} /><div><strong>{activeSlide.title}</strong><small>{activeSlide.description}</small></div></div>
              </div>
              <HeroMockup id={activeSlide.id} />
              <div className="showcase-controls">
                <div className="showcase-dots">{HERO_SLIDES.map((item, index) => <button key={item.id} className={index === slide ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`Show ${item.title}`} />)}</div>
                <div className="showcase-arrows"><button onClick={() => setSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="Previous"><ChevronLeft size={17} /></button><button onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)} aria-label="Next"><ChevronRight size={17} /></button></div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="container">
            <div className="section-kicker">ALL-IN-ONE PLATFORM</div>
            <h2>All-in-one AI study tools for every student need</h2>
            <p>Everything students need for all scenarios across Web, iOS, Android, and Chrome extension.</p>
            <div className="stats-grid">
              {[['10M+', 'Student Users'], ['200M+', 'Problems Solved'], ['97%', 'Overall Accuracy'], ['4.8★', 'App Store Rating']].map(([stat, label]) => <div key={label}><strong>{stat}</strong><span>{label}</span></div>)}
            </div>
            <div className="university-marquee"><div className="marquee-track">{[...UNIVERSITIES, ...UNIVERSITIES].map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}</div></div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="container">
            <div className="feature-tabs">
              {FEATURE_TABS.map((tab) => <button key={tab.id} className={featureTab === tab.id ? 'active' : ''} onClick={() => setFeatureTab(tab.id)}>{tab.label}<ChevronRight size={16} /></button>)}
            </div>
            <div className="feature-head">
              <div>
                <div className="section-kicker">{feature.eyebrow}</div>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
                <Button size="lg" iconRight={ArrowRight} onClick={() => goToWorkspace(feature.route)}>{feature.cta}</Button>
              </div>
              <div className="feature-head-art"><div className="orbit-ring"><Sparkles size={44} /></div><div className="floating-chip one"><BrainCircuit size={17} /> Personalized</div><div className="floating-chip two"><Zap size={17} /> 10× faster</div></div>
            </div>
            <div className="feature-card-grid">
              {feature.cards.map((card) => (
                <article className="feature-card" key={card.title}>
                  <FeaturePreview id={card.preview} />
                  <div className="feature-card-copy"><small>{card.eyebrow}</small><h3>{card.title}</h3><p>{card.body}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="showcase-band">
          <div className="container showcase-band-inner">
            <div className="band-copy"><Badge tone="light">Visual learning</Badge><h2>Go beyond a wall of text</h2><p>Turn difficult ideas into interactive graphs, rendered explanations, and step-by-step visual reasoning across math, science, and more.</p><Button variant="light" iconRight={ArrowRight} onClick={() => goToWorkspace('/tutor')}>Try the whiteboard tutor</Button></div>
            <div className="band-visual">
              <div className="graph-card">
                <div className="graph-card-top"><span>Interactive graph</span><small>f(x) = −x² + 6</small></div>
                <div className="graph-grid-lines" />
                <svg viewBox="0 0 420 220"><path d="M15 20 C90 20 155 70 210 180 C265 70 330 20 405 20" fill="none" stroke="#8a6bff" strokeWidth="4" /><path d="M15 185 L405 185" stroke="#fff" strokeOpacity=".2" /><circle cx="210" cy="180" r="6" fill="#54e0a5" /><circle cx="90" cy="35" r="5" fill="#ffcf5c" /><circle cx="330" cy="35" r="5" fill="#ffcf5c" /></svg>
              </div>
              <div className="answer-chip"><Sparkles size={16} /><div><strong>Answer verified</strong><span>3 independent checks agree</span></div><Check size={17} /></div>
            </div>
          </div>
        </section>

        <section className="testimonials-section" id="reviews">
          <div className="container">
            <div className="section-heading centered"><div className="section-kicker">TESTIMONIALS</div><h2>What students actually say about WeSolve.ai</h2><p>Stories from real students using WeSolve for exam prep, homework, and in-class notes.</p></div>
            <div className="testimonial-grid">
              {visibleTestimonials.map((item) => (
                <article className="testimonial-card" key={item.name}>
                  <div className="stars">★★★★★</div><h3>{item.title}</h3><p>“{item.quote}”</p><div className="testimonial-person"><div className="avatar">{item.name.split(' ').map((word) => word[0]).join('')}</div><div><strong>{item.name}</strong><small>{item.school}</small></div></div>
                </article>
              ))}
            </div>
            <div className="carousel-controls"><button onClick={() => setTestimonial((testimonial - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Previous reviews"><ChevronLeft size={19} /></button><button onClick={() => setTestimonial((testimonial + 1) % TESTIMONIALS.length)} aria-label="Next reviews"><ChevronRight size={19} /></button></div>
          </div>
        </section>

        <section className="unlimited-section">
          <div className="container unlimited-card">
            <div className="unlimited-copy"><Badge tone="light">SOLVELY UNLIMITED</Badge><h2>Every AI study tool you need in ONE subscription</h2><p>Unlimited homework help, powerful study tools, and stronger exam support covering your hardest classes.</p><Button size="lg" variant="light" iconRight={ArrowRight} onClick={() => goToWorkspace('/pricing')}>Start Free with Unlimited</Button></div>
            <div className="unlimited-list">
              {['Exam prep with predictions, mocks, and study plans', 'AI study guides, flashcards, and quizzes', 'Unlimited step-by-step homework solutions', 'AI notes from every lecture', 'Available across Web, iOS, Android, and Chrome'].map((item) => <div key={item}><span><Check size={15} /></span>{item}</div>)}
            </div>
          </div>
        </section>

        <section className="tools-section" id="tools">
          <div className="container">
            <div className="section-heading centered"><div className="section-kicker">FREE RESOURCES</div><h2>Free AI study tools collection</h2><p>Start with a focused tool, then bring everything together in your workspace.</p></div>
            <div className="tool-pills">{TOOLS.map((tool) => <button key={tool} onClick={() => goToWorkspace('/home')}>{tool}<ArrowRight size={14} /></button>)}</div>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="container faq-layout">
            <div className="faq-intro"><div className="section-kicker">FAQ</div><h2>AI study tools, answered</h2><p>Everything you need to know before getting started with your personalized study workspace.</p><Button variant="outline" iconRight={ArrowRight} onClick={() => setAuthOpen(true)}>Talk to our AI tutor</Button></div>
            <div className="faq-list">{FAQS.map(([question, answer], index) => <div className={`faq-item ${faq === index ? 'open' : ''}`} key={question}><button onClick={() => setFaq(faq === index ? -1 : index)}><span>{question}</span><i>{faq === index ? '−' : '+'}</i></button>{faq === index && <p>{answer}</p>}</div>)}</div>
          </div>
        </section>

        <section className="final-cta-section">
          <div className="container final-cta">
            <div className="final-cta-icon"><BrandMark size={40} /></div>
            <h2>Study smarter, not longer</h2>
            <p>Turn any question, lecture, or document into the study tools you need — in seconds.</p>
            <div><Button size="lg" variant="light" iconRight={ArrowRight} onClick={() => goToWorkspace('/home')}>Start solving for free</Button><Button size="lg" variant="ghost-light" onClick={() => goToWorkspace('/pricing')}>View pricing</Button></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand"><Brand light /><p>Personalized, accessible, joyful educational experiences for every mind.</p><div className="footer-socials"><a href="#top" aria-label="Community"><Users size={17} /></a><a href="#top" aria-label="Globe"><Globe2 size={17} /></a><a href="#top" aria-label="Resources"><Lightbulb size={17} /></a></div><small className="edition-label">WeSolve — built for every student</small></div>
            <div className="footer-column"><h4>Tools</h4>{['AI Humanizer', 'AI Detector', 'AI Paraphraser', 'Plagiarism Checker', 'Word Counter', 'Grammar Checker', 'AI Study Guide Maker', 'AI Quiz Maker'].map((item) => <button key={item} onClick={() => goToWorkspace('/home')}>{item}</button>)}</div>
            <div className="footer-column"><h4>Calculators</h4>{['Solve for x Calculator', 'Algebra Calculator', 'Scientific Calculator', 'AI Geometry Calculator', 'Fraction Calculator', 'Word Problem Solver', 'Equation Solver', 'Photo Math Solver'].map((item) => <button key={item} onClick={() => goToWorkspace('/home')}>{item}</button>)}</div>
            <div className="footer-column"><h4>Resources</h4>{['Blog', 'Download App', 'Download extension', 'Responsible AI', 'About us', 'Affiliate Program', 'Contact us'].map((item) => <button key={item} onClick={() => goToWorkspace(item === 'Download App' ? '/mobile' : '/home')}>{item}</button>)}</div>
            <div className="footer-column"><h4>Company</h4>{['Terms of Service', 'Privacy Policy', 'Honor Code', 'Help center', 'Pricing', 'Reviews'].map((item) => <button key={item} onClick={() => item === 'Pricing' ? navigate('/pricing') : goToWorkspace('/home')}>{item}</button>)}</div>
          </div>
          <div className="footer-bottom"><span>© 2026 WeSolve. Built for students everywhere.</span><div><button onClick={() => goToWorkspace('/home')}>Terms</button><button onClick={() => goToWorkspace('/home')}>Privacy</button><button onClick={() => goToWorkspace('/home')}>Honor Code</button></div></div>
        </div>
      </footer>
    </div>
  )
}
