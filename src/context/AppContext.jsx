import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createId, generateStudyPack, sampleStudyMaterial } from '../lib/intelligence'
import { accounts } from '../lib/accounts'
import { getBackendState, probeBackend, retryBackend, subscribeBackend } from '../lib/backend'

const STORAGE_KEY = 'wesolve-v1'
const LEGACY_KEYS = ['pashco-solvely-recreation-v1', 'pashco-wesolve-recreation-v1']
const SYNC_KEYS = ['plan', 'solvesUsed', 'history', 'studySets', 'notes', 'research', 'exams', 'currentPackId', 'onboarding', 'settings']

const defaultState = {
  user: null,
  plan: 'free',
  solvesUsed: 0,
  history: [],
  studySets: [],
  notes: [],
  research: [],
  exams: [],
  currentPackId: 'starter-pack',
  onboarding: {
    level: '',
    goal: '',
    completed: false,
  },
  settings: {
    voiceEnabled: true,
    compactMode: false,
    emailUpdates: false,
  },
}

function starterState() {
  const starterPack = generateStudyPack(sampleStudyMaterial, 'Biology foundations')
  return { ...defaultState, studySets: [{ ...starterPack, id: 'starter-pack' }] }
}

/**
 * Stored or synced data can predate a field, or arrive half-written. Every list
 * is repaired here so a single bad record cannot crash a whole page.
 */
function repairHistory(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      id: item.id || createId('solve'),
      createdAt: item.createdAt || new Date().toISOString(),
      question: typeof item.question === 'string' && item.question.trim() ? item.question : 'Untitled question',
      subject: typeof item.subject === 'string' && item.subject.trim() ? item.subject : 'General',
      finalAnswer: typeof item.finalAnswer === 'string' ? item.finalAnswer : '',
      answerText: typeof item.answerText === 'string' ? item.answerText : '',
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
      steps: (Array.isArray(item.steps) ? item.steps : []).filter((step) => step && typeof step === 'object'),
      checks: (Array.isArray(item.checks) ? item.checks : []).filter((check) => check && typeof check === 'object'),
      followups: Array.isArray(item.followups) ? item.followups : [],
    }))
}

function repairStudySets(items) {
  return (Array.isArray(items) ? items : [])
    .filter((pack) => pack && typeof pack === 'object')
    .map((pack) => ({
      ...pack,
      id: pack.id || createId('pack'),
      title: typeof pack.title === 'string' && pack.title.trim() ? pack.title : 'Study set',
      createdAt: pack.createdAt || new Date().toISOString(),
      flashcards: (Array.isArray(pack.flashcards) ? pack.flashcards : []).filter((card) => card && typeof card === 'object'),
      quiz: (Array.isArray(pack.quiz) ? pack.quiz : []).filter((question) => question && typeof question === 'object'),
      guide: pack.guide && typeof pack.guide === 'object' ? pack.guide : null,
    }))
}

function repairNotes(items) {
  return (Array.isArray(items) ? items : [])
    .filter((note) => note && typeof note === 'object')
    .map((note) => ({
      ...note,
      id: note.id || createId('note'),
      createdAt: note.createdAt || new Date().toISOString(),
      summary: typeof note.summary === 'string' ? note.summary : '',
      keyPoints: Array.isArray(note.keyPoints) ? note.keyPoints : [],
      keywords: Array.isArray(note.keywords) ? note.keywords : [],
      actionItems: Array.isArray(note.actionItems) ? note.actionItems : [],
    }))
}

function normalizeState(saved) {
  const repairedSets = repairStudySets(saved?.studySets)
  return {
    ...defaultState,
    ...saved,
    user: null,
    settings: { ...defaultState.settings, ...(saved?.settings || {}) },
    onboarding: { ...defaultState.onboarding, ...(saved?.onboarding || {}) },
    history: repairHistory(saved?.history),
    studySets: repairedSets.length ? repairedSets : starterState().studySets,
    notes: repairNotes(saved?.notes),
    research: (Array.isArray(saved?.research) ? saved.research : []).filter((item) => item && typeof item === 'object'),
    exams: (Array.isArray(saved?.exams) ? saved.exams : []).filter((item) => item && typeof item === 'object'),
  }
}

