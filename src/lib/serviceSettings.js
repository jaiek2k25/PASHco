const STORAGE_KEY = 'wesolve-service-settings-v1'

const DEFAULTS = {
  nvidiaApiKey: '',
  nvidiaModel: '',
  nvidiaVisionModel: '',
}

export function getServiceSettings() {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
      || window.localStorage.getItem('pashco-wesolve-service-settings-v1')
      || window.localStorage.getItem('pashco-solvely-service-settings-v1')
      || '{}'
    const saved = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...saved,
      nvidiaApiKey: typeof saved.nvidiaApiKey === 'string' ? saved.nvidiaApiKey : '',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setServiceSettings(settings) {
  const next = { ...getServiceSettings(), ...settings }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('wesolve-service-settings-changed', { detail: next }))
  }
  return next
}

export function clearServiceSettings() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('wesolve-service-settings-changed', { detail: { ...DEFAULTS } }))
  }
  return { ...DEFAULTS }
}

export function maskKey(value = '') {
  if (!value) return ''
  if (value.length <= 10) return `${value.slice(0, 2)}••••`
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}
