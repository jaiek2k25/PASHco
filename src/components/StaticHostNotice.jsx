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
        <strong>Static preview.</strong> Accounts here live in this browser, and your work is saved per
        profile on this device. Live AI needs a provider that accepts browser requests — OpenRouter,
        Groq, or Gemini in <em>Connect AI</em> — or the Node deployment in <code>DEPLOY.md</code> for
        NVIDIA keys and cross-device sync.
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
