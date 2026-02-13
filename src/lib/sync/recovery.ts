import { backupsRepository } from '@/lib/repositories/backups'

export interface RecoveryInfo {
  entryCount: number
  imageCount: number
  createdAt: number
}

/**
 * Check if there's a pending backup from an interrupted sync.
 * Returns recovery info if a backup exists, null otherwise.
 */
export async function checkPendingRecovery(): Promise<RecoveryInfo | null> {
  const backup = await backupsRepository.getBackup()
  if (!backup) return null

  return {
    entryCount: backup.entries.length,
    imageCount: backup.imageManifest.length,
    createdAt: backup.createdAt,
  }
}

export async function restoreFromBackup(): Promise<void> {
  const backup = await backupsRepository.getBackup()
  if (!backup) return

  const { db } = await import('@/lib/db')
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear()
    if (backup.entries.length > 0) {
      await db.entries.bulkPut(backup.entries)
    }
  })

  await backupsRepository.deleteBackup()
}
