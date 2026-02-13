import { db } from '@/lib/db'
import type { AppSettings } from '@/types'

const SYNC_KEY = 'sync'

/**
 * Default values for required AppSettings fields when creating sync records.
 * These are placeholder values since the sync record only uses cloud-related fields.
 */
const SYNC_RECORD_DEFAULTS: Pick<AppSettings, 'key' | 'theme' | 'version'> = {
  key: SYNC_KEY,
  theme: 'system',
  version: '1.0',
}

/**
 * Atomically upsert the sync settings record.
 * Uses a Dexie transaction to ensure the get-then-update is atomic.
 */
async function upsertSyncRecord(fields: Partial<AppSettings>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const existing = await db.settings.get(SYNC_KEY)
    if (existing) {
      await db.settings.update(SYNC_KEY, fields)
    } else {
      await db.settings.put({ ...SYNC_RECORD_DEFAULTS, ...fields })
    }
  })
}

/**
 * Settings Repository
 * Handles sync-related settings stored under a single record with key='sync'
 */
export const settingsRepository = {
  /**
   * Get the last successful sync timestamp
   */
  async getLastSyncedAt(): Promise<number | undefined> {
    const record = await db.settings.get(SYNC_KEY)
    return record?.lastSyncedAt
  },

  /**
   * Set the last successful sync timestamp
   */
  async setLastSyncedAt(timestamp: number): Promise<void> {
    await upsertSyncRecord({ lastSyncedAt: timestamp })
  },

  /**
   * Get the configured cloud provider
   */
  async getCloudProvider(): Promise<'google-drive' | null> {
    const record = await db.settings.get(SYNC_KEY)
    return record?.cloudProvider ?? null
  },

  /**
   * Set the cloud provider
   */
  async setCloudProvider(provider: 'google-drive'): Promise<void> {
    await upsertSyncRecord({ cloudProvider: provider })
  },

  /**
   * Get the stored access token and its expiration
   */
  async getAccessToken(): Promise<{ token: string; expiresAt: number } | null> {
    const record = await db.settings.get(SYNC_KEY)
    if (!record?.cloudAccessToken || !record?.cloudTokenExpiresAt) return null
    return { token: record.cloudAccessToken, expiresAt: record.cloudTokenExpiresAt }
  },

  /**
   * Set the access token and its expiration timestamp
   */
  async setAccessToken(token: string, expiresAt: number): Promise<void> {
    await upsertSyncRecord({ cloudAccessToken: token, cloudTokenExpiresAt: expiresAt })
  },

  /**
   * Clear all sync-related settings by deleting the sync record
   */
  async clearSyncSettings(): Promise<void> {
    await db.settings.delete(SYNC_KEY)
  },
}
