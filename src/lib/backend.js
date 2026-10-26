/**
 * Knows whether this build is talking to the WeSolve Node server.
 *
 * A purely static deployment (GitHub Pages) serves files only, so `/api/*`
 * returns 404. The app must not offer sign-in or live AI there and then fail
 * with "Request failed (404)" — it detects the situation once and adapts.
 */

import { apiInit, apiUrl, getServerUrl } from './apiBase'

// Free hosts (Render, Fly) stop idle instances and take 30-60 s to wake, so the
// first probe waits longer and failures are retried in the background instead of
// leaving the app stuck in "no server" for the rest of the session.
const FIRST_PROBE_TIMEOUT_MS = 20000
const PROBE_TIMEOUT_MS = 8000
const CACHE_MS = 60_000
const RETRY_DELAYS_MS = [8000, 20000, 45000]

let state = { checked: false, available: false, checkedAt: 0, info: null, server: '', error: '', retrying: false }
let inflight = null
let retryTimer = null
let retryIndex = 0
let everProbed = false
const listeners = new Set()

function publish(next) {
  state = next
  listeners.forEach((listener) => {
    try {
      listener(state)
    } catch {
      // A listener throwing must not break the probe.
    }
  })
}

export function getBackendState() {
  return state
}

export function subscribeBackend(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function cancelRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  retryIndex = 0
}

function scheduleRetry() {
  // Only worth retrying when a server was actually configured.
  if (!getServerUrl() || retryIndex >= RETRY_DELAYS_MS.length) return
  const delay = RETRY_DELAYS_MS[retryIndex]
  retryIndex += 1
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = null
    publish({ ...state, retrying: true })
    probeBackend({ force: true, silent: true })
  }, delay)
  if (typeof window !== 'undefined') publish({ ...state, retrying: true })
}

async function requestProbe() {
  const timeoutMs = everProbed ? PROBE_TIMEOUT_MS : FIRST_PROBE_TIMEOUT_MS
  everProbed = true
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetch(apiUrl('/api/ai/health'), apiInit({
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    }))
    // A static host answers with its 404 HTML page, not JSON.
    if (!response.ok) {
      return {
        available: false,
        info: null,
        error: response.status === 404
          ? 'That address answered, but not as a WeSolve server (no /api/ai/health). Check you used the app URL, not a docs or repo link.'
          : `That server answered with HTTP ${response.status}.`,
      }
    }
    const info = await response.json().catch(() => null)
    if (!info?.ok) {
      return { available: false, info: null, error: 'That address is not a WeSolve server (health check did not answer correctly).' }
    }
    return { available: true, info, error: '' }
  } catch {
    return {
      available: false,
      info: null,
      error: 'Nothing answered at that address. Check the URL, make sure the deployment is running, and allow this site in WESOLVE_ALLOWED_ORIGINS on the server.',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Resolve once, then reuse the answer briefly so app boot stays cheap. */
export function probeBackend({ force = false, silent = false } = {}) {
  const fresh = state.checked && Date.now() - state.checkedAt < CACHE_MS
  if (fresh && !force) return Promise.resolve(state)
  if (inflight) return inflight
  const server = getServerUrl()
  if (!silent) cancelRetry()
  inflight = requestProbe().then(({ available, info, error }) => {
    publish({
      checked: true,
      available,
      checkedAt: Date.now(),
      info,
      server,
      error: available ? '' : error || '',
      retrying: available ? false : Boolean(retryTimer),
    })
    inflight = null
    if (available) cancelRetry()
    else scheduleRetry()
    return state
  })
  return inflight
}

/** Try again now (used by "Retry" buttons and when the tab regains focus). */
export function retryBackend() {
  cancelRetry()
  return probeBackend({ force: true })
}

/** True when the last probe found a server. Undefined before the first probe. */
export function backendAvailable() {
  return state.checked ? state.available : undefined
}

/** Only a confirmed static host should switch to offline behaviour. */
export function isStaticHost() {
  return state.checked && !state.available
}

export function markBackendMissing() {
  if (!state.available) return
  publish({ checked: true, available: false, checkedAt: Date.now(), info: null, server: state.server, error: 'The server stopped answering.' })
}

/** Forget the cached answer, e.g. after the user enters a server URL. */
export function resetBackendProbe() {
  cancelRetry()
  state = { checked: false, available: false, checkedAt: 0, info: null, server: getServerUrl(), error: '', retrying: false }
  inflight = null
  publish(state)
}
