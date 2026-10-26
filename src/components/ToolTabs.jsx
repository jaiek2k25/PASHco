import { NavLink } from 'react-router-dom'
import { BookOpen, BrainCircuit, ClipboardCheck, Layers3, Search, Sparkles } from 'lucide-react'

const TABS = [
  { to: '/home', label: 'Solver', icon: Sparkles },
  { to: '/tutor', label: 'Whiteboard Tutor', icon: BrainCircuit, badge: 'NEW' },
  { to: '/flashcards', label: 'Flashcards', icon: Layers3 },
  { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
  { to: '/study-guide', label: 'Study Guide', icon: BookOpen },
  { to: '/research', label: 'AI Research', icon: Search, optional: true },
]

export default function ToolTabs() {
  return (
    <div className="tool-tabs-wrap">
      <nav className="tool-tabs">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tool-tab ${isActive ? 'active' : ''} ${tab.optional ? 'optional-tab' : ''}`}>
            <tab.icon size={17} />
            <span>{tab.label}</span>
            {tab.badge && <b>{tab.badge}</b>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
