import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, ChevronDown, Crown, FileText, GraduationCap, Layers3, Mic2, Sparkles, Star, WandSparkles, X, Zap } from 'lucide-react'
import MarketingHeader from '../components/MarketingHeader'
import { Badge, Button } from '../components/Common'
import { useApp } from '../context/AppContext'

const BILLING = {
  weekly: { label: 'Weekly', price: '$0.57', unit: '/day', detail: '$3.99 first week, then $8.99/week', total: '$8.99/week', badge: 'Most Popular' },
  monthly: { label: 'Monthly', price: '$0.30', unit: '/day', detail: '$8.99 billed monthly', total: '$8.99/month', badge: 'Best value' },
  yearly: { label: 'Yearly', price: '$0.19', unit: '/day', detail: '$67.99 billed yearly — save 37%', total: '$67.99/year', badge: 'Save 37%' },
}

const FEATURES = [
  ['Basic solving', 'Limited', 'Unlimited'],
  ['Multi-model verified answers', false, true],
  ['Personalized flashcards', '1 / day', true],
  ['Adaptive quizzes', '1 / day', true],
  ['Realistic mock exams', false, true],
  ['Cheat sheet generation', false, true],
  ['AI live notes', '10 min / day', true],
  ['AI writing tools', false, true],
  ['Faster response & better accuracy', false, true],
  ['Available on every device', true, true],
]

const INCLUDED = [
  { icon: Sparkles, title: 'AI Solver', body: 'Up to 95% accurate, step-by-step solutions' },
  { icon: Layers3, title: 'AI Flashcards & Quizzes', body: 'Create flashcards and quizzes from any file' },
  { icon: GraduationCap, title: 'AI Mock Exam', body: 'Realistic mock tests with cheat sheet generation' },
  { icon: FileText, title: 'AI Writing Tools', body: 'Humanize text, detect AI, check plagiarism, and more' },
  { icon: Mic2, title: 'AI Live Notes', body: 'Instant notes and summaries while you study' },
  { icon: WandSparkles, title: 'AI Humanizer', body: 'Detect AI and humanize in one click' },
]

const REVIEWS = [
  ['Easily explains college level calculus', 'Easily solves and explains college level calculus. Gives all the steps and explanations for free.', 'Joshua Blackburn', 'Ohio State University'],
  ['Truly impressed', 'The explanation not only allowed me to reach an answer with ease, but also guided me to understand how that answer was found.', 'Aileen Chen', 'UC Berkeley'],
  ['Helped me pass my stat class', 'This actually helped me pass my stat class. It can answer almost any problem including word problems.', 'Effie Bonner', 'University of Chicago'],
  ['Smart, convenient and free', 'The app works great. Very convenient and easy to use and understand. It shows all the solving steps for free.', 'Sophia Campbell', 'Texas A&M University'],
]

const FAQS = [
  ['How does WeSolve Unlimited Subscription work?', 'From the date of subscription, you get unlimited scans for solving questions, unlimited step explanations, and unlimited AI tutor usage. In this local demo, activating Pro instantly unlocks every feature without payment.'],
  ['How does WeSolve work?', 'Scan — fit your problem in the box and take a snap, or upload a photo. Solve — the app recognizes characters through OCR and computes the process. Explain — ask a follow-up when a step is unclear.'],
  ['How to cancel subscription?', 'A real subscription can be cancelled at any time from the account page. This prototype has no billing connection, so you can switch back to Free at any time in Account settings.'],
  ['How to pause subscription?', 'Stripe subscriptions can be paused from the account page. App Store pausing is not currently supported. This demo does not create recurring charges.'],
  ['I already subscribed. Why isn’t my subscription showing?', 'Check that you are logged into the correct account, verify that payment succeeded, and use the “Sync mobile account to web” option in a production account.'],
]

function Value({ value }) {
  if (value === true) return <span className="table-check"><Check size={16} /></span>
  if (value === false) return <span className="table-x"><X size={16} /></span>
  return <span>{value}</span>
}

