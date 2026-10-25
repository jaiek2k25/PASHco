import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Chrome, Crown, LoaderCircle, Lock, Mail, Settings, ShieldCheck, Sparkles, User, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getServiceSettings } from '../lib/serviceSettings'
import { renderGoogleButton, verifyGoogleCredential } from '../lib/googleAuth'

export function Button({ children, variant = 'primary', size = 'md', className = '', icon: Icon, iconRight: IconRight, ...props }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} />}
      <span>{children}</span>
      {IconRight && <IconRight size={size === 'sm' ? 15 : 17} />}
    </button>
  )
}

export function Badge({ children, tone = 'purple', className = '' }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>
}

export function Modal({ open, onClose, title, subtitle, children, width = 520, footer = null }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="modal-card" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        {title && <div className="modal-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>}
        <div className="modal-content">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ToastHost() {
  const { toasts, removeToast } = useApp()
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.type === 'error' ? AlertCircle : CheckCircle2
        return (
          <button key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <Icon size={18} />
            <span>{toast.message}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AuthModal() {
  const { authOpen, setAuthOpen, signIn, setServiceSettingsOpen, serviceSettingsVersion, toast } = useApp()
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleError, setGoogleError] = useState('')
  const googleButtonRef = useRef(null)

  useEffect(() => {
    if (!authOpen) return
    const settings = getServiceSettings()
    setGoogleClientId(settings.googleClientId || '')
    setGoogleError('')
  }, [authOpen, serviceSettingsVersion])

  useEffect(() => {
    if (!authOpen || !googleClientId || !googleButtonRef.current) return undefined
    let cancelled = false
    renderGoogleButton(googleButtonRef.current, googleClientId, async ({ credential }) => {
      try {
        const profile = await verifyGoogleCredential(credential, googleClientId)
        signIn(profile)
        toast(`Signed in with Google as ${profile.email}.`)
      } catch (error) {
        setGoogleError(error.message || 'Google sign-in failed.')
      }
    }).catch((error) => {
      if (!cancelled) setGoogleError(error.message || 'Google sign-in is unavailable.')
    })
    return () => { cancelled = true }
  }, [authOpen, googleClientId, serviceSettingsVersion, signIn, toast])

  const submit = (event) => {
    event.preventDefault()
    if (mode === 'signup' && !name.trim()) return
    if (!email.trim() || !email.includes('@')) return
    setLoading(true)
    window.setTimeout(() => {
      signIn({ name: name || email.split('@')[0], email })
      setLoading(false)
      setName('')
      setEmail('')
    }, 650)
  }

  return (
    <Modal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      title={mode === 'signup' ? 'Create your free account' : 'Welcome back'}
      subtitle="Save solves, study sets, notes, and your exam plan in this browser."
      width={470}
    >
      <div className="auth-tabs">
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && (
          <label>
            <span>Full name</span>
            <div className="input-with-icon"><User size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></div>
          </label>
        )}
        <label>
          <span>Email address</span>
          <div className="input-with-icon"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" /></div>
        </label>
        <label>
          <span>Password</span>
          <div className="input-with-icon"><Lock size={17} /><input type="password" defaultValue="demo-pass-2026" placeholder="••••••••" /></div>
        </label>
        <Button type="submit" size="lg" className="full-width" disabled={loading}>
          {loading ? <><LoaderCircle className="spin" size={17} /> Creating workspace…</> : <>{mode === 'signup' ? 'Continue for free' : 'Log in'} <ArrowRight size={17} /></>}
        </Button>
      </form>
      <div className="auth-divider"><span>or continue with</span></div>
      {googleClientId ? (
        <div className="google-oauth-wrap">
          <div ref={googleButtonRef} className="google-button-host" />
          {googleError && <p className="google-error">{googleError}</p>}
        </div>
      ) : (
        <button className="connect-google-button" onClick={() => { setAuthOpen(false); setServiceSettingsOpen(true) }}><Chrome size={18} /> Configure Google sign-in <Settings size={15} /></button>
      )}
      <div className="auth-socials demo-socials">
        <button onClick={() => signIn({ name: 'Demo Student', email: 'student@demo.local' })}><Sparkles size={18} /> Demo account</button>
        <button onClick={() => signIn({ name: 'Guest Learner', email: 'guest@demo.local' })}><span className="apple-glyph">●</span> Guest</button>
      </div>
      <p className="auth-note"><ShieldCheck size={15} /> Google IDs are verified with Google; demo accounts stay entirely in this browser.</p>
    </Modal>
  )
}

export function UpgradeModal() {
  const { upgradeOpen, setUpgradeOpen, setPlan } = useApp()
  return (
    <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} width={680}>
      <div className="upgrade-modal">
        <div className="upgrade-art">
          <div className="upgrade-orb"><Crown size={34} /></div>
          <Sparkles className="upgrade-spark one" size={20} />
          <Sparkles className="upgrade-spark two" size={16} />
        </div>
        <div className="upgrade-content">
          <Badge tone="purple">Solvely Unlimited</Badge>
          <h2>One plan. Every AI study tool.</h2>
          <p>Use unlimited step-by-step solutions, verified answers, flashcards, quizzes, mock exams, and live notes.</p>
          <div className="upgrade-checks">
            {['Unlimited homework help', 'Multi-model answer verification', 'Personalized study guides', 'Adaptive quizzes & exam plans'].map((item) => (
              <div key={item}><span><Check size={14} /></span>{item}</div>
            ))}
          </div>
          <div className="upgrade-price"><strong>$0.57</strong><span>/ day</span><small>$3.99 first week, then $8.99/week</small></div>
          <Button size="lg" className="full-width" onClick={() => setPlan('pro')} iconRight={ArrowRight}>Activate Pro in demo</Button>
          <p className="upgrade-note">This is a local demo. No payment will be requested or processed.</p>
        </div>
      </div>
    </Modal>
  )
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={24} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={`segmented segmented-${size}`}>
      {options.map((option) => (
        <button key={option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>
          {option.icon && <option.icon size={15} />}{option.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, tone = 'purple', label = null }) {
  return (
    <div className="progress-wrap">
      {(label || typeof value === 'number') && <div className="progress-label"><span>{label}</span><strong>{Math.round(value)}%</strong></div>}
      <div className="progress-track"><div className={`progress-fill progress-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  )
}
