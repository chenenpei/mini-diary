import { describe, expect, it } from 'vitest'
import type { DiaryEntry, ImageManifest } from '@/types'
import { mergeEntries, mergeImages, detectChanges } from '@/lib/sync'

function makeEntry(overrides: Partial<DiaryEntry> & { id: string }): DiaryEntry {
  return {
    content: 'Test content',
    date: '2024-01-15',
    createdAt: 1000,
    updatedAt: 1000,
    imageIds: [],
    ...overrides,
  }
}

describe('sync', () => {
  describe('mergeEntries', () => {
    it('should keep cloud entry when cloud is newer', () => {
      const local = [makeEntry({ id: 'a', updatedAt: 1000, content: 'old' })]
      const cloud = [makeEntry({ id: 'a', updatedAt: 1500, content: 'new' })]

      const result = mergeEntries(local, cloud)

      expect(result).toHaveLength(1)
      expect(result[0]!.content).toBe('new')
    })

    it('should keep local entry when local is newer', () => {
      const local = [makeEntry({ id: 'a', updatedAt: 2000, content: 'local' })]
      const cloud = [makeEntry({ id: 'a', updatedAt: 1000, content: 'cloud' })]

      const result = mergeEntries(local, cloud)

      expect(result).toHaveLength(1)
      expect(result[0]!.content).toBe('local')
    })

    it('should include entries only in local', () => {
      const local = [makeEntry({ id: 'a' })]
      const cloud: DiaryEntry[] = []

      const result = mergeEntries(local, cloud)

      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('a')
    })

    it('should include entries only in cloud', () => {
      const local: DiaryEntry[] = []
      const cloud = [makeEntry({ id: 'b' })]

      const result = mergeEntries(local, cloud)

      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('b')
    })

    it('should merge entries from both sides', () => {
      const local = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })]
      const cloud = [makeEntry({ id: 'b', updatedAt: 2000 }), makeEntry({ id: 'c' })]

      const result = mergeEntries(local, cloud)

      expect(result).toHaveLength(3)
      const ids = result.map((e) => e.id).sort()
      expect(ids).toEqual(['a', 'b', 'c'])
    })

    it('should propagate soft delete via updatedAt comparison', () => {
      const local = [makeEntry({ id: 'a', updatedAt: 2000, deletedAt: 2000 })]
      const cloud = [makeEntry({ id: 'a', updatedAt: 1000 })]

      const result = mergeEntries(local, cloud)

      expect(result[0]!.deletedAt).toBe(2000)
    })

    it('should keep cloud version when cloud restores a deleted entry', () => {
      const local = [makeEntry({ id: 'a', updatedAt: 1000, deletedAt: 1000 })]
      const cloud = [makeEntry({ id: 'a', updatedAt: 2000 })]

      const result = mergeEntries(local, cloud)

      expect(result[0]!.deletedAt).toBeUndefined()
    })

    it('should handle both arrays empty', () => {
      const result = mergeEntries([], [])
      expect(result).toEqual([])
    })
  })

  describe('mergeImages', () => {
    it('should identify images to upload (local only)', () => {
      const local: ImageManifest[] = [
        { id: 'img-1', entryId: 'a', createdAt: 1000 },
        { id: 'img-2', entryId: 'a', createdAt: 1000 },
      ]
      const cloud: ImageManifest[] = [
        { id: 'img-1', entryId: 'a', createdAt: 1000 },
      ]

      const result = mergeImages(local, cloud)

      expect(result.toUpload).toEqual(['img-2'])
      expect(result.toDownload).toEqual([])
    })

    it('should identify images to download (cloud only)', () => {
      const local: ImageManifest[] = []
      const cloud: ImageManifest[] = [
        { id: 'img-1', entryId: 'a', createdAt: 1000 },
      ]

      const result = mergeImages(local, cloud)

      expect(result.toUpload).toEqual([])
      expect(result.toDownload).toEqual(['img-1'])
    })

    it('should not include images present in both', () => {
      const manifest: ImageManifest[] = [
        { id: 'img-1', entryId: 'a', createdAt: 1000 },
      ]

      const result = mergeImages(manifest, manifest)

      expect(result.toUpload).toEqual([])
      expect(result.toDownload).toEqual([])
    })

    it('should handle empty manifests', () => {
      const result = mergeImages([], [])

      expect(result.toUpload).toEqual([])
      expect(result.toDownload).toEqual([])
    })
  })

  describe('detectChanges', () => {
    const LAST_SYNCED = 1000

    it('should return no-change when nothing changed', () => {
      const result = detectChanges(LAST_SYNCED, LAST_SYNCED, LAST_SYNCED)
      expect(result).toBe('no-change')
    })

    it('should return local-only when only local changed', () => {
      const result = detectChanges(2000, LAST_SYNCED, LAST_SYNCED)
      expect(result).toBe('local-only')
    })

    it('should return cloud-only when only cloud changed', () => {
      const result = detectChanges(LAST_SYNCED, 2000, LAST_SYNCED)
      expect(result).toBe('cloud-only')
    })

    it('should return both-changed when both changed', () => {
      const result = detectChanges(2000, 3000, LAST_SYNCED)
      expect(result).toBe('both-changed')
    })

    it('should return no-change when timestamps equal lastSyncedAt', () => {
      const result = detectChanges(1000, 1000, 1000)
      expect(result).toBe('no-change')
    })
  })
})
