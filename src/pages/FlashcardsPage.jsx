import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BrainCircuit, Check, ChevronDown, Layers3, Plus, RotateCcw, Shuffle, Sparkles, Volume2, X } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import SourceModal from '../components/SourceModal'
import { Badge, Button, EmptyState, ProgressBar } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, shuffleArray } from '../lib/intelligence'

export default function FlashcardsPage() {
  const { state, currentPack, saveStudySet, setCurrentPack, toast } = useApp()
  const [sourceOpen, setSourceOpen] = useState(false)
  const [cards, setCards] = useState(currentPack.flashcards || [])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(new Set())
  const [unknown, setUnknown] = useState(new Set())
  const [finished, setFinished] = useState(false)
  const [deckOpen, setDeckOpen] = useState(false)

  useEffect(() => {
    setCards(currentPack.flashcards || [])
    setIndex(0)
    setFlipped(false)
    setKnown(new Set())
    setUnknown(new Set())
    setFinished(false)
  }, [currentPack.id])

  const card = cards[index]
  const progress = cards.length ? (index / cards.length) * 100 : 0
  const mastery = cards.length ? Math.round((known.size / cards.length) * 100) : 0
  const topics = useMemo(() => [...new Set(cards.map((item) => item.topic).filter(Boolean))].slice(0, 8), [cards])

  const goNext = () => {
    setFlipped(false)
    if (index + 1 >= cards.length) setFinished(true)
    else setIndex((value) => value + 1)
  }

  const mark = (isKnown) => {
    if (!card) return
    if (isKnown) {
      setKnown((items) => new Set(items).add(card.id))
      setUnknown((items) => { const copy = new Set(items); copy.delete(card.id); return copy })
    } else {
      setUnknown((items) => new Set(items).add(card.id))
      setKnown((items) => { const copy = new Set(items); copy.delete(card.id); return copy })
    }
    goNext()
  }

  const restart = () => {
    setIndex(0)
    setFlipped(false)
    setKnown(new Set())
    setUnknown(new Set())
    setFinished(false)
  }

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  const handleKey = (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value) }
    if (event.code === 'ArrowRight') goNext()
    if (event.code === 'ArrowLeft') { setFlipped(false); setIndex((value) => Math.max(0, value - 1)) }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const generate = (pack) => {
    saveStudySet({ ...pack, id: createId('pack') })
    setSourceOpen(false)
  }

  if (!cards.length) {
    return (
      <div className="app-page flashcards-page"><ToolTabs /><PageHeader eyebrow="FLASHCARDS" title="Memorize faster" description="Create a deck from your notes, files, or links." />
        <EmptyState icon={Layers3} title="No flashcards yet" description="Add study material and Solvely will extract definitions, key concepts, and review questions." action={<Button icon={Plus} onClick={() => setSourceOpen(true)}>Create flashcards</Button>} />
        <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generate} title="Create AI flashcards" cta="Generate flashcards" generatedTitle="My flashcard deck" />
      </div>
    )
  }

  return (
    <div className="app-page flashcards-page" onKeyDown={handleKey}>
      <ToolTabs />
      <PageHeader
        eyebrow="FLASHCARDS"
        title="Flip to memorize"
        description="Active recall made simple — review one idea at a time."
        actions={<><Button variant="outline" icon={Plus} onClick={() => setSourceOpen(true)}>New deck</Button><Button icon={Shuffle} onClick={() => { setCards(shuffleArray(cards)); setIndex(0); setFlipped(false); setFinished(false); toast('Deck shuffled.') }}>Shuffle</Button></>}
      >
        <div className="deck-selector-wrap">
          <button className="deck-selector" onClick={() => setDeckOpen((open) => !open)}><span><Layers3 size={17} /></span><div><small>Current deck</small><strong>{currentPack.title}</strong></div><ChevronDown size={17} /></button>
          {deckOpen && <div className="deck-menu">{state.studySets.map((pack) => <button key={pack.id} className={pack.id === currentPack.id ? 'active' : ''} onClick={() => { setCurrentPack(pack.id); setDeckOpen(false) }}><Layers3 size={16} /><div><strong>{pack.title}</strong><small>{pack.flashcards?.length || 0} cards</small></div>{pack.id === currentPack.id && <Check size={15} />}</button>)}</div>}
        </div>
      </PageHeader>

      <div className="flashcards-layout">
        <div className="flashcard-main">
          <div className="flashcard-progress-row"><span>Card {Math.min(index + 1, cards.length)} of {cards.length}</span><strong>{known.size} known · {unknown.size} review</strong></div>
          <ProgressBar value={progress} />

          {!finished ? (
            <>
              <button className={`study-flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((value) => !value)} aria-label="Flip flashcard">
                <div className="flashcard-inner">
                  <div className="flashcard-face front"><div className="card-corner"><Layers3 size={16} /><span>Term</span></div><h2>{card?.front}</h2><p>{card?.topic && `Topic: ${card.topic}`}</p><span className="flip-hint">Tap to reveal answer</span></div>
                  <div className="flashcard-face back"><div className="card-corner"><Sparkles size={16} /><span>Definition</span></div><p>{card?.back}</p><span className="flip-hint">Tap to see the term again</span></div>
                </div>
              </button>
              <div className="flashcard-controls">
                <button className="control-nav" onClick={() => { setFlipped(false); setIndex((value) => Math.max(0, value - 1)) }} disabled={index === 0}><ArrowLeft size={18} /> Previous</button>
                <button className="control-unknown" onClick={() => mark(false)}><X size={18} /> Unknown</button>
                <button className="control-known" onClick={() => mark(true)}><Check size={18} /> Known</button>
                <button className="control-nav" onClick={goNext}>{index === cards.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={18} /></button>
              </div>
              <div className="flashcard-shortcuts"><button onClick={() => speak(flipped ? card?.back : card?.front)}><Volume2 size={15} /> Read card</button><span><kbd>Space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> navigate</span></div>
            </>
          ) : (
            <div className="deck-complete">
              <div className="complete-icon"><Sparkles size={28} /></div>
              <h2>Deck complete!</h2>
              <p>You marked <strong>{known.size}</strong> cards as known and <strong>{unknown.size}</strong> for review.</p>
              <div className="complete-stats"><div><strong>{mastery}%</strong><span>Mastery</span></div><div><strong>{cards.length}</strong><span>Cards</span></div><div><strong>{unknown.size}</strong><span>To review</span></div></div>
              <div className="complete-actions"><Button variant="outline" icon={RotateCcw} onClick={restart}>Study again</Button><Button icon={Layers3} onClick={() => { setCards(shuffleArray(cards.filter((item) => unknown.has(item.id)))); setIndex(0); setFinished(false); setFlipped(false); toast('Reviewing cards you marked unknown.') }}>Review weak cards</Button></div>
            </div>
          )}
        </div>

        <aside className="flashcards-side">
          <div className="side-card mastery-card"><h3>Deck mastery</h3><div className="mastery-ring" style={{ '--value': `${mastery * 3.6}deg` }}><div><strong>{mastery}%</strong><small>mastered</small></div></div><ProgressBar value={mastery} tone="green" label="Overall progress" /></div>
          <div className="side-card topics-card"><h3>Topics in this deck</h3><div className="topic-chips">{topics.map((topic) => <span key={topic}>{topic}</span>)}</div></div>
          <div className="side-card next-card"><BrainCircuit size={21} /><h3>Ready for a challenge?</h3><p>Test your recall with an adaptive quiz built from the same material.</p><Link to="/quiz"><Button size="sm" className="full-width" iconRight={ArrowRight}>Take the quiz</Button></Link></div>
          <div className="side-card keyboard-card"><h3>Quick shortcuts</h3><div><kbd>Space</kbd><span>Flip card</span></div><div><kbd>←</kbd><span>Previous</span></div><div><kbd>→</kbd><span>Next</span></div></div>
        </aside>
      </div>
      <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} onGenerate={generate} title="Create AI flashcards" cta="Generate flashcards" generatedTitle="My flashcard deck" />
    </div>
  )
}
