import { db } from '@/lib/db'
import type { DiaryEntry, ImageManifest, SyncBackup } from '@/types'

export const backupsRepository = {
  async createBackup(entries: DiaryEntry[], imageManifest: ImageManifest[]): Promise<void> {
    const backup: SyncBackup = {
      id: 'latest',
      entries,
      imageManifest,
      createdAt: Date.now(),
    }
    await db.syncBackups.put(backup)
  },

  async getBackup(): Promise<SyncBackup | null> {
    const backup = await db.syncBackups.get('latest')
    return backup ?? null
  },

  async deleteBackup(): Promise<void> {
    await db.syncBackups.delete('latest')
  },

  async hasBackup(): Promise<boolean> {
    const count = await db.syncBackups.count()
    return count > 0
  },
}
