import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const DATA_DIR = resolve(process.env.WESOLVE_DATA_DIR || 'server/data')
const DB_FILE = join(DATA_DIR, 'accounts.json')
const SECRET_FILE = join(DATA_DIR, 'session-secret')
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

const WORKSPACE_KEYS = ['history', 'studySets', 'notes', 'research', 'exams', 'currentPackId', 'onboarding', 'settings', 'solvesUsed', 'plan']
const MAX_WORKSPACE_BYTES = 2_000_000

let cache = null
let secret = null

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })
}

function loadDb() {
  if (cache) return cache
  ensureDir()
  if (!existsSync(DB_FILE)) {
    cache = { users: [] }
    return cache
  }
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8'))
    cache = { users: Array.isArray(parsed.users) ? parsed.users : [] }
  } catch {
    cache = { users: [] }
  }
  return cache
}

function persist(db) {
  ensureDir()
  const temp = `${DB_FILE}.${process.pid}.tmp`
  writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 })
  renameSync(temp, DB_FILE)
}

function getSecret() {
  if (secret) return secret
  ensureDir()
  if (process.env.WESOLVE_SESSION_SECRET) {
    secret = process.env.WESOLVE_SESSION_SECRET
    return secret
  }
  if (existsSync(SECRET_FILE)) {
    secret = readFileSync(SECRET_FILE, 'utf8').trim()
  } else {
    secret = randomBytes(48).toString('hex')
    writeFileSync(SECRET_FILE, secret, { mode: 0o600 })
  }
  return secret
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex')
  return { salt, hash }
}

function verifyHash(password, salt, expectedHex) {
  if (!salt || !expectedHex) return false
  const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  const expected = Buffer.from(expectedHex, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan || 'free',
    joinedAt: user.createdAt,
  }
}

export function findUserByEmail(email) {
  const normalized = normalizeEmail(email)
  return loadDb().users.find((user) => user.email === normalized) || null
}

export function findUserById(id) {
  return loadDb().users.find((user) => user.id === id) || null
}

export function createAccount({ name, email, password }) {
  const db = loadDb()
  const normalized = normalizeEmail(email)
  if (findUserByEmail(normalized)) {
    const error = new Error('An account with this email already exists.')
    error.code = 'EMAIL_TAKEN'
    throw error
  }
  const { salt, hash } = hashPassword(password)
  const now = new Date().toISOString()
  const user = {
    id: randomUUID(),
    name: String(name || '').trim().slice(0, 80) || normalized.split('@')[0],
    email: normalized,
    salt,
    hash,
    plan: 'free',
    sessionVersion: 1,
    workspace: null,
    workspaceUpdatedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  db.users.push(user)
  persist(db)
  return { user, publicUser: publicUser(user) }
}

export function authenticate(email, password) {
  const user = findUserByEmail(email)
  if (!user) {
    // Equalize timing with a dummy hash check.
    verifyHash(password || '', '00000000000000000000000000000000', randomBytes(64).toString('hex'))
    return null
  }
  if (!verifyHash(password || '', user.salt, user.hash)) return null
  return user
}

export function saveWorkspace(user, workspace) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === user.id)
  if (!record) return null
  const clean = {}
  for (const key of WORKSPACE_KEYS) {
    if (!(key in workspace)) continue
    const value = workspace[key]
    clean[key] = value
  }
  const serialized = JSON.stringify(clean)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_WORKSPACE_BYTES) {
    const error = new Error('Workspace data is too large to sync.')
    error.code = 'WORKSPACE_TOO_LARGE'
    throw error
  }
  record.workspace = clean
  record.workspaceUpdatedAt = new Date().toISOString()
  record.plan = clean.plan === 'pro' ? 'pro' : record.plan
  record.updatedAt = record.workspaceUpdatedAt
  persist(db)
  return { workspace: clean, syncedAt: record.workspaceUpdatedAt }
}

export function getWorkspace(user) {
  const record = findUserById(user.id)
  return { workspace: record?.workspace || null, syncedAt: record?.workspaceUpdatedAt || null }
}

export function updateProfile(user, patch) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === user.id)
  if (!record) return null
  if (typeof patch.name === 'string' && patch.name.trim()) record.name = patch.name.trim().slice(0, 80)
  if (patch.plan === 'pro' || patch.plan === 'free') record.plan = patch.plan
  record.updatedAt = new Date().toISOString()
  persist(db)
  return publicUser(record)
}