function loadState() {
  if (typeof window === 'undefined') return defaultState
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacy = window.localStorage.getItem(legacyKey)
        if (legacy) {
          raw = legacy
          window.localStorage.setItem(STORAGE_KEY, legacy)
          break
        }
      }
    }
    if (!raw) return starterState()
    return normalizeState(JSON.parse(raw))
  } catch {
    return starterState()
  }
}

/**
 * Solutions are kept in history, persisted to localStorage, and synced to the
 * account. Attachments must therefore stay small: a cropped screenshot is a
 * multi-megabyte data URL, which would blow the ~5 MB storage budget and the
 * server's workspace limit. Keep only the descriptive fields.
 */
export function slimSolution(solution) {
  if (!solution || typeof solution !== 'object') return solution
  const attachments = Array.isArray(solution.attachments)
    ? solution.attachments.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size,
      pages: item.pages,
      characters: item.characters,
      isImage: Boolean(item.isImage),
      isLink: Boolean(item.isLink),
      url: item.isLink ? item.url : undefined,
    }))
    : []
  return { ...solution, attachments }
}

/** Rough UTF-8 size without allocating a TextEncoder buffer. */
function payloadBytes(value) {
  const text = JSON.stringify(value)
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  return text.length * 2
}

/**
 * Keep the synced payload inside the server's workspace budget instead of
 * failing the whole sync. Oldest history/notes/research are dropped first.
 */
export function fitWorkspace(payload, maxBytes = 1_900_000) {
  const next = { ...payload }
  let dropped = 0
  const shrink = (key, keep) => {
    if (Array.isArray(next[key]) && next[key].length > keep) {
      dropped += next[key].length - keep
      next[key] = next[key].slice(0, keep)
      return true
    }
    return false
  }
  if (payloadBytes(next) <= maxBytes) return { payload: next, dropped }
  shrink('history', 12) || shrink('notes', 12) || shrink('research', 8) || shrink('studySets', 8) || shrink('exams', 6)
  if (payloadBytes(next) <= maxBytes) return { payload: next, dropped }
  shrink('history', 5) || shrink('notes', 5) || shrink('research', 4) || shrink('studySets', 4) || shrink('exams', 3)
  return { payload: next, dropped }
}

export function workspacePayload(state) {
  return SYNC_KEYS.reduce((payload, key) => {
    if (key in state) payload[key] = state[key]
    return payload
  }, {})
}

