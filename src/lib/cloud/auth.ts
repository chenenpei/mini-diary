import type { SyncError } from '@/types'
import type { TokenProvider } from '@/lib/cloud/types'
import { settingsRepository } from '@/lib/repositories/settings'

/** Buffer before token expiry to trigger refresh (5 minutes) */
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000

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

declare const google: {
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

/**
 * Create a TokenProvider backed by Google Identity Services.
 *
 * Behavior:
 * 1. Check stored token — if valid and not expired, return it
 * 2. If expired or missing — request new token via GIS
 * 3. GIS may show a popup if user interaction is needed
 * 4. Store new token in IndexedDB settings
 *
 * @param clientId - Google OAuth client ID
 */
export function createGoogleTokenProvider(clientId: string): TokenProvider {
  let tokenClient: TokenClient | null = null
  let inflightRequest: Promise<string> | null = null

  return async (): Promise<string> => {
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
        tokenClient = google.accounts.oauth2.initTokenClient({
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
