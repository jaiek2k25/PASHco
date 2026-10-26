/**
 * One account API for both hosting modes.
 *
 * - Server deployment: calls /api/auth, which stores accounts and syncs work.
 * - Static deployment (GitHub Pages): falls back to device-local accounts so
 *   sign-up and sign-in still work, clearly scoped to this browser.
 *
 * Callers never see a 404 for an API that simply does not exist.
 */
import { authApi } from './authClient'
import { isStaticHost, markBackendMissing, probeBackend } from './backend'
import { clearSessionToken } from './sessionToken'
import {
  changePasswordLocal,
  clearLocalAiKey,
  deleteAccountLocal,
  getLocalWorkspace,
  localAiKey,
  loginLocal,
  logoutLocal,
  meLocal,
  registerLocal,
  saveLocalWorkspace,
  saveLocalAiKey,
  updateProfileLocal,
} from './localAccounts'

function isMissingEndpoint(error) {
  // A static host answers /api/* with a 404 HTML page, or the request never
  // leaves because the path is on another origin.
  return !error?.status || error.status === 404 || error.status === 405 || error.status === 501
}

async function withFallback(serverCall, localCall) {
  const backend = await probeBackend()
  if (!backend.available) return localCall()
  try {
    return await serverCall()
  } catch (error) {
    if (isMissingEndpoint(error)) {
      markBackendMissing()
      return localCall()
    }
    throw error
  }
}

export const accounts = {
  me: () => withFallback(() => authApi.me(), () => meLocal()),

  register: (payload) => withFallback(() => authApi.register(payload), () => registerLocal(payload)),

  login: (payload) => withFallback(() => authApi.login(payload), () => loginLocal(payload)),

  logout: () => {
    clearSessionToken()
    return withFallback(() => authApi.logout(), () => logoutLocal())
  },

  // Work is already persisted locally in both modes; the server copy is what
  // makes it follow you between devices.
  getWorkspace: () => withFallback(() => authApi.getWorkspace(), () => getLocalWorkspace()),

  saveWorkspace: (workspace) => withFallback(
    () => authApi.saveWorkspace(workspace),
    () => saveLocalWorkspace(workspace),
  ),

  updateProfile: (payload) => withFallback(() => authApi.updateProfile(payload), () => updateProfileLocal(payload)),

  changePassword: (payload) => withFallback(() => authApi.changePassword(payload), () => changePasswordLocal(payload)),

  deleteAccount: (password) => withFallback(() => authApi.deleteAccount(password), () => deleteAccountLocal()),

  getAiKey: () => withFallback(
    async () => {
      const result = await authApi.getAiKey()
      return { aiKey: result.aiKey }
    },
    () => ({ aiKey: localAiKey() }),
  ),

  saveAiKey: (payload) => withFallback(
    async () => {
      const result = await authApi.saveAiKey(payload)
      return { aiKey: result.aiKey }
    },
    () => ({ aiKey: saveLocalAiKey(payload) }),
  ),

  clearAiKey: () => withFallback(
    async () => {
      const result = await authApi.clearAiKey()
      return { aiKey: result.aiKey }
    },
    () => ({ aiKey: clearLocalAiKey() }),
  ),
}

/** True when this build has no server, so accounts cannot leave the device. */
export function isLocalOnly() {
  return isStaticHost()
}
