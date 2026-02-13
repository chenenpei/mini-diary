import { describe, expect, it } from 'vitest'
import { calculateProgress, getOperationPhases } from '@/lib/sync/progress'

describe('sync progress', () => {
  describe('getOperationPhases', () => {
    it('should return correct phases for push', () => {
      const phases = getOperationPhases('push')
      expect(phases).toEqual([
        'preparing',
        'checking',
        'uploading-entries',
        'uploading-images',
        'cleanup',
      ])
    })

    it('should return correct phases for pull', () => {
      const phases = getOperationPhases('pull')
      expect(phases).toEqual([
        'preparing',
        'checking',
        'downloading-entries',
        'downloading-images',
        'verifying',
      ])
    })

    it('should return correct phases for merge', () => {
      const phases = getOperationPhases('merge')
      expect(phases).toEqual([
        'preparing',
        'checking',
        'downloading-entries',
        'downloading-images',
        'merging',
        'uploading-entries',
        'uploading-images',
        'cleanup',
      ])
    })
  })

  describe('calculateProgress', () => {
    it('should return 0 at the start of any operation', () => {
      const result = calculateProgress('push', 0, 0)
      expect(result).toBe(0)
    })

    it('should return 100 when all phases complete', () => {
      const phases = getOperationPhases('push')
      const result = calculateProgress('push', phases.length, 0)
      expect(result).toBe(100)
    })

    it('should weight image phases more heavily', () => {
      const afterChecking = calculateProgress('push', 2, 0)
      const afterUploadEntries = calculateProgress('push', 3, 0)
      expect(afterUploadEntries - afterChecking).toBeGreaterThan(afterChecking / 2)
    })

    it('should calculate partial progress within image phase', () => {
      const noImages = calculateProgress('push', 3, 0)
      const halfImages = calculateProgress('push', 3, 0.5)
      const allImages = calculateProgress('push', 3, 1)
      expect(halfImages).toBeGreaterThan(noImages)
      expect(allImages).toBeGreaterThan(halfImages)
    })

    it('should handle merge operation with more phases', () => {
      const pushAfter2 = calculateProgress('push', 2, 0)
      const mergeAfter2 = calculateProgress('merge', 2, 0)
      expect(mergeAfter2).toBeLessThan(pushAfter2)
    })

    it('should clamp result between 0 and 100', () => {
      const result = calculateProgress('push', 0, 0)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })
  })
})
