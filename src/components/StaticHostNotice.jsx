import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'wesolve-static-notice-v1'

/**
 * Shown when this build is served without the WeSolve Node API (GitHub Pages),
 * so sign-in and AI limits read as "not here" rather than "broken".
 */
export default function StaticHostNotice() {
  const { backend } = useApp()
  const enabled = backend.checked && !backend.available
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'dismissed'
    } catch {
      return false
    }
  })

  if (!enabled || dismissed) return null

  return (
    <div className="static-notice" role="status">
      <Info size={16} />
      <p>
        <strong>Static preview.</strong> This page is only the interface: AI and accounts run on the
        WeSolve Node server. Open <em>Connect AI</em> and paste your server URL (see <code>DEPLOY.md</code>)
        to get live AI answers and synced accounts. Until then, work is saved per profile in this browser.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true)
          try {
            window.localStorage.setItem(STORAGE_KEY, 'dismissed')
          } catch {
            // Private mode with storage disabled: dismissing still works this session.
          }
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
