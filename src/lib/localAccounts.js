/**
 * Device-local accounts, used when the build is served without the Node server
 * (GitHub Pages). Sign-up and sign-in work, work stays on this device, and the
 * UI says so. On a server deployment this module is never reached.
 *
 * Passwords are hashed with PBKDF2-SHA256 (Web Crypto) before storage.
 */

const STORE_KEY = 'wesolve-local-accounts-v1'
const WORKSPACE_KEY = 'wesolve-local-workspace-v1'
const ITERATIONS = 120_000

function readStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}')
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
    }
  } catch {
    return { accounts: [], sessionId: null }
  }
}

function writeStore(store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // Private browsing and blocked storage land here; say so plainly.
    throw localError(
      'This browser is blocking local storage, so an account cannot be saved here. Turn off private mode or allow site data, then try again.',
      'NO_STORAGE',
    )
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomHex(bytes = 16) {
  const data = new Uint8Array(bytes)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(data)
  else for (let i = 0; i < bytes; i += 1) data[i] = Math.floor(Math.random() * 256)
  return Array.from(data).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const webCrypto = globalThis.crypto?.subtle
  if (webCrypto) {
    const key = await webCrypto.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await webCrypto.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
      key,
      256,
    )
    return toHex(bits)
  }
  // Last resort for insecure contexts: still salted, just weaker.
  let acc = 0
  const input = `${salt}:${password}`
  for (let i = 0; i < input.length; i += 1) acc = (acc * 31 + input.charCodeAt(i)) >>> 0
  return acc.toString(16).padStart(8, '0').repeat(6).slice(0, 48)
}

function readWorkspaces() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** The signed-in account's saved work on this device. */
export function getLocalWorkspace() {
  const account = currentAccount()
  if (!account) return { workspace: null, syncedAt: null, local: true }
  const saved = readWorkspaces()[account.id] || null
  return { workspace: saved?.workspace || null, syncedAt: saved?.syncedAt || null, local: true }
}

/** Keeps each device-local account's work separate from the others. */
export function saveLocalWorkspace(workspace) {
  const account = currentAccount()
  if (!account) return { ok: false, syncedAt: null, local: true }
  const all = readWorkspaces()
  const syncedAt = new Date().toISOString()
  all[account.id] = { workspace, syncedAt }
  try {
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(all))
  } catch {
    return { ok: false, syncedAt: null, local: true }
  }
  return { ok: true, syncedAt, local: true }
}

function publicUser(account) {
  if (!account) return null
  return { id: account.id, name: account.name, email: account.email, plan: 'free', joinedAt: account.createdAt }
}

function localError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function currentAccount() {
  const store = readStore()
  if (!store.sessionId) return null
  return store.accounts.find((account) => account.id === store.sessionId) || null
}

export async function registerLocal({ name, email, password }) {
  const store = readStore()
  const normalized = String(email || '').trim().toLowerCase()
  if (store.accounts.some((account) => account.email === normalized)) {
    throw localError('An account with this email already exists on this device.', 'EMAIL_TAKEN')
  }
  const salt = randomHex(16)
  const account = {
    id: `local_${randomHex(8)}`,
    name: String(name || '').trim() || normalized.split('@')[0],
    email: normalized,
    salt,
    hash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  }
  store.accounts.push(account)
  store.sessionId = account.id
  writeStore(store)
  return { user: publicUser(account), workspace: null, local: true }
}

export async function loginLocal({ email, password }) {
  const store = readStore()
  const normalized = String(email || '').trim().toLowerCase()
  const account = store.accounts.find((item) => item.email === normalized)
  if (!account) throw localError('No account with that email exists on this device.', 'BAD_CREDENTIALS')
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.hash) throw localError('That password does not match this account.', 'BAD_CREDENTIALS')
  store.sessionId = account.id
  writeStore(store)
  const saved = getLocalWorkspace()
  return { user: publicUser(account), workspace: saved.workspace, local: true }
}

export function meLocal() {
  const saved = getLocalWorkspace()
  return {
    user: publicUser(currentAccount()),
    hasWorkspace: Boolean(saved.workspace),
    syncedAt: saved.syncedAt,
    aiKey: localAiKey(),
    local: true,
  }
}

export function logoutLocal() {
  const store = readStore()
  store.sessionId = null
  writeStore(store)
  return { ok: true }
}

export function updateProfileLocal({ name }) {
  const store = readStore()
  const account = store.accounts.find((item) => item.id === store.sessionId)
  if (!account) throw localError('Sign in to update your profile.', 'UNAUTHENTICATED')
  if (name !== undefined) account.name = String(name).trim().slice(0, 80) || account.name
  writeStore(store)
  return { user: publicUser(account) }
}

export async function changePasswordLocal({ currentPassword, nextPassword }) {
  const store = readStore()
  const account = store.accounts.find((item) => item.id === store.sessionId)
  if (!account) throw localError('Sign in to change your password.', 'UNAUTHENTICATED')
  if ((await hashPassword(currentPassword, account.salt)) !== account.hash) {
    throw localError('Your current password is incorrect.', 'BAD_CREDENTIALS')
  }
  account.salt = randomHex(16)
  account.hash = await hashPassword(nextPassword, account.salt)
  writeStore(store)
  return { ok: true }
}

export function deleteAccountLocal() {
  const store = readStore()
  store.accounts = store.accounts.filter((item) => item.id !== store.sessionId)
  store.sessionId = null
  writeStore(store)
  try {
    window.localStorage.removeItem('wesolve-service-settings-v1')
  } catch {
    // Nothing else to clean up.
  }
  return { ok: true }
}

/* ---- AI key for local accounts (same storage the guest uses) ---- */

const SERVICE_KEY = 'wesolve-service-settings-v1'

function masked(value) {
  if (!value) return ''
  return value.length <= 10 ? `${value.slice(0, 2)}••••` : `${value.slice(0, 6)}••••${value.slice(-4)}`
}

export function localAiKey() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SERVICE_KEY) || '{}')
    return {
      configured: Boolean(saved.nvidiaApiKey),
      hint: masked(saved.nvidiaApiKey || ''),
      baseUrl: saved.nvidiaBaseUrl || '',
      model: saved.nvidiaModel || '',
      visionModel: saved.nvidiaVisionModel || '',
      updatedAt: null,
      local: true,
    }
  } catch {
    return { configured: false, hint: '', baseUrl: '', model: '', visionModel: '', updatedAt: null, local: true }
  }
}

export function saveLocalAiKey({ key, baseUrl, model, visionModel }) {
  const saved = JSON.parse(window.localStorage.getItem(SERVICE_KEY) || '{}')
  const next = {
    ...saved,
    ...(key ? { nvidiaApiKey: key } : {}),
    ...(baseUrl !== undefined ? { nvidiaBaseUrl: baseUrl } : {}),
    ...(model !== undefined ? { nvidiaModel: model } : {}),
    ...(visionModel !== undefined ? { nvidiaVisionModel: visionModel } : {}),
  }
  window.localStorage.setItem(SERVICE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('wesolve-service-settings-changed', { detail: next }))
  return localAiKey()
}

export function clearLocalAiKey() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SERVICE_KEY) || '{}')
    delete saved.nvidiaApiKey
    window.localStorage.setItem(SERVICE_KEY, JSON.stringify(saved))
    window.dispatchEvent(new CustomEvent('wesolve-service-settings-changed', { detail: saved }))
  } catch {
    // Ignore storage failures.
  }
  return localAiKey()
}
