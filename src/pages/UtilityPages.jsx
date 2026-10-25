import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check, Chrome, ClipboardCheck, Copy, Crown, Download, ExternalLink, FileText, GraduationCap, History, KeyRound, Layers3, LogOut, Mail, NotebookPen, Plus, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, Smartphone, Sparkles, Star, Trash2, Upload, UserRound, X, Zap } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import MarketingHeader from '../components/MarketingHeader'
import { Badge, Button, EmptyState, Modal, ProgressBar, Segmented } from '../components/Common'
import { useApp } from '../context/AppContext'
import { downloadText, safeFileName, truncate, wordCount } from '../lib/intelligence'
import { getAiStatus } from '../lib/aiClient'
import { getServiceSettings, maskKey } from '../lib/serviceSettings'

export function HistoryPage() {
  const { state, deleteHistory, clearHistory, toast } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All')
  const [selected, setSelected] = useState(null)

  const subjects = ['All', ...new Set(state.history.map((item) => item.subject))]
  const items = useMemo(() => state.history.filter((item) => (subject === 'All' || item.subject === subject) && item.question.toLowerCase().includes(query.toLowerCase())), [state.history, query, subject])

  const exportHistory = () => {
    const text = state.history.map((item) => `# ${item.question}\n\nSubject: ${item.subject}\nFinal answer: ${item.finalAnswer}\n\n${item.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.body}`).join('\n')}`).join('\n\n---\n\n')
    downloadText('wesolve-solve-history.md', text || 'No solve history yet.', 'text/markdown')
  }

  return (
    <div className="app-page history-page">
      <ToolTabs />
      <PageHeader eyebrow="HISTORY" title="Your solve history" description="Every question, answer, and verification stays available in this browser." actions={<><Button variant="outline" icon={Download} onClick={exportHistory}>Export</Button><Button icon={Plus} onClick={() => navigate('/home')}>New solve</Button></>} />
      <div className="history-filters"><div className="input-with-icon"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions…" /></div><Segmented size="sm" value={subject} onChange={setSubject} options={subjects.map((item) => ({ value: item, label: item }))} />{state.history.length > 0 && <Button variant="ghost" size="sm" icon={Trash2} onClick={clearHistory}>Clear all</Button>}</div>
      {items.length === 0 ? <EmptyState icon={History} title="No matching questions" description="Your solved questions will appear here. Try a sample from the Solver page." action={<Link to="/home"><Button icon={Sparkles}>Ask a question</Button></Link>} /> : <div className="history-list">{items.map((item) => <article className="history-item" key={item.id}><div className="history-icon"><Sparkles size={19} /></div><div className="history-copy"><div className="history-item-top"><Badge tone="purple">{item.subject}</Badge><span>{new Date(item.createdAt).toLocaleString()}</span></div><h3>{item.question}</h3><p><strong>{item.finalAnswer}</strong> · {truncate(item.answerText, 100)}</p><div className="history-checks"><Check size={14} /> {item.checks?.filter((check) => check.passed).length || 0} checks passed · {item.confidence}% confidence</div></div><div className="history-actions"><button onClick={() => setSelected(item)}>View</button><Link to={`/home?q=${encodeURIComponent(item.question)}`}><ArrowRight size={17} /></Link><button onClick={() => deleteHistory(item.id)}><Trash2 size={16} /></button></div></article>)}</div>}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.subject || 'Solution'} subtitle={selected && new Date(selected.createdAt).toLocaleString()} width={760}>
        {selected && <div className="history-detail"><h3>{selected.question}</h3><div className="final-answer compact"><div className="final-label">FINAL ANSWER</div><strong>{selected.finalAnswer}</strong><p>{selected.answerText}</p></div><div className="steps-list compact">{selected.steps.map((step, index) => <article className="step-card" key={step.title}><div className="step-number">STEP {index + 1}</div><h4>{step.title}</h4><p>{step.body}</p></article>)}</div><div className="modal-actions"><Button variant="outline" icon={Copy} onClick={() => { navigator.clipboard?.writeText(`${selected.finalAnswer}\n${selected.steps.map((step) => step.body).join('\n')}`); toast('Answer copied.') }}>Copy answer</Button><Link to={`/home?q=${encodeURIComponent(selected.question)}`}><Button iconRight={ArrowRight}>Solve again</Button></Link></div></div>}
      </Modal>
    </div>
  )
}

export function LibraryPage() {
  const { state, setCurrentPack, deleteStudySet } = useApp()
  const [tab, setTab] = useState('sets')
  const navigate = useNavigate()

  return (
    <div className="app-page library-page">
      <ToolTabs />
      <PageHeader eyebrow="LIBRARY" title="All your study work in one place" description="Study sets, lecture notes, research drafts, and exam plans are saved locally." actions={<Button icon={Plus} onClick={() => navigate('/study-guide')}>Create new</Button>} />
      <div className="library-stats">{[
        { icon: Layers3, value: state.studySets.length, label: 'Study sets', tone: 'purple' },
        { icon: NotebookPen, value: state.notes.length, label: 'Lecture notes', tone: 'blue' },
        { icon: FileText, value: state.research.length, label: 'Research drafts', tone: 'green' },
        { icon: GraduationCap, value: state.exams.length, label: 'Exam plans', tone: 'orange' },
      ].map((item) => <div key={item.label}><span className={`stat-icon ${item.tone}`}><item.icon size={20} /></span><div><strong>{item.value}</strong><small>{item.label}</small></div></div>)}</div>
      <div className="library-tabs">{[['sets', 'Study sets'], ['notes', 'Notes'], ['research', 'Research'], ['exams', 'Exams']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className="library-content">
        {tab === 'sets' && (state.studySets.length ? <div className="library-grid">{state.studySets.map((pack) => <article className="library-card" key={pack.id}><div className="library-card-icon"><BookOpen size={21} /></div><Badge tone="purple">Study set</Badge><h3>{pack.title}</h3><p>{truncate(pack.summary || pack.guide?.summary || '', 110)}</p><div className="library-card-meta"><span><Layers3 size={14} /> {pack.flashcards?.length || 0} cards</span><span><ClipboardCheck size={14} /> {pack.quiz?.length || 0} questions</span></div><div className="library-card-actions"><Button size="sm" onClick={() => { setCurrentPack(pack.id); navigate('/study-guide') }}>Open</Button><Button size="sm" variant="outline" onClick={() => { setCurrentPack(pack.id); navigate('/quiz') }}>Quiz</Button><button onClick={() => deleteStudySet(pack.id)}><Trash2 size={16} /></button></div></article>)}</div> : <EmptyState icon={BookOpen} title="No study sets" description="Generate your first guide, flashcards, and quiz from any material." action={<Link to="/study-guide"><Button icon={Plus}>Create study set</Button></Link>} />)}
        {tab === 'notes' && (state.notes.length ? <div className="library-list">{state.notes.map((note) => <article key={note.id}><span><NotebookPen size={19} /></span><div><h3>{note.course}</h3><p>{truncate(note.summary, 150)}</p><small>{new Date(note.createdAt).toLocaleString()} · {wordCount(note.transcript)} words</small></div><Button size="sm" variant="outline" onClick={() => navigate('/notes')}>Open notes</Button></article>)}</div> : <EmptyState icon={NotebookPen} title="No lecture notes" description="Record a lecture or paste a transcript to generate structured notes." action={<Link to="/notes"><Button icon={MicIcon}>Create notes</Button></Link>} />)}
        {tab === 'research' && (state.research.length ? <div className="library-list">{state.research.map((report) => <article key={report.id}><span><FileText size={19} /></span><div><h3>{report.title}</h3><p>{truncate(report.sections[0]?.paragraphs[0] || '', 150)}</p><small>{new Date(report.createdAt).toLocaleString()} · {report.targetWords} word target</small></div><Button size="sm" variant="outline" onClick={() => navigate('/research')}>Open report</Button></article>)}</div> : <EmptyState icon={FileText} title="No research drafts" description="Turn a topic and sources into a structured academic draft." action={<Link to="/research"><Button icon={Search}>Start research</Button></Link>} />)}
        {tab === 'exams' && (state.exams.length ? <div className="library-grid">{state.exams.map((exam) => <article className="library-card" key={exam.id}><div className="library-card-icon"><GraduationCap size={21} /></div><Badge tone="green">Exam plan</Badge><h3>{exam.details?.exam || 'Exam'}</h3><p>Diagnostic result and a personalized 7-day plan based on {exam.packTitle}.</p><div className="library-card-meta"><span><CalendarDays size={14} /> {exam.details?.date}</span><span><Star size={14} /> {exam.result?.predictedScore}% predicted</span></div><div className="library-card-actions"><Button size="sm" onClick={() => navigate('/exam')}>Open plan</Button><button onClick={() => downloadText(`${safeFileName(exam.details?.exam || 'exam')}-result.txt`, JSON.stringify(exam, null, 2))}><Download size={16} /></button></div></article>)}</div> : <EmptyState icon={GraduationCap} title="No exam plans" description="Take a diagnostic to predict your score and build a daily review plan." action={<Link to="/exam"><Button icon={GraduationCap}>Start exam prep</Button></Link>} />)}
      </div>
    </div>
  )
}

function MicIcon(props) {
  return <svg viewBox="0 0 24 24" width={props.size || 17} height={props.size || 17} fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></svg>
}

export function AccountPage() {
  const {
    state, auth, isAuthenticated, setAuthOpen, signOut, setUpgradeOpen, updateOnboarding,
    updateSettings, resetWorkspace, toast, setServiceSettingsOpen, serviceSettingsVersion,
    updateProfile, changePassword, deleteAccount, syncNow, setPlan,
  } = useApp()
  const [name, setName] = useState(state.user?.name || '')
  const [level, setLevel] = useState(state.onboarding.level || '')
  const [goal, setGoal] = useState(state.onboarding.goal || '')
  const [aiStatus, setAiStatus] = useState(null)
  const [serviceSettings, setLocalServiceSettings] = useState(getServiceSettings)
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    let active = true
    setLocalServiceSettings(getServiceSettings())
    getAiStatus().then((status) => { if (active) setAiStatus(status) })
    return () => { active = false }
  }, [serviceSettingsVersion])

  useEffect(() => {
    setName(state.user?.name || '')
  }, [state.user?.name])

  const initials = (state.user?.name || 'W').split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  const joined = state.user?.joinedAt ? new Date(state.user.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const syncLabel = {
    synced: { text: 'Synced to account', tone: 'green' },
    saving: { text: 'Saving changes…', tone: 'purple' },
    pending: { text: 'Changes queued', tone: 'purple' },
    error: { text: 'Sync needs attention', tone: 'gray' },
    local: { text: 'Saved on this device', tone: 'gray' },
    offline: { text: 'Offline — local only', tone: 'gray' },
  }[auth.syncState] || { text: 'Local only', tone: 'gray' }

  const saveProfile = async () => {
    if (!name.trim()) {
      toast('Enter your name first.', 'error')
      return
    }
    setSavingProfile(true)
    try {
      if (isAuthenticated) await updateProfile({ name: name.trim() })
      else toast('Profile saved on this device. Create an account to sync it.')
    } catch (error) {
      toast(error.message || 'Could not save your profile.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    if (passwordForm.next.length < 8) {
      toast('Your new password needs at least 8 characters.', 'error')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast('The new passwords do not match.', 'error')
      return
    }
    setPasswordBusy(true)
    try {
      await changePassword({ currentPassword: passwordForm.current, nextPassword: passwordForm.next })
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (error) {
      toast(error.message || 'Could not change your password.', 'error')
    } finally {
      setPasswordBusy(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await deleteAccount(deletePassword)
      setDeleteOpen(false)
      setDeletePassword('')
    } catch (error) {
      toast(error.message || 'Could not delete your account.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="app-page account-page">
      <ToolTabs />
      <PageHeader eyebrow="ACCOUNT" title="Account & settings" description="Manage your WeSolve profile, synced workspace, and security." />

      <div className="account-layout">
        <div className="account-main">
          <section className="account-card profile-card">
            <div className="account-card-head">
              <div><h2>Profile</h2><p>{isAuthenticated ? 'This profile is stored in your WeSolve account.' : 'You are working as a guest on this device.'}</p></div>
              <span className="avatar large">{initials}</span>
            </div>
            {isAuthenticated ? (
              <div className="profile-form">
                <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
                <label><span>Email</span><div className="input-with-icon readonly-field"><Mail size={16} /><input value={state.user.email} readOnly /></div></label>
                <div className="profile-meta"><span>Member since {joined}</span><span>{state.user.email}</span></div>
                <div className="profile-actions">
                  <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</Button>
                  <Button variant="outline" icon={LogOut} onClick={signOut}>Sign out</Button>
                </div>
              </div>
            ) : (
              <div className="signed-out">
                <UserRound size={24} />
                <h3>Create an account to sync everything</h3>
                <p>Right now your solves, study sets, and notes live only in this browser. An account keeps them on the server and available on any device.</p>
                <Button icon={ArrowRight} onClick={() => setAuthOpen(true)}>Create free account</Button>
              </div>
            )}
          </section>

          <section className="account-card sync-card">
            <div className="account-card-head">
              <div><h2>Workspace sync</h2><p>Your study data follows you across devices when you are signed in.</p></div>
              <Badge tone={syncLabel.tone}>{syncLabel.text}</Badge>
            </div>
            <div className="sync-grid">
              <div><span>Solves</span><strong>{state.history.length}</strong></div>
              <div><span>Study sets</span><strong>{state.studySets.length}</strong></div>
              <div><span>Notes</span><strong>{state.notes.length}</strong></div>
              <div><span>Research</span><strong>{state.research.length}</strong></div>
              <div><span>Exam plans</span><strong>{state.exams.length}</strong></div>
              <div><span>Settings</span><strong>Synced</strong></div>
            </div>
            {auth.error && <p className="sync-error">{auth.error}</p>}
            <div className="sync-actions">
              <span>{auth.syncedAt ? `Last saved ${new Date(auth.syncedAt).toLocaleString()}` : isAuthenticated ? 'Waiting for the first sync…' : 'Sign in to enable cloud sync'}</span>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => syncNow()}>{isAuthenticated ? 'Sync now' : 'Sign in to sync'}</Button>
            </div>
          </section>

          <section className="account-card">
            <div className="account-card-head"><div><h2>Learning preferences</h2><p>We use these to tune recommendations and explanations.</p></div><Settings size={20} /></div>
            <div className="preference-grid">
              <label><span>Education level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Select level</option><option>Middle School</option><option>High School</option><option>Community college</option><option>University & college</option><option>Other</option></select></label>
              <label><span>Main goal</span><select value={goal} onChange={(event) => setGoal(event.target.value)}><option value="">Select a goal</option><option>Finish homework faster</option><option>Prepare for an exam</option><option>Understand difficult concepts</option><option>Improve my GPA</option></select></label>
            </div>
            <Button variant="outline" icon={Check} onClick={() => { updateOnboarding({ level, goal, completed: true }); toast('Learning preferences saved.') }}>Save preferences</Button>
          </section>

          <section className="account-card">
            <div className="account-card-head"><div><h2>App settings</h2><p>Control voice, layout, and productivity features.</p></div></div>
            <div className="settings-list">
              {[
                ['voiceEnabled', 'Voice explanations', 'Read tutor steps and study notes aloud.'],
                ['compactMode', 'Compact workspace', 'Reduce spacing in lists and cards.'],
                ['emailUpdates', 'Study reminders', 'Show local reminder prompts in the workspace.'],
              ].map(([key, title, description]) => (
                <label className="toggle-row" key={key}>
                  <div><strong>{title}</strong><small>{description}</small></div>
                  <input type="checkbox" checked={Boolean(state.settings[key])} onChange={(event) => updateSettings({ [key]: event.target.checked })} />
                  <span className="toggle" />
                </label>
              ))}
            </div>
          </section>

          {isAuthenticated && (
            <section className="account-card security-card">
              <div className="account-card-head"><div><h2>Security</h2><p>Passwords are hashed with scrypt and sessions use HTTP-only cookies.</p></div><ShieldCheck size={20} /></div>
              <form className="password-form" onSubmit={submitPassword}>
                <label><span>Current password</span><input type="password" value={passwordForm.current} onChange={(event) => setPasswordForm((form) => ({ ...form, current: event.target.value }))} autoComplete="current-password" /></label>
                <div className="preference-grid">
                  <label><span>New password</span><input type="password" value={passwordForm.next} onChange={(event) => setPasswordForm((form) => ({ ...form, next: event.target.value }))} autoComplete="new-password" /></label>
                  <label><span>Confirm new password</span><input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((form) => ({ ...form, confirm: event.target.value }))} autoComplete="new-password" /></label>
                </div>
                <Button type="submit" variant="outline" icon={Lock} disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Change password'}</Button>
              </form>
              <div className="danger-zone">
                <div><strong>Delete account</strong><p>Removes the profile and all synced study data from this server. This cannot be undone.</p></div>
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete account</Button>
              </div>
            </section>
          )}
        </div>

        <aside className="account-side">
          <div className={`account-plan ${state.plan === 'pro' ? 'pro' : ''}`}>
            <Crown size={24} />
            <Badge tone={state.plan === 'pro' ? 'light' : 'gray'}>{state.plan === 'pro' ? 'PRO ACTIVE' : 'FREE PLAN'}</Badge>
            <h2>{state.plan === 'pro' ? 'WeSolve Unlimited' : 'Starter'}</h2>
            <p>{state.plan === 'pro' ? 'Every study tool is unlocked for your account.' : `${Math.max(0, 2 - state.solvesUsed)} of 2 free solves remaining.`}</p>
            <ProgressBar value={state.plan === 'pro' ? 100 : Math.min(100, (state.solvesUsed / 2) * 100)} label="Plan usage" tone={state.plan === 'pro' ? 'green' : 'purple'} />
            <Button variant={state.plan === 'pro' ? 'outline' : 'primary'} className="full-width" onClick={() => state.plan === 'pro' ? setPlan('free') : setUpgradeOpen(true)}>{state.plan === 'pro' ? 'Switch to Free' : 'Upgrade to Pro'}</Button>
          </div>

          <div className="side-card usage-card">
            <h3>Workspace usage</h3>
            <div><span>Solves</span><strong>{state.history.length}</strong></div>
            <div><span>Study sets</span><strong>{state.studySets.length}</strong></div>
            <div><span>Notes</span><strong>{state.notes.length}</strong></div>
            <div><span>Research drafts</span><strong>{state.research.length}</strong></div>
            <div><span>Exam plans</span><strong>{state.exams.length}</strong></div>
          </div>

          <div className="side-card connection-card">
            <div className="side-card-head"><h3>Connected services</h3><Badge tone={aiStatus?.configured ? 'green' : 'gray'}>{aiStatus?.configured ? 'AI ON' : 'LOCAL'}</Badge></div>
            <div className="connection-row"><span><KeyRound size={17} /></span><div><strong>NVIDIA Build</strong><small>{aiStatus?.configured ? `Connected · ${aiStatus.model}` : serviceSettings.nvidiaApiKey ? `Key saved ${maskKey(serviceSettings.nvidiaApiKey)}` : 'No API key connected'}</small></div></div>
            <div className="connection-row"><span><UserRound size={17} /></span><div><strong>WeSolve account</strong><small>{isAuthenticated ? state.user.email : 'Guest workspace'}</small></div></div>
            <Button variant="outline" size="sm" className="full-width" icon={Settings} onClick={() => setServiceSettingsOpen(true)}>Manage AI settings</Button>
          </div>

          <div className="side-card danger-card">
            <ShieldCheck size={20} />
            <h3>Local workspace data</h3>
            <p>This browser keeps a copy of your workspace. Reset it to start fresh; signed-in accounts keep the server copy until the next sync.</p>
            <Button variant="danger" size="sm" className="full-width" icon={RotateCcw} onClick={resetWorkspace}>Reset workspace</Button>
          </div>
        </aside>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your WeSolve account?"
        subtitle="This removes your profile and every synced solve, study set, note, and exam plan."
        footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Keep account</Button><Button variant="danger" icon={Trash2} onClick={confirmDelete} disabled={deleteBusy || !deletePassword}>{deleteBusy ? 'Deleting…' : 'Delete permanently'}</Button></>}
      >
        <label className="field-label"><span>Confirm with your password</span><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Your current password" autoComplete="current-password" /></label>
      </Modal>
    </div>
  )
}

export function DownloadPage() {
  const { toast } = useApp()
  return (
    <div className="download-page">
      <MarketingHeader />
      <main className="container download-layout">
        <div className="download-copy"><Badge tone="purple"><Smartphone size={14} /> WeSolve anywhere</Badge><h1>Your AI study tools,<br /><span>wherever you study.</span></h1><p>Solve homework from your phone, capture lectures on your laptop, and take the Chrome extension anywhere on the web.</p><div className="download-buttons"><button onClick={() => toast('Mobile app download is simulated in this demo.')}><span>●●</span><div><small>Download on the</small><strong>App Store</strong></div></button><button onClick={() => toast('Mobile app download is simulated in this demo.')}><span>▶</span><div><small>GET IT ON</small><strong>Google Play</strong></div></button></div><div className="download-features"><div><Check size={16} /> Scan and solve anything</div><div><Check size={16} /> Sync study sets across devices</div><div><Check size={16} /> Record lectures in real time</div></div></div>
        <div className="download-visual"><div className="phone-frame"><div className="phone-notch" /><div className="phone-screen"><div className="phone-head"><span><Sparkles size={15} /></span><strong>WeSolve AI</strong><small>Fast ▾</small></div><div className="phone-question">Solve for x<br /><b>3x + 6 = 42</b></div><div className="phone-step"><small>STEP 2</small><p>Subtract 6 from both sides</p><strong>3x = 36</strong></div><div className="phone-answer"><small>FINAL ANSWER</small><strong>x = 12</strong></div><div className="phone-tabs"><span>Answer</span><span>Steps</span><span>Video</span></div></div></div><div className="qr-card"><div className="qr-grid">{Array.from({ length: 81 }).map((_, index) => <i key={index} className={[0, 1, 2, 8, 10, 16, 18, 19, 20, 24, 26, 28, 32, 36, 38, 40, 44, 46, 48, 52, 54, 56, 60, 61, 62, 64, 70, 72, 78, 79, 80].includes(index) ? 'on' : ''} />)}</div><p>Scan to open the web app</p></div></div>
      </main>
      <section className="extension-section"><div className="container extension-card"><div><Badge tone="light"><Chrome size={14} /> Chrome Extension</Badge><h2>Solve anywhere on the web</h2><p>Highlight a question on Canvas, Blackboard, Moodle, or any webpage and get step-by-step help without switching tabs.</p><Button variant="light" icon={ExternalLink} onClick={() => toast('Extension install is simulated in this demo.')}>Get the Chrome Extension</Button></div><div className="extension-preview"><div className="browser-bar"><span /><span /><span /><div>https://learning.example/quiz</div></div><div className="browser-content"><h4>Question 4</h4><p>Solve for x: <strong>3x + 6 = 42</strong></p><div className="extension-popup"><div><Sparkles size={17} /><strong>WeSolve AI</strong></div><p>Subtract 6, then divide by 3.</p><b>x = 12</b><button>Explain further</button></div></div></div></div></section>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="not-found-page"><MarketingHeader /><main className="container not-found-inner"><div className="not-found-art"><span>404</span><div className="planet" /><div className="sparkle one">✦</div><div className="sparkle two">✧</div></div><Badge tone="purple">Page not found</Badge><h1>Oops! This page has been removed.</h1><p>But don’t worry — explore our study tools and get expert homework help from the workspace.</p><div><Link to="/home"><Button size="lg" iconRight={ArrowRight}>Ask your question now</Button></Link><Link to="/"><Button size="lg" variant="outline">Go to homepage</Button></Link></div></main></div>
  )
}
