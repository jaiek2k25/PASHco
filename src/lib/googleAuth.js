let scriptPromise = null

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google sign-in requires a browser.'))
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]')
    if (existing) {
      existing.addEventListener('load', () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google Identity Services did not load.')), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google Identity Services did not load.'))
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function renderGoogleButton(element, clientId, callback) {
  if (!element || !clientId) return
  const googleId = await loadGoogleIdentityScript()
  googleId.initialize({
    client_id: clientId,
    callback,
    auto_select: false,
    cancel_on_tap_outside: true,
  })
  element.innerHTML = ''
  googleId.renderButton(element, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    width: Math.min(320, Math.max(220, element.clientWidth || 300)),
    text: 'continue_with',
  })
}

export async function verifyGoogleCredential(credential, clientId) {
  if (!credential || !clientId) throw new Error('Missing Google credential or client ID.')
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
  if (!response.ok) throw new Error('Google could not verify this sign-in.')
  const profile = await response.json()
  if (profile.aud !== clientId) throw new Error('This Google token was issued for another app.')
  if (profile.email_verified !== 'true' && profile.email_verified !== true) throw new Error('This Google email is not verified.')
  return {
    name: profile.name || profile.email?.split('@')[0] || 'Google Student',
    email: profile.email,
    picture: profile.picture || '',
    provider: 'google',
  }
}
