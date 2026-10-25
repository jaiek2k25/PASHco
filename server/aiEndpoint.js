/**
 * Validation shared by the AI proxy and the account API for user-supplied
 * OpenAI-compatible endpoints. Keeping it in one place means a base URL that
 * is refused at request time is also refused when it is saved to an account.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const PRIVATE_HOST = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/

export const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1'

export function isLocalRequest(req) {
  const requestHost = String(req?.headers?.host || '').split(':')[0].toLowerCase()
  return LOCAL_HOSTS.has(requestHost)
}

/**
 * Normalize and validate a base URL.
 * @returns {{ url?: string, error?: string }}
 */
export function validateBaseUrl(raw, { req } = {}) {
  const value = String(raw || '').trim()
  if (!value) return { url: '' }
  if (value.length > 400) return { error: 'The API base URL is too long.' }
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { error: 'The API base URL is not a valid URL.' }
  }
  const host = parsed.hostname.toLowerCase()
  const requestIsLocal = isLocalRequest(req)
  const isLoopback = LOCAL_HOSTS.has(host)
  // Loopback is fine while developing locally, never for a deployed site.
  const allowLoopback = isLoopback && requestIsLocal
  if (isLoopback && !allowLoopback) {
    return { error: 'A localhost API base URL is only allowed when the app itself runs locally.' }
  }
  if (!allowLoopback && PRIVATE_HOST.test(host)) {
    return { error: 'A private-network API base URL is not allowed.' }
  }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && allowLoopback)) {
    return { error: 'The API base URL must use HTTPS.' }
  }
  return { url: `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '') }
}

export function chatCompletionsUrl(baseUrl) {
  const base = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`
}
