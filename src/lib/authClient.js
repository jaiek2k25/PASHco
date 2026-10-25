const BASE = '/api/auth'

async function call(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'wesolve',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // A static host answers unknown paths with its HTML page, which is not an
  // account error — flag it so the caller can fall back to device-local mode.
  const contentType = response.headers.get('content-type') || ''
  const looksHtml = contentType.includes('text/html')
  if (looksHtml) {
    const error = new Error('No WeSolve server answered this request.')
    error.status = 404
    error.code = 'NO_BACKEND'
    throw error
  }

  let data = {}
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      const error = new Error(`The server returned an unreadable reply (${response.status}).`)
      error.status = response.status
      throw error
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`)
    error.status = response.status
    error.field = data.field
    error.code = data.code
    throw error
  }
  return data
}

export const authApi = {
  me: () => call('/me'),
  register: (payload) => call('/register', { method: 'POST', body: payload }),
  login: (payload) => call('/login', { method: 'POST', body: payload }),
  logout: () => call('/logout', { method: 'POST' }),
  getWorkspace: () => call('/workspace'),
  saveWorkspace: (workspace) => call('/workspace', { method: 'PUT', body: { workspace } }),
  updateProfile: (payload) => call('/profile', { method: 'PATCH', body: payload }),
  changePassword: (payload) => call('/password', { method: 'POST', body: payload }),
  deleteAccount: (password) => call('/account', { method: 'DELETE', body: { password } }),
  // AI credentials live on the account, encrypted at rest. The API only ever
  // returns a masked hint, never the key itself.
  getAiKey: () => call('/ai-key'),
  saveAiKey: (payload) => call('/ai-key', { method: 'PUT', body: payload }),
  clearAiKey: () => call('/ai-key', { method: 'DELETE' }),
}
