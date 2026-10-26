import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, KeyRound } from 'lucide-react'
import { Brand } from './Brand'
import { Button } from './Common'
import { useApp } from '../context/AppContext'

export default function MarketingHeader({ active = '' }) {
  const { state, setAuthOpen, setServiceSettingsOpen } = useApp()
  const navigate = useNavigate()
  return (
    <header className="marketing-header">
      <div className="container marketing-header-inner">
        <Brand />
        <nav className="marketing-nav">
          <Link to="/">Home</Link>
          <Link to="/home">Product <ChevronDown size={14} /></Link>
          <Link className={active === 'pricing' ? 'active' : ''} to="/pricing">Pricing</Link>
          <a href="/#reviews">Reviews</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="marketing-header-actions">
          <button className="text-button connect-ai-mini" onClick={() => setServiceSettingsOpen(true)}><KeyRound size={15} /> Connect AI</button>
          {state.user ? (
            <Button size="sm" iconRight={ArrowRight} onClick={() => navigate('/home')}>Open app</Button>
          ) : (
            <>
              <button className="text-button" onClick={() => setAuthOpen(true)}>Login</button>
              <Button size="sm" iconRight={ArrowRight} onClick={() => navigate('/home')}>Try for Free</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
