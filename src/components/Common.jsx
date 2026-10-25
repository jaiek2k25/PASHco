import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Crown, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck, Sparkles, User, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

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
  const { authOpen, setAuthOpen, signIn, signUp } = useApp()
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [field, setField] = useState('')

  useEffect(() => {
    if (!authOpen) return
    setError('')
    setField('')
  }, [authOpen, mode])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setField('')

    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your full name.')
      setField('name')
      return
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      setField('email')
      return
    }
    if (password.length < 8) {
      setError('Your password needs at least 8 characters.')
      setField('password')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp({ name: name.trim(), email: email.trim(), password })
      } else {
        await signIn({ email: email.trim(), password })
      }
      setName('')
      setEmail('')
      setPassword('')
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.')
      setField(requestError.field || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      title={mode === 'signup' ? 'Create your WeSolve account' : 'Welcome back'}
      subtitle="Your solves, study sets, notes, and exam plans sync to this account."
      width={470}
    >
      <div className="auth-tabs">
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
      </div>

      {error && <div className="auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === 'signup' && (
          <label>
            <span>Full name</span>
            <div className={`input-with-icon ${field === 'name' ? 'invalid' : ''}`}><User size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" /></div>
          </label>
        )}
        <label>
          <span>Email address</span>
          <div className={`input-with-icon ${field === 'email' ? 'invalid' : ''}`}><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" autoComplete="email" /></div>
        </label>
        <label>
          <span>Password</span>
          <div className={`input-with-icon password-field ${field === 'password' ? 'invalid' : ''}`}>
            <Lock size={17} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <Button type="submit" size="lg" className="full-width" disabled={loading}>
          {loading
            ? <><LoaderCircle className="spin" size={17} /> {mode === 'signup' ? 'Creating your workspace…' : 'Signing you in…'}</>
            : <>{mode === 'signup' ? 'Create free account' : 'Log in'} <ArrowRight size={17} /></>}
        </Button>
      </form>

      <div className="auth-trust"><ShieldCheck size={15} /><span>Passwords are salted and hashed on the server. Sessions use secure, HTTP-only cookies.</span></div>
      <button className="auth-guest" onClick={() => setAuthOpen(false)}>
        <Sparkles size={15} /> Continue as guest — save only on this device
      </button>
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
          <Badge tone="purple">WeSolve Unlimited</Badge>
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
