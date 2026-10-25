const STORAGE_KEY = 'pashco-solvely-service-settings-v1'

const DEFAULTS = {
  nvidiaApiKey: '',
  nvidiaModel: '',
  nvidiaVisionModel: '',
  googleClientId: '',
}

export function getServiceSettings() {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      ...DEFAULTS,
      ...saved,
      googleClientId: saved.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      nvidiaApiKey: typeof saved.nvidiaApiKey === 'string' ? saved.nvidiaApiKey : '',
    }
  } catch {
    return { ...DEFAULTS, googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '' }
  }
}

export function setServiceSettings(settings) {
  const next = { ...getServiceSettings(), ...settings }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('pashco-service-settings-changed', { detail: next }))
  }
  return next
}

export function clearServiceSettings() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('pashco-service-settings-changed', { detail: { ...DEFAULTS } }))
  }
  return { ...DEFAULTS }
}

export function maskKey(value = '') {
  if (!value) return ''
  if (value.length <= 10) return `${value.slice(0, 2)}••••`
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}
