import { describe, expect, it } from 'vitest'
import type { DiaryEntry } from '@/types'
import { mergeEntries } from '@/lib/sync'

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
})