export default function Pricing() {
  const navigate = useNavigate()
  const { state, setPlan, toast } = useApp()
  const [billing, setBilling] = useState('weekly')
  const [faq, setFaq] = useState(0)
  const plan = BILLING[billing]

  const activate = () => {
    setPlan('pro')
    toast('Pro activated — enjoy the full demo workspace!')
    window.setTimeout(() => navigate('/home'), 500)
  }

  return (
    <div className="pricing-page">
      <MarketingHeader active="pricing" />
      <main>
        <section className="pricing-hero">
          <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
          <div className="container pricing-hero-inner">
            <Badge tone="purple"><Star size={13} fill="currentColor" /> One plan for all your AI study tools</Badge>
            <h1>Study Faster <span>🚀</span><br />Score Higher <span>📈</span><br /><em>Unlock Pro</em></h1>
            <p>One plan for all your AI study tools. Cancel anytime in a production account.</p>
            <div className="billing-switch">
              {Object.entries(BILLING).map(([key, value]) => <button key={key} onClick={() => setBilling(key)} className={billing === key ? 'active' : ''}>{value.label}{key === 'yearly' && <small>Save 37%</small>}</button>)}
            </div>
          </div>
        </section>

        <section className="pricing-cards-section">
          <div className="container pricing-grid">
            <article className="price-card free-card">
              <div className="price-card-top"><span className="price-icon"><Zap size={20} /></span><div><small>Free</small><h2>Starter</h2></div><Badge tone="gray">Current plan</Badge></div>
              <div className="price-value"><strong>$0</strong><span>/ forever</span></div>
              <p>Limited access to solutions. Perfect for trying the core study workflow.</p>
              <Button variant="outline" size="lg" className="full-width" disabled={state.plan === 'free'} onClick={() => setPlan('free')}>{state.plan === 'free' ? 'Current plan' : 'Switch to Free'}</Button>
              <div className="price-includes"><p>Includes:</p><div><Check size={15} /> 2 solves</div><div><Check size={15} /> Basic step-by-step explanations</div><div><Check size={15} /> 1 study set per day</div><div><Check size={15} /> 10 minutes of tutor per day</div></div>
            </article>

            <article className="price-card pro-card">
              <div className="popular-ribbon"><Crown size={14} /> {plan.badge}</div>
              <div className="price-card-top"><span className="price-icon"><Crown size={20} /></span><div><small>Unlimited</small><h2>WeSolve Pro</h2></div><Badge tone="purple">PRO</Badge></div>
              <div className="price-value"><strong>{plan.price}</strong><span>{plan.unit}</span></div>
              <p className="price-detail">{plan.detail}</p>
              <Button size="lg" className="full-width" iconRight={ArrowRight} onClick={activate}>Unlock Pro</Button>
              <div className="pro-feature-grid">
                {INCLUDED.map((item) => <div key={item.title}><span><item.icon size={17} /></span><div><strong>{item.title}</strong><small>{item.body}</small></div></div>)}
              </div>
              <p className="demo-payment-note">Demo only — no payment is requested or processed.</p>
            </article>
          </div>
        </section>

        <section className="comparison-section">
          <div className="container">
            <div className="section-heading centered"><div className="section-kicker">EVERYTHING INCLUDED</div><h2>Everything Included in Pro</h2><p>More than a solver — a complete study system.</p></div>
            <div className="comparison-table">
              <div className="comparison-head"><span>Features</span><strong>Free</strong><strong><Crown size={15} /> Pro</strong></div>
              {FEATURES.map(([label, free, pro]) => <div className="comparison-row" key={label}><span>{label}</span><div><Value value={free} /></div><div><Value value={pro} /></div></div>)}
            </div>
          </div>
        </section>

        <section className="pricing-reviews">
          <div className="container">
            <div className="section-heading centered"><div className="section-kicker">STUDENT STORIES</div><h2>Boost your GPA 10x faster</h2></div>
            <div className="pricing-review-grid">{REVIEWS.map(([title, quote, name, school]) => <article key={name}><div className="stars">★★★★★</div><h3>{title}</h3><p>“{quote}”</p><div><strong>{name}</strong><small>{school}</small></div></article>)}</div>
          </div>
        </section>

        <section className="pricing-faq">
          <div className="container pricing-faq-layout">
            <div><div className="section-kicker">FAQ</div><h2>Questions before upgrading?</h2><p>Everything about plans, billing, and the demo workspace.</p></div>
            <div className="faq-list">{FAQS.map(([question, answer], index) => <div className={`faq-item ${faq === index ? 'open' : ''}`} key={question}><button onClick={() => setFaq(faq === index ? -1 : index)}><span>{question}</span><ChevronDown size={19} /></button>{faq === index && <p>{answer}</p>}</div>)}</div>
          </div>
        </section>
      </main>
      <footer className="simple-footer"><div className="container"><span>© 2026 WeSolve · All rights reserved</span><div><button onClick={() => navigate('/')}>Home</button><button onClick={() => navigate('/home')}>Workspace</button><button onClick={() => toast('This is a local demo; no payment is processed.')}>Terms</button></div></div></footer>
    </div>
  )
}
