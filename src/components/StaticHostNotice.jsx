import { useState } from 'react'
import { Info, X } from 'lucide-react'

const STORAGE_KEY = 'wesolve-static-notice-v1'

/**
 * Shown only on the GitHub Pages build, which cannot run the Node API.
 * Without this, signing in or asking the AI would look broken rather than
 * unavailable.
 */
export default function StaticHostNotice() {
  const enabled = import.meta.env.VITE_STATIC_HOST === 'true'
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
        <strong>Static preview.</strong> This build runs entirely in your browser: the solver, whiteboard,
        flashcards, and quizzes work with the local engine, and your work is saved on this device.
        Sign-in and live AI need the Node deployment described in <code>DEPLOY.md</code>.
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
