/**
 * Validation shared by the AI proxy and the account API for user-supplied
 * OpenAI-compatible endpoints. Keeping it in one place means a base URL that
 * is refused at request time is also refused when it is saved to an account.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'])
const PRIVATE_HOST = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/
// Hosts that only exist inside a private network or a cloud metadata service.
const PRIVATE_SUFFIX = /(\.internal|\.local|\.localhost|\.svc|\.cluster\.local)$/
const METADATA_HOSTS = /^(metadata|metadata\.google\.internal|instance-data)/

/**
 * IPv6 is written many ways, and a mapped address such as ::ffff:127.0.0.1
 * reaches the IPv4 loopback even though it does not look like it. Anything
 * that is not obviously a public address is refused.
 */
function isPrivateIpv6(host) {
  const bare = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!bare.includes(':')) return false
  // Node canonicalises ::ffff:127.0.0.1 to ::ffff:7f00:1, so both forms count.
  const mapped = bare.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return PRIVATE_HOST.test(mapped[1])
  const mappedHex = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16)
    const low = parseInt(mappedHex[2], 16)
    return PRIVATE_HOST.test(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
  }
  if (bare === '::' || bare === '::1') return true
  // fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast.
  return /^(f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:|ff[0-9a-f]{2}:)/.test(bare)
}

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
  if (!allowLoopback && (PRIVATE_HOST.test(host) || isPrivateIpv6(host) || PRIVATE_SUFFIX.test(host) || METADATA_HOSTS.test(host))) {
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
