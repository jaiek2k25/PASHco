import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createId, generateStudyPack, sampleStudyMaterial } from '../lib/intelligence'

const STORAGE_KEY = 'pashco-solvely-recreation-v1'

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

function loadState() {
  if (typeof window === 'undefined') return defaultState
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved) {
      const starterPack = generateStudyPack(sampleStudyMaterial, 'Biology foundations')
      return { ...defaultState, studySets: [{ ...starterPack, id: 'starter-pack' }] }
    }
    return {
      ...defaultState,
      ...saved,
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      onboarding: { ...defaultState.onboarding, ...(saved.onboarding || {}) },
    }
  } catch {
    return defaultState
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [toasts, setToasts] = useState([])
  const [authOpen, setAuthOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [serviceSettingsOpen, setServiceSettingsOpen] = useState(false)
  const [serviceSettingsVersion, setServiceSettingsVersion] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage may be unavailable in private browsing; the app still works in memory.
    }
  }, [state])

  const removeToast = useCallback((id) => {
    setToasts((items) => items.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback((message, type = 'success') => {
    const id = createId('toast')
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => removeToast(id), 3600)
  }, [removeToast])

  const patch = useCallback((updater) => {
    setState((current) => (typeof updater === 'function' ? updater(current) : { ...current, ...updater }))
  }, [])

  const signIn = useCallback(({ name, email, provider = 'demo', picture = '' }) => {
    const displayName = name?.trim() || email?.split('@')[0] || 'Student'
    patch((current) => ({
      ...current,
      user: {
        name: displayName,
        email: email || `${displayName.toLowerCase().replace(/\s+/g, '.')}@demo.local`,
        provider,
        picture,
        joinedAt: current.user?.joinedAt || new Date().toISOString(),
      },
    }))
    setAuthOpen(false)
    toast(`Welcome, ${displayName}!`)
  }, [patch, toast])

  const signOut = useCallback(() => {
    patch({ user: null })
    toast('Signed out of your demo workspace.')
  }, [patch, toast])

  const setPlan = useCallback((plan) => {
    patch({ plan })
    setUpgradeOpen(false)
    toast(plan === 'pro' ? 'Pro is active in this demo workspace.' : 'Switched to the free plan.')
  }, [patch, toast])

  const canSolve = useCallback(() => {
    if (state.plan === 'pro') return true
    return state.solvesUsed < 2
  }, [state.plan, state.solvesUsed])

  const consumeSolve = useCallback((solution) => {
    patch((current) => ({
      ...current,
      solvesUsed: current.solvesUsed + 1,
      history: [solution, ...current.history].slice(0, 30),
    }))
  }, [patch])

  const addHistory = useCallback((solution) => {
    patch((current) => ({ ...current, history: [solution, ...current.history.filter((item) => item.id !== solution.id)].slice(0, 30) }))
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
    const starterPack = generateStudyPack(sampleStudyMaterial, 'Biology foundations')
    setState({ ...defaultState, studySets: [{ ...starterPack, id: 'starter-pack' }] })
    toast('Workspace reset to the demo defaults.')
  }, [toast])

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
    signOut,
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
  }), [state, currentPack, toasts, removeToast, toast, authOpen, upgradeOpen, serviceSettingsOpen, serviceSettingsVersion, refreshServiceSettings, mobileMenuOpen, signIn, signOut, setPlan, canSolve, consumeSolve, addHistory, deleteHistory, clearHistory, saveStudySet, deleteStudySet, setCurrentPack, saveNote, saveResearch, saveExam, updateOnboarding, updateSettings, resetWorkspace])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
