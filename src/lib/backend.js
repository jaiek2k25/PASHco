/**
 * Knows whether this build is talking to the WeSolve Node server.
 *
 * A purely static deployment (GitHub Pages) serves files only, so `/api/*`
 * returns 404. The app must not offer sign-in or live AI there and then fail
 * with "Request failed (404)" — it detects the situation once and adapts.
 */

import { apiInit, apiUrl, getServerUrl } from './apiBase'

const PROBE_TIMEOUT_MS = 6000
const CACHE_MS = 60_000

let state = { checked: false, available: false, checkedAt: 0, info: null, server: '' }
let inflight = null
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

async function requestProbe() {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null
  try {
    const response = await fetch(apiUrl('/api/ai/health'), apiInit({
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    }))
    // A static host answers with its 404 HTML page, not JSON.
    if (!response.ok) return { available: false, info: null }
    const info = await response.json().catch(() => null)
    return { available: Boolean(info?.ok), info }
  } catch {
    return { available: false, info: null }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Resolve once, then reuse the answer briefly so app boot stays cheap. */
export function probeBackend({ force = false } = {}) {
  const fresh = state.checked && Date.now() - state.checkedAt < CACHE_MS
  if (fresh && !force) return Promise.resolve(state)
  if (inflight) return inflight
  const server = getServerUrl()
  inflight = requestProbe().then(({ available, info }) => {
    publish({ checked: true, available, checkedAt: Date.now(), info, server })
    inflight = null
    return state
  })
  return inflight
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
  publish({ checked: true, available: false, checkedAt: Date.now(), info: null, server: state.server })
}

/** Forget the cached answer, e.g. after the user enters a server URL. */
export function resetBackendProbe() {
  state = { checked: false, available: false, checkedAt: 0, info: null, server: getServerUrl() }
  inflight = null
  publish(state)
}
