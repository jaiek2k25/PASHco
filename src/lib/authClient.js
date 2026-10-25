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

  const data = await response.json().catch(() => ({}))
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
}
