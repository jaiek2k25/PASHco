/**
 * Session token storage.
 *
 * The server sets an HttpOnly cookie, which is the safest place for a session.
 * When the app is served from a different origin than the API (GitHub Pages →
 * Render), browsers that block third-party cookies cannot send that cookie. The
 * server also returns the signed token, and the client sends it as
 * `Authorization: Bearer ...` so accounts keep working there.
 *
 * The token is scoped to the configured server and removed on sign-out or when
 * the server URL changes.
 */

const STORAGE_KEY = 'wesolve-session-v1'

function read() {
  if (typeof window === 'undefined') return { token: '', server: '' }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      server: typeof parsed.server === 'string' ? parsed.server : '',
    }
  } catch {
    return { token: '', server: '' }
  }
}

export function getSessionToken(server = '') {
  const saved = read()
  // A token issued by one server must never be sent to another.
  if (saved.token && saved.server !== (server || '')) return ''
  return saved.token
}

export function saveSessionToken(token, server = '') {
  if (typeof window === 'undefined') return
  try {
    if (!token) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, server: server || '' }))
  } catch {
    // Private mode: the cookie still works when it can be sent.
  }
}

export function clearSessionToken() {
  saveSessionToken('')
}
