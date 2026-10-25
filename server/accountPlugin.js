import {
  authenticate,
  changePassword,
  createAccount,
  deleteAccount,
  getWorkspace,
  issueSession,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  publicUser,
  readSession,
  saveWorkspace,
  SESSION_TTL_SECONDS,
  updateProfile,
} from './authStore.js'

const COOKIE_NAME = 'wesolve_session'
const MAX_BODY_BYTES = 3 * 1024 * 1024

const buckets = new Map()

function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const record = buckets.get(key)
  if (!record || record.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  record.count += 1
  return record.count <= limit
}

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of buckets) {
    if (record.resetAt < now) buckets.delete(key)
  }
}, 60_000).unref?.()

function sendJson(res, status, value, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  for (const [key, headerValue] of Object.entries(headers)) res.setHeader(key, headerValue)
  res.end(JSON.stringify(value))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function parseCookies(header = '') {
  const result = {}
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return result
}

function isSecureRequest(req) {
  return Boolean(req.socket?.encrypted) || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
}

function sessionCookie(req, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (isSecureRequest(req)) parts.push('Secure')
  return parts.join('; ')
}

function clearCookie(req) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (isSecureRequest(req)) parts.push('Secure')
  return parts.join('; ')
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

function currentUser(req) {
  return readSession(parseCookies(req.headers.cookie)[COOKIE_NAME])
}

function requireUser(req, res) {
  const user = currentUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Please sign in to continue.', code: 'UNAUTHENTICATED' })
    return null
  }
  return user
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

export function createAccountHandler() {
  return async (req, res) => {
    let path = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/$/, '')
    const marker = '/api/auth'
    const index = path.indexOf(marker)
    if (index !== -1) path = path.slice(index + marker.length).replace(/\/$/, '') || '/'

    const method = req.method || 'GET'

    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Allow', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
      res.end()
      return
    }

    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      sendJson(res, 405, { error: 'Method not allowed.' })
      return
    }

    const mutating = method !== 'GET'
    if (mutating) {
      if (!sameOrigin(req)) {
        sendJson(res, 403, { error: 'Request origin rejected.' })
        return
      }
      if (String(req.headers['x-requested-with'] || '') !== 'wesolve') {
        sendJson(res, 403, { error: 'Missing request header.', code: 'CSRF' })
        return
      }
    }

    const ip = clientIp(req)

    try {
      if (method === 'POST' && (path === '/register' || path === '/login')) {
        if (!rateLimit(`${ip}:${path}`, 25, 10 * 60 * 1000)) {
          sendJson(res, 429, { error: 'Too many attempts. Please wait a few minutes and try again.' })
          return
        }

        const body = await readBody(req)
        const email = normalizeEmail(body.email)
        const password = String(body.password || '')

        if (path === '/register') {
          const name = String(body.name || '').trim()
          if (!name || name.length < 2) {
            sendJson(res, 400, { error: 'Please enter your full name.', field: 'name' })
            return
          }
          if (!isValidEmail(email)) {
            sendJson(res, 400, { error: 'Enter a valid email address.', field: 'email' })
            return
          }
          if (!isValidPassword(password)) {
            sendJson(res, 400, { error: 'Use at least 8 characters for your password.', field: 'password' })
            return
          }
          let created
          try {
            created = createAccount({ name, email, password })
          } catch (error) {
            if (error.code === 'EMAIL_TAKEN') {
              sendJson(res, 409, { error: 'An account with this email already exists. Try logging in.', field: 'email' })
              return
            }
            throw error
          }
          const token = issueSession(created.user)
          sendJson(res, 201, {
            user: created.publicUser,
            workspace: null,
            syncedAt: null,
          }, { 'Set-Cookie': sessionCookie(req, token) })
          return
        }

        const user = authenticate(email, password)
        if (!user) {
          sendJson(res, 401, { error: 'Email or password is incorrect.', field: 'password' })
          return
        }
        const token = issueSession(user)
        const saved = getWorkspace(user)
        sendJson(res, 200, {
          user: publicUser(user),
          workspace: saved.workspace,
          syncedAt: saved.syncedAt,
        }, { 'Set-Cookie': sessionCookie(req, token) })
        return
      }

      if (method === 'GET' && path === '/me') {
        const user = currentUser(req)
        if (!user) {
          sendJson(res, 200, { user: null })
          return
        }
        const saved = getWorkspace(user)
        sendJson(res, 200, { user: publicUser(user), syncedAt: saved.syncedAt, hasWorkspace: Boolean(saved.workspace) })
        return
      }

      if (method === 'POST' && path === '/logout') {
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) })
        return
      }

      if (method === 'GET' && path === '/workspace') {
        const user = requireUser(req, res)
        if (!user) return
        if (!rateLimit(`${ip}:ws-read`, 240, 60 * 1000)) {
          sendJson(res, 429, { error: 'Slow down a little.' })
          return
        }
        const saved = getWorkspace(user)
        sendJson(res, 200, { workspace: saved.workspace, syncedAt: saved.syncedAt })
        return
      }

      if (method === 'PUT' && path === '/workspace') {
        const user = requireUser(req, res)
        if (!user) return
        if (!rateLimit(`${ip}:ws-write`, 120, 60 * 1000)) {
          sendJson(res, 429, { error: 'Too many sync requests.' })
          return
        }
        const body = await readBody(req)
        if (!body.workspace || typeof body.workspace !== 'object') {
          sendJson(res, 400, { error: 'A workspace object is required.' })
          return
        }
        try {
          const saved = saveWorkspace(user, body.workspace)
          if (!saved) {
            sendJson(res, 404, { error: 'Account not found.' })
            return
          }
          sendJson(res, 200, { ok: true, syncedAt: saved.syncedAt })
        } catch (error) {
          if (error.code === 'WORKSPACE_TOO_LARGE') {
            sendJson(res, 413, { error: error.message })
            return
          }
          throw error
        }
        return
      }

      if (method === 'PATCH' && path === '/profile') {
        const user = requireUser(req, res)
        if (!user) return
        const body = await readBody(req)
        const updated = updateProfile(user, { name: body.name, plan: body.plan })
        sendJson(res, 200, { user: updated })
        return
      }

      if (method === 'POST' && path === '/password') {
        const user = requireUser(req, res)
        if (!user) return
        if (!rateLimit(`${ip}:password`, 10, 15 * 60 * 1000)) {
          sendJson(res, 429, { error: 'Too many password attempts.' })
          return
        }
        const body = await readBody(req)
        if (!isValidPassword(body.nextPassword)) {
          sendJson(res, 400, { error: 'Your new password needs at least 8 characters.', field: 'nextPassword' })
          return
        }
        const result = changePassword(user, body.currentPassword, body.nextPassword)
        if (!result.ok) {
          sendJson(res, 400, { error: 'Your current password is incorrect.', field: 'currentPassword' })
          return
        }
        const refreshed = { ...user, sessionVersion: result.sessionVersion }
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, issueSession(refreshed)) })
        return
      }

      if (method === 'DELETE' && path === '/account') {
        const user = requireUser(req, res)
        if (!user) return
        const body = await readBody(req)
        const result = deleteAccount(user, body.password)
        if (!result.ok) {
          sendJson(res, 400, { error: 'Your password is incorrect.' })
          return
        }
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) })
        return
      }

      sendJson(res, 404, { error: 'Account endpoint not found.' })
    } catch (error) {
      sendJson(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong on the server.' })
    }
  }
}

export function accountPlugin() {
  return {
    name: 'wesolve-accounts',
    configureServer(server) {
      server.middlewares.use('/api/auth', createAccountHandler())
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/auth', createAccountHandler())
    },
  }
}
