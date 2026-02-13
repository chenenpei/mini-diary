import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { settingsRepository } from '@/lib/repositories/settings'

describe('settingsRepository', () => {
  beforeEach(async () => {
    await db.settings.clear()
  })

  afterEach(async () => {
    await db.settings.clear()
  })

  describe('lastSyncedAt', () => {
    it('should return undefined when not set', async () => {
      const result = await settingsRepository.getLastSyncedAt()
      expect(result).toBeUndefined()
    })

    it('should set and get lastSyncedAt', async () => {
      await settingsRepository.setLastSyncedAt(1000)
      const result = await settingsRepository.getLastSyncedAt()
      expect(result).toBe(1000)
    })

    it('should overwrite existing value', async () => {
      await settingsRepository.setLastSyncedAt(1000)
      await settingsRepository.setLastSyncedAt(2000)
      const result = await settingsRepository.getLastSyncedAt()
      expect(result).toBe(2000)
    })
  })

  describe('cloudProvider', () => {
    it('should return null when not set', async () => {
      const result = await settingsRepository.getCloudProvider()
      expect(result).toBeNull()
    })

    it('should set and get cloudProvider', async () => {
      await settingsRepository.setCloudProvider('google-drive')
      const result = await settingsRepository.getCloudProvider()
      expect(result).toBe('google-drive')
    })
  })

  describe('accessToken', () => {
    it('should return null when not set', async () => {
      const result = await settingsRepository.getAccessToken()
      expect(result).toBeNull()
    })

    it('should set and get accessToken with expiry', async () => {
      await settingsRepository.setAccessToken('token-123', 9999999999)
      const result = await settingsRepository.getAccessToken()
      expect(result).toEqual({ token: 'token-123', expiresAt: 9999999999 })
    })

    it('should overwrite existing token', async () => {
      await settingsRepository.setAccessToken('old-token', 1000)
      await settingsRepository.setAccessToken('new-token', 2000)
      const result = await settingsRepository.getAccessToken()
      expect(result).toEqual({ token: 'new-token', expiresAt: 2000 })
    })
  })

  describe('clearSyncSettings', () => {
    it('should clear all sync-related settings', async () => {
      await settingsRepository.setLastSyncedAt(1000)
      await settingsRepository.setCloudProvider('google-drive')
      await settingsRepository.setAccessToken('token', 9999)

      await settingsRepository.clearSyncSettings()

      expect(await settingsRepository.getLastSyncedAt()).toBeUndefined()
      expect(await settingsRepository.getCloudProvider()).toBeNull()
      expect(await settingsRepository.getAccessToken()).toBeNull()
    })
  })
})
