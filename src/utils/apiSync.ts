export interface GoogleUserProfile {
  /** Google OpenID Connect `sub` claim; used as the stable local progress key. */
  googleId: string;
  email: string;
  name: string;
  givenName: string;
  avatarInitials: string;
  picture?: string;
}

export interface ApiConnectionConfig {
  apiUrl: string;
  courseApiUrl: string;
  googleClientId: string;
  autoSyncEnabled: boolean;
}

export interface ApiSyncLog {
  id: string;
  timestamp: string;
  action: 'LOAD_PROGRESS' | 'SYNC_PROGRESS' | 'CLAIM_REWARD' | 'GOOGLE_AUTH' | 'COURSE_COMPLETE';
  status: 'SUCCESS_API' | 'LOCAL_ONLY' | 'API_ERROR';
  endpoint: string;
  summary: string;
}

const API_CONFIG_STORAGE_KEY = 'pashco_api_connection_config_v2';

function getEnvConfig() {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  return {
    apiUrl: env.VITE_PASHCO_API_URL || '',
    courseApiUrl: env.VITE_PASHCO_COURSE_API_URL || '',
    googleClientId: env.VITE_GOOGLE_CLIENT_ID || '',
  };
}

export function loadApiConfig(): ApiConnectionConfig {
  const env = getEnvConfig();
  try {
    const raw = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApiConnectionConfig>;
      return {
        apiUrl: parsed.apiUrl ?? env.apiUrl,
        courseApiUrl: parsed.courseApiUrl ?? env.courseApiUrl,
        googleClientId: parsed.googleClientId ?? env.googleClientId,
        autoSyncEnabled: parsed.autoSyncEnabled ?? true,
      };
    }
  } catch {
    // Use environment-provided public settings when storage is unavailable.
  }
  return { ...env, autoSyncEnabled: true };
}

export function saveApiConfig(config: ApiConnectionConfig): void {
  try {
    // Never store API secrets or Google ID tokens in browser storage.
    localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The app remains usable with in-memory settings if storage is unavailable.
  }
}

/**
 * Decodes the Google Identity Services credential to populate the UI. This is
 * not cryptographic verification: the configured API must verify the JWT
 * signature, issuer, audience and expiry before trusting it for server writes.
 */
export function decodeGoogleCredential(
  credential: string,
  expectedClientId: string
): GoogleUserProfile {
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Google returned an invalid credential.');

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(bytes)) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
    aud?: string | string[];
    iss?: string;
    exp?: number;
  };

  const audienceMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(expectedClientId)
    : claims.aud === expectedClientId;
  const validIssuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  const notExpired = typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();

  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    throw new Error('Google did not return a verified email identity.');
  }
  if (!audienceMatches || !validIssuer || !notExpired) {
    throw new Error('Google credential does not match this client ID or has expired.');
  }

  const name = claims.name || claims.given_name || claims.email;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  return {
    googleId: claims.sub,
    email: claims.email,
    name,
    givenName: claims.given_name || name.split(/\s+/)[0],
    avatarInitials: initials || 'P',
    picture: claims.picture,
  };
}

function createLog(
  action: ApiSyncLog['action'],
  status: ApiSyncLog['status'],
  endpoint: string,
  summary: string
): ApiSyncLog {
  return {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString(),
    action,
    status,
    endpoint,
    summary,
  };
}

export interface RemoteProgressResult {
  progress: unknown | null;
  /** True only after a valid remote snapshot or a confirmed 404 (new account). */
  safeToSync: boolean;
  log: ApiSyncLog;
}

