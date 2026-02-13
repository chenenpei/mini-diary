import Dexie from 'dexie'
import type { AppSettings, DiaryEntry, ImageRecord, SyncBackup } from '@/types'

/**
 * MiniDiary IndexedDB Database
 *
 * Schema:
 * - entries: id, date, createdAt, updatedAt
 * - images: id, entryId, createdAt
 * - settings: key
 * - syncBackups: id
 */
class MiniDiaryDB extends Dexie {
  entries!: Dexie.Table<DiaryEntry, string>
  images!: Dexie.Table<ImageRecord, string>
  settings!: Dexie.Table<AppSettings, string>
  syncBackups!: Dexie.Table<SyncBackup, string>

  constructor() {
    super('MiniDiaryDB')

    this.version(1).stores({
      // Primary key: id, Indexes: date, createdAt, updatedAt
      entries: 'id, date, createdAt, updatedAt',
      // Primary key: id, Indexes: entryId, createdAt
      images: 'id, entryId, createdAt',
      // Primary key: key
      settings: 'key',
    })

    this.version(2).stores({
      entries: 'id, date, createdAt, updatedAt',
      images: 'id, entryId, createdAt',
      settings: 'key',
      // Primary key: id (singleton 'latest')
      syncBackups: 'id',
    })
  }
}

// Singleton database instance
export const db = new MiniDiaryDB()

// Re-export for convenience
export type { MiniDiaryDB }
