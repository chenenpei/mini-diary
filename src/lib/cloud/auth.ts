import type { TokenProvider } from '@/lib/cloud/types'
import { settingsRepository } from '@/lib/repositories/settings'
import type { SyncError } from '@/types'

/** Buffer before token expiry to trigger refresh (5 minutes) */
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

/**
 * GIS token client type (from Google Identity Services).
 * Declared here to avoid depending on @types/google.accounts.
 */
interface TokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
  callback: (response: TokenResponse) => void
}

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

interface GoogleAccounts {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (response: TokenResponse) => void
      }) => TokenClient
    }
  }
}

/** Dynamically load the GIS script if not already present */
let gisLoadPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (typeof window !== 'undefined' && 'google' in window) {
    return Promise.resolve()
  }

  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject({
        kind: 'network',
        message: 'Failed to load Google Identity Services script',
      } satisfies SyncError)
    document.head.appendChild(script)
  })

  // Allow retry on failure
  gisLoadPromise.catch(() => {
    gisLoadPromise = null
  })

  return gisLoadPromise
}

function getGoogle(): GoogleAccounts {
  if (typeof window === 'undefined' || !('google' in window)) {
    throw { kind: 'auth', message: 'Google Identity Services not available' } satisfies SyncError
  }
  return window.google as GoogleAccounts
}

/**
 * Create a TokenProvider backed by Google Identity Services.
 *
 * Behavior:
 * 1. Load GIS script if needed
 * 2. Check stored token — if valid and not expired, return it
 * 3. If expired or missing — request new token via GIS
 * 4. GIS may show a popup if user interaction is needed
 * 5. Store new token in IndexedDB settings
 *
 * @param clientId - Google OAuth client ID
 */
export function createGoogleTokenProvider(clientId: string): TokenProvider {
  let tokenClient: TokenClient | null = null
  let inflightRequest: Promise<string> | null = null

  return async (): Promise<string> => {
    // 0. Ensure GIS script is loaded
    await loadGisScript()

    // 1. Check stored token
    const stored = await settingsRepository.getAccessToken()
    if (stored && stored.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER) {
      return stored.token
    }

    // 2. If a token request is already in-flight, share it
    if (inflightRequest) {
      return inflightRequest
    }

    // 3. Request new token via GIS
    inflightRequest = new Promise<string>((resolve, reject) => {
      if (!tokenClient) {
        const gis = getGoogle()
        tokenClient = gis.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: () => {}, // overridden below
        })
      }

      tokenClient.callback = async (response: TokenResponse) => {
        if (response.error) {
          await settingsRepository.setAccessToken('', 0)
          reject({
            kind: 'auth',
            message: `OAuth failed: ${response.error}`,
          } satisfies SyncError)
          return
        }

        const expiresAt = Date.now() + response.expires_in * 1000
        await settingsRepository.setAccessToken(response.access_token, expiresAt)
        resolve(response.access_token)
      }

      // prompt: '' means try silent refresh first, GIS will show popup if needed
      tokenClient.requestAccessToken({ prompt: '' })
    }).finally(() => {
      inflightRequest = null
    })

    return inflightRequest
  }
}
