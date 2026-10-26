/**
 * Cross-origin support for the WeSolve API.
 *
 * The static build (GitHub Pages) can point at this server, so /api/auth and
 * /api/ai have to be callable from another origin with cookies. Requests made
 * by the server itself stay same-origin and are unaffected.
 */

const DEFAULT_ORIGINS = [
  'https://jaiek2k25.github.io',
]

function configuredOrigins() {
  const extra = String(process.env.WESOLVE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return [...DEFAULT_ORIGINS, ...extra]
}

function originMatches(origin, rule) {
  if (rule === '*') return true
  if (rule === origin) return true
  // Wildcard subdomains: https://*.example.com
  if (rule.includes('*')) {
    const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')
    return new RegExp(`^${escaped}$`).test(origin)
  }
  return false
}

/** Localhost on any port is always allowed so development is painless. */
function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
}

export function isOriginAllowed(origin) {
  if (!origin) return false
  if (isLocalOrigin(origin)) return true
  return configuredOrigins().some((rule) => originMatches(origin, rule))
}

export function requestOrigin(req) {
  return String(req.headers.origin || '')
}

/** True when the browser is calling from a different site than this server. */
export function isCrossOrigin(req) {
  const origin = requestOrigin(req)
  if (!origin) return false
  try {
    return new URL(origin).host !== String(req.headers.host || '')
  } catch {
    return true
  }
}

/**
 * Adds CORS headers when the caller is an allowed origin. Never answers with
 * `*` while cookies are involved — browsers reject that combination.
 */
export function applyCors(req, res) {
  const origin = requestOrigin(req)
  if (!origin) return false
  res.setHeader('Vary', 'Origin')
  if (!isOriginAllowed(origin)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Ai-Api-Key, X-Ai-Base-Url, X-Ai-Model, X-Ai-Vision-Model')
  res.setHeader('Access-Control-Max-Age', '86400')
  return true
}

/**
 * Answers a CORS preflight. Returns true when the request was a preflight so
 * the caller can stop routing.
 */
export function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') return false
  const origin = requestOrigin(req)
  if (origin && !isOriginAllowed(origin)) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: `Origin ${origin} is not allowed. Add it to WESOLVE_ALLOWED_ORIGINS.` }))
    return true
  }
  res.statusCode = 204
  res.end()
  return true
}

/**
 * Cookies need SameSite=None to travel from another site, and browsers only
 * accept that flag on Secure (https) cookies.
 */
export function cookiePolicy(req) {
  const secure = Boolean(req.socket?.encrypted)
    || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
  if (isCrossOrigin(req) && secure) return { sameSite: 'None', secure: true }
  return { sameSite: 'Lax', secure }
}
