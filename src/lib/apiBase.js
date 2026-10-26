/**
 * Where the WeSolve API lives.
 *
 * Same-origin by default (the Node server serves the app and the API). A static
 * build — GitHub Pages — can point at a deployed Node server instead, so AI
 * calls and accounts are handled by the server rather than the browser. No AI
 * provider is ever called from the page itself.
 */

import { clearSessionToken, getSessionToken } from './sessionToken'

const STORAGE_KEY = 'wesolve-server-url-v1'
// Vite replaces this at build time; it is the default server for the build.
const envBase = import.meta.env.VITE_API_BASE || ''

let cached

function normalize(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    // Accept a pasted ".../api" or trailing slash without breaking the paths.
    const path = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '')
    return parsed.origin + path
  } catch {
    return ''
  }
}

function readStored() {
  if (typeof window === 'undefined') return ''
  try {
    return normalize(window.localStorage.getItem(STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

/** The configured server, or '' for same-origin. */
export function getServerUrl() {
  if (cached !== undefined) return cached
  cached = readStored() || normalize(envBase) || ''
  return cached
}

/** True when API calls leave this origin. */
export function isRemoteServer() {
  return Boolean(getServerUrl())
}

/** Build an API URL from a path such as '/api/ai'. */
export function apiUrl(path) {
  const base = getServerUrl()
  return base ? `${base}${path}` : path
}

export function setServerUrl(url) {
  const next = normalize(url)
  // A session belongs to one server; drop it when the target changes.
  if (next !== cached) clearSessionToken()
  cached = next
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage being blocked only means the setting lasts for this session.
  }
  window.dispatchEvent(new CustomEvent('wesolve-server-changed', { detail: next }))
  return next
}

/**
 * Fetch options shared by every API call. Cookies must be sent cross-origin
 * for the session to work when the API lives on another host, and the bearer
 * token covers browsers that refuse to send third-party cookies.
 */
export function apiInit(init = {}) {
  const { headers, ...rest } = init
  const token = getSessionToken(getServerUrl())
  const merged = { ...(headers || {}) }
  if (token && !merged.Authorization) merged.Authorization = `Bearer ${token}`
  return { credentials: 'include', mode: 'cors', ...rest, headers: merged }
}
