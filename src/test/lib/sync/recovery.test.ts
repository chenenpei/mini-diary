import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { backupsRepository } from '@/lib/repositories/backups'
import { checkPendingRecovery } from '@/lib/sync/recovery'

function makeEntry(id: string) {
  return {
    id,
    content: 'test',
    date: '2024-01-15',
    createdAt: 1000,
    updatedAt: 1000,
    imageIds: [] as string[],
  }
}

describe('checkPendingRecovery', () => {
  beforeEach(async () => {
    await db.syncBackups.clear()
  })

  afterEach(async () => {
    await db.syncBackups.clear()
  })

  it('should return null when no backup exists', async () => {
    const result = await checkPendingRecovery()
    expect(result).toBeNull()
  })

  it('should return recovery info when backup exists', async () => {
    const entries = [makeEntry('a'), makeEntry('b')]
    await backupsRepository.createBackup(entries, [])

    const result = await checkPendingRecovery()

    expect(result).not.toBeNull()
    expect(result?.entryCount).toBe(2)
    expect(result?.imageCount).toBe(0)
    expect(result?.createdAt).toBeGreaterThan(0)
  })

  it('should include image count in recovery info', async () => {
    await backupsRepository.createBackup(
      [makeEntry('a')],
      [{ id: 'img-1', entryId: 'a', createdAt: 1000 }],
    )

    const result = await checkPendingRecovery()
    expect(result?.imageCount).toBe(1)
  })
})