/** Fetch an account snapshot; the server must authenticate the Google ID token. */
export async function fetchRemoteProgress(
  config: ApiConnectionConfig,
  googleIdToken: string | null,
  expectedGoogleSub: string
): Promise<RemoteProgressResult> {
  const endpoint = config.apiUrl.trim();
  if (!endpoint) {
    return {
      progress: null,
      safeToSync: false,
      log: createLog('LOAD_PROGRESS', 'LOCAL_ONLY', 'localStorage://pashco-progress', 'No API is configured; restored this account from this browser only.'),
    };
  }
  if (!googleIdToken) {
    return {
      progress: null,
      safeToSync: false,
      log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, 'Google sign-in is required before loading remote progress.'),
    };
  }

  try {
    const parsedEndpoint = new URL(endpoint, window.location.origin);
    const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(parsedEndpoint.hostname);
    if (parsedEndpoint.protocol !== 'https:' && !isLocalDevelopment) {
      return {
        progress: null,
        safeToSync: false,
        log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, 'Remote API URLs must use HTTPS.'),
      };
    }

    const response = await fetch(parsedEndpoint.toString(), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${googleIdToken}`,
      },
    });

    if (response.status === 404) {
      return {
        progress: null,
        safeToSync: true,
        log: createLog('LOAD_PROGRESS', 'LOCAL_ONLY', endpoint, 'No remote record exists yet; the local account record will be used.'),
      };
    }
    if (!response.ok) {
      return {
        progress: null,
        safeToSync: false,
        log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, `API returned HTTP ${response.status}. The local account record remains available.`),
      };
    }

    const body = await response.json() as { googleSub?: unknown; progress?: unknown };
    if (body.googleSub !== expectedGoogleSub) {
      return {
        progress: null,
        safeToSync: false,
        log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, 'The API response subject did not match the signed-in Google account; remote data was not loaded.'),
      };
    }
    if (!body.progress || typeof body.progress !== 'object' || Array.isArray(body.progress)) {
      return {
        progress: null,
        safeToSync: false,
        log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, 'The API response did not include a progress object.'),
      };
    }
    return {
      progress: body.progress,
      safeToSync: true,
      log: createLog('LOAD_PROGRESS', 'SUCCESS_API', endpoint, 'Remote progress loaded for the verified Google account.'),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Network or CORS error';
    return {
      progress: null,
      safeToSync: false,
      log: createLog('LOAD_PROGRESS', 'API_ERROR', endpoint, `${detail}. The local account record remains available.`),
    };
  }
}

export async function syncPayloadToCustomApi(
  config: ApiConnectionConfig,
  action: ApiSyncLog['action'],
  payload: Record<string, unknown>,
  googleIdToken?: string | null
): Promise<ApiSyncLog> {
  const endpoint = config.apiUrl.trim();
  if (!endpoint) {
    return createLog(
      action,
      'LOCAL_ONLY',
      'localStorage://pashco-progress',
      'Progress is saved in this browser. Add your API endpoint when it is ready to enable remote sync.'
    );
  }

  if (!googleIdToken) {
    return createLog(
      action,
      'API_ERROR',
      endpoint,
      'Remote sync requires a current Google sign-in. Local progress remains saved.'
    );
  }

  try {
    const parsedEndpoint = new URL(endpoint, window.location.origin);
    const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(parsedEndpoint.hostname);
    if (parsedEndpoint.protocol !== 'https:' && !isLocalDevelopment) {
      return createLog(action, 'API_ERROR', endpoint, 'Remote API URLs must use HTTPS.');
    }

    const response = await fetch(parsedEndpoint.toString(), {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleIdToken}`,
      },
      body: JSON.stringify({
        platform: 'PASHco',
        action,
        occurredAt: new Date().toISOString(),
        contactEmail: 'cyberjai2k25@gmail.com',
        instagram: 'love_me_for_my_wits',
        ...payload,
      }),
    });

    if (!response.ok) {
      return createLog(
        action,
        'API_ERROR',
        endpoint,
        `API returned HTTP ${response.status}. Progress remains saved locally; check the endpoint and server logs.`
      );
    }

    return createLog(action, 'SUCCESS_API', endpoint, `HTTP ${response.status} · ${action} accepted.`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Network or CORS error';
    return createLog(action, 'API_ERROR', endpoint, `${detail}. Progress remains saved locally.`);
  }
}