export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [auth, setAuth] = useState({ status: 'loading', syncedAt: null, syncState: 'idle', error: '' })
  const [toasts, setToasts] = useState([])
  const [authOpen, setAuthOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [serviceSettingsOpen, setServiceSettingsOpen] = useState(false)
  const [serviceSettingsVersion, setServiceSettingsVersion] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const lastSyncedRef = useRef('')
  const hydratedRef = useRef(false)

  // Persist locally, trimming the oldest history if the browser quota is hit so
  // new work is never silently lost.
  const warnedQuotaRef = useRef(false)
  useEffect(() => {
    const save = (value) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, user: null }))
    try {
      save(state)
    } catch {
      try {
        const trimmed = { ...state, history: state.history.slice(0, 5), notes: state.notes.slice(0, 5), research: state.research.slice(0, 3) }
        save(trimmed)
        if (!warnedQuotaRef.current) {
          warnedQuotaRef.current = true
          setToasts((items) => [...items, { id: createId('toast'), message: 'Browser storage is full, so older items were dropped from this device.', type: 'error' }])
        }
      } catch {
        // Private browsing or blocked storage: the app still works in memory.
      }
    }
  }, [state])

  // Detect whether this build has a server. Static hosting has no /api, so
  // accounts stay on the device and AI needs a browser-usable provider.
  const [backend, setBackend] = useState(() => {
    const snapshot = getBackendState()
    return { checked: snapshot.checked, available: snapshot.available, info: snapshot.info, error: snapshot.error, retrying: snapshot.retrying }
  })

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeBackend((next) => {
      if (!active) return
      setBackend({ checked: next.checked, available: next.available, info: next.info, error: next.error, retrying: next.retrying })
    })
    probeBackend().then((snapshot) => {
      if (!active) return
      // A cached probe resolves without publishing, so copy the result here.
      setBackend({ checked: snapshot.checked, available: snapshot.available, info: snapshot.info, error: snapshot.error, retrying: snapshot.retrying })
    })

    // A sleeping free-tier server wakes while the tab is hidden. Re-check when
    // the user comes back instead of leaving them on a stale "no server" state.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const snapshot = getBackendState()
      if (!snapshot.available) retryBackend()
    }
    const onOnline = () => retryBackend()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      active = false
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer = null

    async function restore() {
      try {
        const data = await accounts.me()
        if (cancelled) return
        if (!data.user) {
          setAuth({ status: 'anonymous', syncedAt: null, syncState: 'local', error: '' })
          hydratedRef.current = true
          return
        }

        if (data.hasWorkspace) {
          const saved = await accounts.getWorkspace()
          if (cancelled) return
          if (saved.workspace) {
            const next = { ...normalizeState(saved.workspace), user: data.user }
            lastSyncedRef.current = JSON.stringify(workspacePayload(next))
            setState(next)
          }
        } else {
          setState((current) => ({ ...current, user: data.user }))
        }

        setAuth({ status: 'authenticated', syncedAt: data.syncedAt, syncState: 'synced', error: '' })
        hydratedRef.current = true
      } catch {
        if (cancelled) return
        setAuth({ status: 'anonymous', syncedAt: null, syncState: 'offline', error: '' })
        hydratedRef.current = true
      }
    }

    restore()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current || auth.status !== 'authenticated') return undefined
    const { payload: fitted } = fitWorkspace(workspacePayload(state))
    const payload = fitted
    const serialized = JSON.stringify(payload)
    if (serialized === lastSyncedRef.current) return undefined

    setAuth((current) => (current.syncState === 'saving' ? current : { ...current, syncState: 'pending' }))
    const timer = window.setTimeout(async () => {
      setAuth((current) => ({ ...current, syncState: 'saving' }))
      try {
        const result = await accounts.saveWorkspace(payload)
        lastSyncedRef.current = serialized
        setAuth((current) => ({ ...current, syncState: 'synced', syncedAt: result.syncedAt, error: '' }))
      } catch (error) {
        setAuth((current) => ({ ...current, syncState: 'error', error: error.message || 'Sync failed.' }))
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [state, auth.status])

  const removeToast = useCallback((id) => {
    setToasts((items) => items.filter((toastItem) => toastItem.id !== id))
  }, [])

  const toast = useCallback((message, type = 'success') => {
    const id = createId('toast')
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => removeToast(id), 3800)
  }, [removeToast])

  const patch = useCallback((updater) => {
    setState((current) => (typeof updater === 'function' ? updater(current) : { ...current, ...updater }))
  }, [])

  const adoptAccount = useCallback((user, workspace) => {
    setState((current) => {
      const base = workspace ? normalizeState(workspace) : current
      return { ...base, user }
    })
    lastSyncedRef.current = workspace ? JSON.stringify(workspacePayload(normalizeState(workspace))) : ''
    setAuth({ status: 'authenticated', syncedAt: null, syncState: workspace ? 'synced' : 'pending', error: '' })
    hydratedRef.current = true
    setAuthOpen(false)
  }, [])

  const signUp = useCallback(async ({ name, email, password }) => {
    const result = await accounts.register({ name, email, password })
    adoptAccount(result.user, null)
    toast(result.local
      ? `Welcome to WeSolve, ${result.user.name.split(' ')[0]}! This preview stores your account on this device.`
      : `Welcome to WeSolve, ${result.user.name.split(' ')[0]}! Your workspace is now syncing.`)
    return result.user
  }, [adoptAccount, toast])

  const signIn = useCallback(async ({ email, password }) => {
    const result = await accounts.login({ email, password })
    adoptAccount(result.user, result.workspace)
    toast(result.local
      ? `Welcome back, ${result.user.name.split(' ')[0]}. Your saved work is loaded from this device.`
      : `Welcome back, ${result.user.name.split(' ')[0]}. Your workspace is synced.`)
    return result.user
  }, [adoptAccount, toast])

  const signOut = useCallback(async () => {
    try {
      await accounts.logout()
    } catch {
      // Signing out locally is still safe if the network is unavailable.
    }
    lastSyncedRef.current = ''
    setState(starterState())
    setAuth({ status: 'anonymous', syncedAt: null, syncState: 'local', error: '' })
    toast('Signed out. This device now shows a fresh guest workspace.')
  }, [patch, toast])

  const syncNow = useCallback(async () => {
    if (auth.status !== 'authenticated') {
      setAuthOpen(true)
      return false
    }
    try {
      setAuth((current) => ({ ...current, syncState: 'saving' }))
      const { payload, dropped } = fitWorkspace(workspacePayload(state))
      if (dropped > 0) {
        toast(`Workspace is large, so ${dropped} of the oldest items stay on this device only.`, 'error')
      }
      const result = await accounts.saveWorkspace(payload)
      lastSyncedRef.current = JSON.stringify(payload)
      setAuth((current) => ({ ...current, syncState: 'synced', syncedAt: result.syncedAt, error: '' }))
      toast(result.local
        ? 'Saved on this device. Cross-device sync needs the WeSolve server.'
        : 'Workspace synced to your account.')
      return true
    } catch (error) {
      setAuth((current) => ({ ...current, syncState: 'error', error: error.message }))
      toast(error.message || 'Could not sync right now.', 'error')
      return false
    }
  }, [auth.status, state, toast])

  const updateProfile = useCallback(async ({ name }) => {
    if (auth.status !== 'authenticated') return null
    const result = await accounts.updateProfile({ name })
    patch((current) => ({ ...current, user: { ...current.user, ...result.user } }))
    toast('Profile updated.')
    return result.user
  }, [auth.status, patch, toast])

  const changePassword = useCallback(async ({ currentPassword, nextPassword }) => {
    await accounts.changePassword({ currentPassword, nextPassword })
    toast('Password changed.')
  }, [toast])

  const deleteAccount = useCallback(async (password) => {
    await accounts.deleteAccount(password)
    lastSyncedRef.current = ''
    setState(starterState())
    setAuth({ status: 'anonymous', syncedAt: null, syncState: 'local', error: '' })
    toast('Your account and synced data were deleted.')
  }, [patch, toast])

  const setPlan = useCallback((plan) => {
    patch({ plan })
    setUpgradeOpen(false)
    toast(plan === 'pro' ? 'Pro is active for your account.' : 'Switched to the free plan.')
    if (auth.status === 'authenticated') {
      accounts.updateProfile({ plan }).catch(() => {})
    }
  }, [auth.status, patch, toast])

  const canSolve = useCallback(() => {
    if (state.plan === 'pro') return true
    return state.solvesUsed < 2
  }, [state.plan, state.solvesUsed])

  const consumeSolve = useCallback((solution) => {
    const slim = slimSolution(solution)
    patch((current) => ({
      ...current,
      solvesUsed: current.solvesUsed + 1,
      history: [slim, ...current.history].slice(0, 30),
    }))
  }, [patch])

  const addHistory = useCallback((solution) => {
    const slim = slimSolution(solution)
    patch((current) => ({ ...current, history: [slim, ...current.history.filter((item) => item.id !== solution.id)].slice(0, 30) }))
  }, [patch])

  const deleteHistory = useCallback((id) => {
    patch((current) => ({ ...current, history: current.history.filter((item) => item.id !== id) }))
  }, [patch])

  const clearHistory = useCallback(() => {
    patch({ history: [] })
    toast('Solve history cleared.')
  }, [patch, toast])

  const saveStudySet = useCallback((pack) => {
    patch((current) => ({
      ...current,
      studySets: [pack, ...current.studySets.filter((item) => item.id !== pack.id)].slice(0, 20),
      currentPackId: pack.id,
    }))
    toast(`“${pack.title}” saved to your library.`)
  }, [patch, toast])

  const deleteStudySet = useCallback((id) => {
    patch((current) => ({
      ...current,
      studySets: current.studySets.filter((item) => item.id !== id),
      currentPackId: current.currentPackId === id ? (current.studySets.find((item) => item.id !== id)?.id || null) : current.currentPackId,
    }))
  }, [patch])

  const setCurrentPack = useCallback((id) => patch({ currentPackId: id }), [patch])

  const saveNote = useCallback((note) => {
    patch((current) => ({ ...current, notes: [note, ...current.notes].slice(0, 20) }))
  }, [patch])

  const saveResearch = useCallback((report) => {
    patch((current) => ({ ...current, research: [report, ...current.research].slice(0, 20) }))
  }, [patch])

  const saveExam = useCallback((exam) => {
    patch((current) => ({ ...current, exams: [exam, ...current.exams.filter((item) => item.id !== exam.id)].slice(0, 10) }))
  }, [patch])

  const updateOnboarding = useCallback((onboarding) => {
    patch((current) => ({ ...current, onboarding: { ...current.onboarding, ...onboarding } }))
  }, [patch])

  const updateSettings = useCallback((settings) => {
    patch((current) => ({ ...current, settings: { ...current.settings, ...settings } }))
  }, [patch])

  const resetWorkspace = useCallback(() => {
    const starter = starterState()
    setState({ ...starter, user: state.user })
    toast('Workspace reset to the starter study set.')
  }, [state.user, toast])

  const refreshServiceSettings = useCallback(() => {
    setServiceSettingsVersion((value) => value + 1)
  }, [])

  const currentPack = useMemo(
    () => state.studySets.find((pack) => pack.id === state.currentPackId) || state.studySets[0] || generateStudyPack(sampleStudyMaterial, 'Biology foundations'),
    [state.currentPackId, state.studySets],
  )

  const value = useMemo(() => ({
    state,
    currentPack,
    auth,
    isAuthenticated: auth.status === 'authenticated',
    backend,
    hasBackend: backend.available,
    isStaticPreview: backend.checked && !backend.available,
    retryServer: retryBackend,
    toasts,
    removeToast,
    toast,
    authOpen,
    setAuthOpen,
    upgradeOpen,
    setUpgradeOpen,
    serviceSettingsOpen,
    setServiceSettingsOpen,
    serviceSettingsVersion,
    refreshServiceSettings,
    mobileMenuOpen,
    setMobileMenuOpen,
    signIn,
    signUp,
    signOut,
    syncNow,
    updateProfile,
    changePassword,
    deleteAccount,
    setPlan,
    canSolve,
    consumeSolve,
    addHistory,
    deleteHistory,
    clearHistory,
    saveStudySet,
    deleteStudySet,
    setCurrentPack,
    saveNote,
    saveResearch,
    saveExam,
    updateOnboarding,
    updateSettings,
    resetWorkspace,
  }), [state, currentPack, auth, backend, toasts, removeToast, toast, authOpen, upgradeOpen, serviceSettingsOpen, serviceSettingsVersion, refreshServiceSettings, mobileMenuOpen, signIn, signUp, signOut, syncNow, updateProfile, changePassword, deleteAccount, setPlan, canSolve, consumeSolve, addHistory, deleteHistory, clearHistory, saveStudySet, deleteStudySet, setCurrentPack, saveNote, saveResearch, saveExam, updateOnboarding, updateSettings, resetWorkspace])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
