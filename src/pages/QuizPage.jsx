import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Layers3, Lightbulb, Plus, RotateCcw, Sparkles, Target, Trophy, X } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import SourceModal from '../components/SourceModal'
import { Badge, Button, EmptyState, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, estimateScore } from '../lib/intelligence'

export default function QuizPage() {
  const { state, currentPack, saveStudySet, setCurrentPack, toast } = useApp()
  const [sourceOpen, setSourceOpen] = useState(false)
  const [questions, setQuestions] = useState(currentPack.quiz || [])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [deckOpen, setDeckOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    setQuestions(currentPack.quiz || [])
    restart()
  }, [currentPack.id])

  useEffect(() => {
    if (finished || !questions.length) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [finished, questions.length])

  const question = questions[index]
  const progress = questions.length ? ((index + (checked ? 1 : 0)) / questions.length) * 100 : 0
  const result = useMemo(() => estimateScore(answers, questions), [answers, questions])
  const isCorrect = checked && selected === question?.correctIndex

  function restart() {
    setIndex(0)
    setSelected(null)
    setChecked(false)
    setAnswers([])
    setFinished(false)
    setSeconds(0)
    setShowHint(false)
  }

  const check = () => {
    if (selected === null) {
      toast('Choose an answer first.', 'error')
      return
    }
    setChecked(true)
    setAnswers((items) => {
      const copy = [...items]
      copy[index] = selected
      return copy
    })
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex((value) => value + 1)
      setSelected(null)
      setChecked(false)
      setShowHint(false)
    }
  }

  const generate = (pack) => {
    saveStudySet({ ...pack, id: createId('pack') })
    setSourceOpen(false)
  }

  const jumpTo = (target) => {
    if (target > index && !checked) return
    setIndex(target)
    setSelected(answers[target] ?? null)
    setChecked(answers[target] !== undefined)
    setShowHint(false)
  }

  if (!questions.length) {
    return (
      <div className="app-page quiz-page"><ToolTabs /><PageHeader eyebrow="QUIZ" title="Practice makes perfect" description="Generate an adaptive quiz from your study material." />
        <EmptyState icon={ClipboardCheck} title="No quiz questions yet" description="Add notes or files to create multiple-choice questions with explanations." action={<Button icon={Plus} onClick={() => setSourceOpen(true)}>Create quiz</Button>} />
        <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generate} title="Create an AI quiz" cta="Generate quiz" generatedTitle="My practice quiz" />
      </div>
    )
  }

  return (
    <div className="app-page quiz-page">
      <ToolTabs />
      <PageHeader
        eyebrow="QUIZ"
        title="Practice makes perfect"
        description="Get instant feedback and find the topics that need another look."
        actions={<><Button variant="outline" icon={Plus} onClick={() => setSourceOpen(true)}>New quiz</Button><Button variant="ghost" icon={RotateCcw} onClick={restart}>Restart</Button></>}
      >
        <div className="deck-selector-wrap">
          <button className="deck-selector" onClick={() => setDeckOpen((open) => !open)}><span><Layers3 size={17} /></span><div><small>Study set</small><strong>{currentPack.title}</strong></div><ChevronDown size={17} /></button>
          {deckOpen && <div className="deck-menu">{state.studySets.map((pack) => <button key={pack.id} className={pack.id === currentPack.id ? 'active' : ''} onClick={() => { setCurrentPack(pack.id); setDeckOpen(false) }}><Layers3 size={16} /><div><strong>{pack.title}</strong><small>{pack.quiz?.length || 0} questions</small></div>{pack.id === currentPack.id && <Check size={15} />}</button>)}</div>}
        </div>
      </PageHeader>

      <div className="quiz-layout">
        <div className="quiz-main">
          {!finished ? (
            <div className="quiz-card">
              <div className="quiz-card-top"><div><Badge tone="purple">Question {index + 1} of {questions.length}</Badge><span>{question?.topic || 'General'}</span></div><div className="quiz-timer"><Clock3 size={16} /> {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</div></div>
              <ProgressBar value={progress} />
              <h2>{question?.prompt}</h2>
              <div className="quiz-options-list">
                {question?.options.map((option, optionIndex) => {
                  let className = ''
                  if (selected === optionIndex) className += ' selected '
                  if (checked && optionIndex === question.correctIndex) className += ' correct '
                  if (checked && selected === optionIndex && optionIndex !== question.correctIndex) className += ' incorrect '
                  return (
                    <button key={`${option}-${optionIndex}`} className={className} onClick={() => !checked && setSelected(optionIndex)} disabled={checked}>
                      <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                      <span className="option-text">{option}</span>
                      {checked && optionIndex === question.correctIndex && <CheckCircle2 size={19} />}
                      {checked && selected === optionIndex && optionIndex !== question.correctIndex && <X size={19} />}
                    </button>
                  )
                })}
              </div>
              {showHint && !checked && <div className="quiz-hint"><Lightbulb size={17} /><p>Look for the option that restates the definition or main relationship from your source material.</p></div>}
              {checked && (
                <div className={`quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="feedback-icon">{isCorrect ? <Check size={19} /> : <X size={19} />}</div>
                  <div><strong>{isCorrect ? 'Correct! Nice work.' : 'Not quite — here’s why.'}</strong><p>{question.explanation}</p></div>
                </div>
              )}
              <div className="quiz-card-actions">
                <button onClick={() => setShowHint((value) => !value)} disabled={checked}><Lightbulb size={16} /> Hint</button>
                <div>
                  {!checked ? <Button size="lg" onClick={check}>Check answer</Button> : <Button size="lg" iconRight={index === questions.length - 1 ? Trophy : ArrowRight} onClick={next}>{index === questions.length - 1 ? 'See results' : 'Next question'}</Button>}
                </div>
              </div>
            </div>
          ) : (
            <div className="quiz-results">
              <div className="result-hero"><div className="result-trophy"><Trophy size={34} /></div><Badge tone="green">Quiz complete</Badge><h2>{result.percent >= 80 ? 'Excellent work!' : result.percent >= 50 ? 'Good progress!' : 'Keep practicing!'}</h2><p>You answered {result.correct} of {result.total} questions correctly in {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}.</p></div>
              <div className="result-score-grid"><div><strong>{result.percent}%</strong><span>Accuracy</span></div><div><strong>{result.correct}/{result.total}</strong><span>Correct</span></div><div><strong>{Math.max(1, Math.round(seconds / Math.max(questions.length, 1)))}s</strong><span>Avg. time</span></div></div>
              <div className="weak-topics"><h3><Target size={18} /> Focus areas</h3>{result.weakTopics.length ? result.weakTopics.map((topic) => <div key={topic}><span>{topic}</span><small>Review this topic</small><ArrowRight size={15} /></div>) : <p>No weak areas detected — you’ve mastered this set.</p>}</div>
              <div className="result-actions"><Button variant="outline" icon={RotateCcw} onClick={restart}>Retake quiz</Button><Link to="/flashcards"><Button icon={Layers3}>Review flashcards</Button></Link><Link to="/study-guide"><Button variant="outline" icon={BookOpen}>Open study guide</Button></Link></div>
            </div>
          )}
        </div>

        <aside className="quiz-side">
          <div className="side-card navigator-card"><div className="side-card-head"><h3>Question navigator</h3><Badge tone="gray">{answers.filter((answer) => answer !== undefined).length}/{questions.length}</Badge></div><div className="question-dots">{questions.map((item, itemIndex) => {
            const answered = answers[itemIndex] !== undefined
            const correct = answered && answers[itemIndex] === item.correctIndex
            return <button key={item.id || itemIndex} className={`${itemIndex === index ? 'current' : ''} ${answered ? (correct ? 'correct' : 'incorrect') : ''}`} onClick={() => jumpTo(itemIndex)} disabled={itemIndex > index && !checked}>{itemIndex + 1}</button>
          })}</div></div>
          <div className="side-card quiz-tips"><Sparkles size={21} /><h3>Active recall tip</h3><p>Before checking, explain your choice in one sentence. That extra retrieval step improves long-term memory.</p></div>
          <div className="side-card quiz-linked"><h3>Linked study tools</h3><Link to="/flashcards"><span><Layers3 size={17} /></span><div><strong>Flashcards</strong><small>{currentPack.flashcards?.length || 0} cards</small></div><ArrowRight size={15} /></Link><Link to="/study-guide"><span><BookOpen size={17} /></span><div><strong>Study guide</strong><small>{currentPack.guide?.topics?.length || 0} topics</small></div><ArrowRight size={15} /></Link></div>
        </aside>
      </div>
      <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generate} title="Create an AI quiz" cta="Generate quiz" generatedTitle="My practice quiz" />
    </div>
  )
}
