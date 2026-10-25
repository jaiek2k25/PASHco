import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, BrainCircuit, Check, ChevronDown, CircleHelp, ClipboardCheck, Cloud, CloudOff, Crown, FileClock, GraduationCap, History, KeyRound, Layers3, LoaderCircle, LogOut, Menu, Mic2, NotebookPen, Search, Settings, Sparkles, UserRound, X, Zap } from 'lucide-react'
import { Brand, BrandMark } from './Brand'
import { Badge, Button } from './Common'
import { useApp } from '../context/AppContext'
import { getAiStatus } from '../lib/aiClient'

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/home', label: 'Solver', icon: Sparkles },
      { to: '/research', label: 'AI Research', icon: Search },
      { to: '/history', label: 'History', icon: History },
    ],
  },
  {
    label: 'Study tools',
    items: [
      { to: '/tutor', label: 'Whiteboard Tutor', icon: BrainCircuit, badge: 'NEW' },
      { to: '/flashcards', label: 'Flashcards', icon: Layers3 },
      { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
      { to: '/study-guide', label: 'Study Guide', icon: BookOpen },
      { to: '/notes', label: 'Live Notes', icon: Mic2 },
      { to: '/exam', label: 'Exam Predictor', icon: GraduationCap },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/library', label: 'Study sets', icon: NotebookPen },
      { to: '/account', label: 'Account', icon: Settings },
    ],
  },
]

const TITLES = {
  '/home': 'AI Solver',
  '/research': 'AI Research',
  '/history': 'Solve history',
  '/tutor': 'Whiteboard Tutor',
  '/flashcards': 'Flashcards',
  '/quiz': 'Quiz',
  '/study-guide': 'Study Guide',
  '/notes': 'AI Live Notes',
  '/exam': 'Exam Predictor',
  '/library': 'My library',
  '/account': 'Account & settings',
}

export default function WorkspaceLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, auth, isAuthenticated, setUpgradeOpen, setAuthOpen, signOut, toast, mobileMenuOpen, setMobileMenuOpen, setServiceSettingsOpen, serviceSettingsVersion, syncNow } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [aiStatus, setAiStatus] = useState(null)

  useEffect(() => {
    setMobileMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname, setMobileMenuOpen])

  useEffect(() => {
    let active = true
    getAiStatus().then((status) => { if (active) setAiStatus(status) })
    return () => { active = false }
  }, [serviceSettingsVersion])

  const title = useMemo(() => TITLES[location.pathname] || 'Workspace', [location.pathname])
  const initials = state.user?.name?.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || 'S'

  const submitSearch = (event) => {
    event.preventDefault()
    if (!search.trim()) return
    navigate(`/home?q=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }

  return (
    <div className="workspace-shell">
      {mobileMenuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`workspace-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className="sidebar-course">
          <div className="course-icon"><GraduationCap size={17} /></div>
          <div><small>Current course</small><strong>General studies</strong></div>
          <ChevronDown size={16} />
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <Badge tone="green">{item.badge}</Badge>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {state.plan === 'free' ? (
            <div className="sidebar-plan">
              <div className="sidebar-plan-top"><Crown size={17} /><strong>Unlock unlimited</strong></div>
              <p>{Math.max(0, 2 - state.solvesUsed)} free solves left</p>
              <button onClick={() => setUpgradeOpen(true)}>Upgrade to Pro <Zap size={14} /></button>
            </div>
          ) : (
            <div className="sidebar-plan pro"><Crown size={17} /><div><strong>Pro is active</strong><p>Unlimited everything</p></div></div>
          )}
          <Link className="sidebar-home-link" to="/"><FileClock size={16} /> Back to website</Link>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <BrandMark size={30} className="mobile-brand-mark" />
            <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{title}</strong></div>
          </div>
          <form className="topbar-search" onSubmit={submitSearch}>
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions and tools" />
            <kbd>⏎</kbd>
          </form>
          <div className="topbar-actions">
            <button
              className={`sync-chip ${isAuthenticated ? auth.syncState : 'local'}`}
              onClick={() => isAuthenticated ? syncNow() : setAuthOpen(true)}
              title={isAuthenticated ? 'Sync workspace to your account' : 'Sign in to sync across devices'}
            >
              {auth.syncState === 'saving' ? <LoaderCircle size={15} className="spin" /> : isAuthenticated ? <Cloud size={15} /> : <CloudOff size={15} />}
              <span>{auth.syncState === 'saving' ? 'Saving' : isAuthenticated ? 'Synced' : 'Sign in to sync'}</span>
            </button>
            <button className="icon-button" aria-label="Help" onClick={() => toast('Tip: try a sample question from the Solver home.')}><CircleHelp size={19} /></button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => toast('You are all caught up!')}><Bell size={19} /><span /></button>
            <button className={`ai-status-button ${aiStatus?.configured ? 'connected' : ''}`} onClick={() => setServiceSettingsOpen(true)} title={aiStatus?.configured ? `NVIDIA AI connected (${aiStatus.model})` : 'Connect NVIDIA AI'}><span className="ai-status-dot" /><KeyRound size={16} /><span className="ai-status-label">{aiStatus?.configured ? 'AI on' : 'Connect AI'}</span></button>
            {state.plan === 'free' && <Button size="sm" className="hide-mobile" icon={Crown} onClick={() => setUpgradeOpen(true)}>Upgrade</Button>}
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile menu">
                <span>{initials}</span><ChevronDown size={15} />
              </button>
              {profileOpen && !state.user && (
                <div className="profile-menu guest-menu">
                  <div className="profile-menu-head"><div className="avatar">G</div><div><strong>Guest workspace</strong><small>Not synced</small></div></div>
                  <button onClick={() => { setAuthOpen(true); setProfileOpen(false) }}><Sparkles size={16} /> Create a free account</button>
                  <Link to="/account" onClick={() => setProfileOpen(false)}><Settings size={16} /> Account & settings</Link>
                </div>
              )}
              {profileOpen && state.user && (
                <div className="profile-menu">
                  <div className="profile-menu-head"><div className="avatar">{initials}</div><div><strong>{state.user.name}</strong><small>{state.user.email}</small></div></div>
                  <div className="profile-sync-line">{isAuthenticated ? <><Check size={13} /> Workspace synced to account</> : <><CloudOff size={13} /> Guest — saved on this device</>}</div>
                  <Link to="/account" onClick={() => setProfileOpen(false)}><Settings size={16} /> Account settings</Link>
                  <button onClick={() => setUpgradeOpen(true)}><Crown size={16} /> {state.plan === 'pro' ? 'Manage Pro' : 'Upgrade plan'}</button>
                  <button onClick={() => { signOut(); setProfileOpen(false) }}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="workspace-content"><Outlet /></main>
      </div>

      <nav className="mobile-tabbar">
        {[
          { to: '/home', label: 'Solve', icon: Sparkles },
          { to: '/flashcards', label: 'Cards', icon: Layers3 },
          { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
          { to: '/study-guide', label: 'Guide', icon: BookOpen },
          { to: '/account', label: 'Me', icon: UserRound },
        ].map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
            <item.icon size={19} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