export function changePassword(user, currentPassword, nextPassword) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === user.id)
  if (!record) return { ok: false, reason: 'missing' }
  if (!verifyHash(currentPassword || '', record.salt, record.hash)) return { ok: false, reason: 'invalid' }
  const { salt, hash } = hashPassword(nextPassword)
  record.salt = salt
  record.hash = hash
  record.sessionVersion = (record.sessionVersion || 1) + 1
  record.updatedAt = new Date().toISOString()
  persist(db)
  return { ok: true, sessionVersion: record.sessionVersion }
}

export function deleteAccount(user, password) {
  const db = loadDb()
  const index = db.users.findIndex((item) => item.id === user.id)
  if (index === -1) return { ok: false, reason: 'missing' }
  if (!verifyHash(password || '', db.users[index].salt, db.users[index].hash)) return { ok: false, reason: 'invalid' }
  db.users.splice(index, 1)
  persist(db)
  return { ok: true }
}

function sign(payload) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function issueSession(user) {
  const payload = Buffer.from(JSON.stringify({
    uid: user.id,
    sv: user.sessionVersion || 1,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload)
  if (signature.length !== expected.length) return null
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  let parsed
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!parsed?.uid || !parsed?.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
  const user = findUserById(parsed.uid)
  if (!user) return null
  if ((user.sessionVersion || 1) !== parsed.sv) return null
  return user
}

/* ------------------------------------------------------------------ *
 * Per-account AI credentials.
 * Each account pays for its own inference, so the key is stored next to the
 * account — encrypted with AES-256-GCM and a key derived from the server
 * secret. The plaintext never leaves the server and is never synced to the
 * browser; the API only ever exposes a masked hint.
 * ------------------------------------------------------------------ */

function encryptionKey() {
  return Buffer.from(hkdfSync('sha256', Buffer.from(getSecret(), 'utf8'), Buffer.from('wesolve-ai-credentials', 'utf8'), Buffer.from('aes-256-gcm', 'utf8'), 32))
}

function maskSecret(secret) {
  const value = String(secret || '')
  if (value.length <= 10) return `${value.slice(0, 2)}••••`
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}

function encryptSecret(plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}

function decryptSecret(record) {
  if (!record?.ciphertext || !record?.iv || !record?.tag) return ''
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(record.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

const cleanField = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/**
 * Save credentials. Omit `key` to keep the stored secret while updating
 * the endpoint or model preferences.
 */
export function saveAiCredentials(user, { key, baseUrl, model, visionModel } = {}) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === user.id)
  if (!record) return null
  const previous = record.ai || {}
  const secret = typeof key === 'string' && key.trim() ? key.trim() : null
  const encrypted = secret ? encryptSecret(secret) : { iv: previous.iv, tag: previous.tag, ciphertext: previous.ciphertext }
  record.ai = {
    ...encrypted,
    hint: secret ? maskSecret(secret) : previous.hint || '',
    baseUrl: baseUrl !== undefined ? cleanField(baseUrl, 400) : previous.baseUrl || '',
    model: model !== undefined ? cleanField(model, 200) : previous.model || '',
    visionModel: visionModel !== undefined ? cleanField(visionModel, 200) : previous.visionModel || '',
    updatedAt: new Date().toISOString(),
  }
  record.updatedAt = record.ai.updatedAt
  persist(db)
  return aiKeyStatus(record)
}

export function clearAiCredentials(user) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === user.id)
  if (!record) return null
  delete record.ai
  record.updatedAt = new Date().toISOString()
  persist(db)
  return aiKeyStatus(record)
}

/** Decrypted credentials, server-side use only. */
export function getAiCredentials(user) {
  const record = findUserById(user?.id)
  const stored = record?.ai
  return {
    key: decryptSecret(stored),
    baseUrl: stored?.baseUrl || '',
    model: stored?.model || '',
    visionModel: stored?.visionModel || '',
  }
}

/** Safe shape for the client: no secret, just a hint. */
export function aiKeyStatus(user) {
  const record = typeof user === 'string' ? findUserById(user) : findUserById(user?.id)
  const stored = record?.ai
  return {
    configured: Boolean(stored?.ciphertext),
    hint: stored?.hint || '',
    baseUrl: stored?.baseUrl || '',
    model: stored?.model || '',
    visionModel: stored?.visionModel || '',
    updatedAt: stored?.updatedAt || null,
  }
}

export function invalidateSessions(userId) {
  const db = loadDb()
  const record = db.users.find((item) => item.id === userId)
  if (!record) return
  record.sessionVersion = (record.sessionVersion || 1) + 1
  persist(db)
}

export { publicUser, SESSION_TTL_SECONDS }
