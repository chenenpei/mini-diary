import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { backupsRepository } from '@/lib/repositories/backups'
import type { DiaryEntry, ImageManifest } from '@/types'

function makeEntry(id: string): DiaryEntry {
  return {
    id,
    content: 'test',
    date: '2024-01-15',
    createdAt: 1000,
    updatedAt: 1000,
    imageIds: [],
  }
}

describe('backupsRepository', () => {
  beforeEach(async () => {
    await db.syncBackups.clear()
  })

  afterEach(async () => {
    await db.syncBackups.clear()
  })

  describe('createBackup', () => {
    it('should save a backup with entries and manifest', async () => {
      const entries = [makeEntry('a'), makeEntry('b')]
      const manifest: ImageManifest[] = [{ id: 'img-1', entryId: 'a', createdAt: 1000 }]

      await backupsRepository.createBackup(entries, manifest)

      const backup = await db.syncBackups.get('latest')
      expect(backup).toBeDefined()
      expect(backup?.entries).toHaveLength(2)
      expect(backup?.imageManifest).toHaveLength(1)
      expect(backup?.createdAt).toBeGreaterThan(0)
    })

    it('should overwrite existing backup', async () => {
      await backupsRepository.createBackup([makeEntry('a')], [])
      await backupsRepository.createBackup([makeEntry('b')], [])

      const backup = await db.syncBackups.get('latest')
      expect(backup?.entries).toHaveLength(1)
      expect(backup?.entries[0]?.id).toBe('b')
    })
  })

  describe('getBackup', () => {
    it('should return null when no backup exists', async () => {
      const backup = await backupsRepository.getBackup()
      expect(backup).toBeNull()
    })

    it('should return existing backup', async () => {
      await backupsRepository.createBackup([makeEntry('a')], [])
      const backup = await backupsRepository.getBackup()
      expect(backup).not.toBeNull()
      expect(backup?.entries[0]?.id).toBe('a')
    })
  })

  describe('deleteBackup', () => {
    it('should delete existing backup', async () => {
      await backupsRepository.createBackup([makeEntry('a')], [])
      await backupsRepository.deleteBackup()
      const backup = await backupsRepository.getBackup()
      expect(backup).toBeNull()
    })

    it('should not throw when no backup exists', async () => {
      await expect(backupsRepository.deleteBackup()).resolves.not.toThrow()
    })
  })

  describe('hasBackup', () => {
    it('should return false when no backup exists', async () => {
      expect(await backupsRepository.hasBackup()).toBe(false)
    })

    it('should return true when backup exists', async () => {
      await backupsRepository.createBackup([], [])
      expect(await backupsRepository.hasBackup()).toBe(true)
    })
  })
})
