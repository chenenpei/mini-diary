import { describe, expect, it, vi } from 'vitest'
import type { CloudAdapter } from '@/lib/cloud/types'
import { SyncManager } from '@/lib/sync/manager'
import type {
  CloudData,
  ConflictResolver,
  DiaryEntry,
  ImageManifest,
  SyncError,
  SyncInput,
  SyncProgress,
} from '@/types'

// ============================================
// Test Helpers
// ============================================

function createMockAdapter(): { [K in keyof CloudAdapter]: ReturnType<typeof vi.fn> } {
  return {
    readJson: vi.fn(),
    writeJson: vi.fn(),
    uploadImage: vi.fn(),
    downloadImage: vi.fn(),
    listFiles: vi.fn(),
    deleteFiles: vi.fn(),
  }
}

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

function makeCloudData(overrides: Partial<CloudData> = {}): CloudData {
  return {
    version: 1,
    syncedAt: '2024-01-15T00:00:00.000Z',
    entries: [],
    imageManifest: [],
    ...overrides,
  }
}

function makeManifest(overrides: Partial<ImageManifest> & { id: string }): ImageManifest {
  return {
    entryId: 'entry-1',
    createdAt: 1000,
    ...overrides,
  }
}

function makeDefaultInput(overrides: Partial<SyncInput> = {}): SyncInput {
  return {
    localEntries: [],
    localImageManifest: [],
    lastSyncedAt: undefined,
    getImageBlobs: vi.fn().mockResolvedValue({
      blob: new Blob(['image'], { type: 'image/jpeg' }),
      thumbnail: new Blob(['thumb'], { type: 'image/jpeg' }),
    }),
    onConflict: vi.fn().mockResolvedValue('merge'),
    ...overrides,
  }
}

describe('SyncManager', () => {
  // ============================================
  // Push flow (cloud empty — first sync)
  // ============================================

  describe('push flow (cloud empty)', () => {
    it('should push local entries when cloud is empty', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const entries = [makeEntry({ id: 'a', updatedAt: 2000 })]
      const input = makeDefaultInput({ localEntries: entries })

      const result = await manager.sync(input)

      expect(adapter.writeJson).toHaveBeenCalledOnce()
      const writtenData = adapter.writeJson.mock.calls[0]?.[1] as CloudData
      expect(writtenData.entries).toEqual(entries)
      expect(result.entries).toEqual(entries)
      expect(result.summary.direction).toBe('push')
      expect(result.summary.entriesSynced).toBe(1)
    })

    it('should upload images when pushing to empty cloud', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.uploadImage.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const blob = new Blob(['image'], { type: 'image/jpeg' })
      const thumbnail = new Blob(['thumb'], { type: 'image/jpeg' })

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const manifest = [makeManifest({ id: 'img-1' })]
      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'entry-1', imageIds: ['img-1'] })],
        localImageManifest: manifest,
        getImageBlobs: vi.fn().mockResolvedValue({ blob, thumbnail }),
      })

      const result = await manager.sync(input)

      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-1.jpg', blob)
      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-1_thumb.jpg', thumbnail)
      expect(result.summary.imagesUploaded).toBe(1)
    })
  })

  // ============================================
  // Push flow (local-only changes)
  // ============================================

  describe('push flow (local-only changes)', () => {
    it('should push when only local data changed', async () => {
      const adapter = createMockAdapter()
      const cloudData = makeCloudData({
        syncedAt: new Date(1000).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 1000 })],
      })
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const localEntries = [makeEntry({ id: 'a', updatedAt: 2000, content: 'updated' })]
      const input = makeDefaultInput({
        localEntries,
        lastSyncedAt: 1000,
      })

      const result = await manager.sync(input)

      expect(adapter.writeJson).toHaveBeenCalledOnce()
      expect(result.summary.direction).toBe('push')
      expect(result.entries).toEqual(localEntries)
    })
  })

  // ============================================
  // Pull flow (cloud-only changes)
  // ============================================

  describe('pull flow (cloud-only changes)', () => {
    it('should pull entries and images from cloud', async () => {
      const cloudEntries = [makeEntry({ id: 'b', updatedAt: 2000, content: 'from cloud' })]
      const cloudManifest = [makeManifest({ id: 'img-2', entryId: 'b' })]
      const cloudData = makeCloudData({
        syncedAt: new Date(2000).toISOString(),
        entries: cloudEntries,
        imageManifest: cloudManifest,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      const downloadedBlob = new Blob(['cloud-image'], { type: 'image/jpeg' })
      const downloadedThumb = new Blob(['cloud-thumb'], { type: 'image/jpeg' })
      adapter.downloadImage
        .mockResolvedValueOnce(downloadedBlob)
        .mockResolvedValueOnce(downloadedThumb)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 500 })],
        lastSyncedAt: 1000,
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('pull')
      expect(result.entries).toEqual(cloudEntries)
      expect(result.downloadedImages).toHaveLength(1)
      expect(result.downloadedImages[0]?.id).toBe('img-2')
      expect(result.downloadedImages[0]?.blob).toBe(downloadedBlob)
      expect(result.downloadedImages[0]?.thumbnail).toBe(downloadedThumb)
      expect(adapter.downloadImage).toHaveBeenCalledWith('images/img-2.jpg')
      expect(adapter.downloadImage).toHaveBeenCalledWith('images/img-2_thumb.jpg')
    })
  })

  // ============================================
  // No-change flow
  // ============================================

  describe('no-change flow', () => {
    it('should return immediately when nothing changed', async () => {
      const cloudData = makeCloudData({
        syncedAt: new Date(1000).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 800 })],
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 800 })],
        lastSyncedAt: 1000,
      })

      const result = await manager.sync(input)

      expect(adapter.writeJson).not.toHaveBeenCalled()
      expect(adapter.uploadImage).not.toHaveBeenCalled()
      expect(adapter.downloadImage).not.toHaveBeenCalled()
      expect(result.summary.entriesSynced).toBe(0)
      expect(result.summary.imagesUploaded).toBe(0)
      expect(result.summary.imagesDownloaded).toBe(0)
    })
  })

  // ============================================
  // Merge flow (both-changed)
  // ============================================

  describe('merge flow (both-changed)', () => {
    it('should merge when user chooses merge', async () => {
      const localEntries = [
        makeEntry({ id: 'a', updatedAt: 2000, content: 'local-edit' }),
        makeEntry({ id: 'b', updatedAt: 2000, content: 'local-new' }),
      ]
      const cloudEntries = [
        makeEntry({ id: 'a', updatedAt: 1500, content: 'cloud-old' }),
        makeEntry({ id: 'c', updatedAt: 1500, content: 'cloud-new' }),
      ]
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: cloudEntries,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onConflict: ConflictResolver = vi.fn().mockResolvedValue('merge')
      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries,
        lastSyncedAt: 1000,
        onConflict,
      })

      const result = await manager.sync(input)

      expect(onConflict).toHaveBeenCalledOnce()
      expect(result.summary.direction).toBe('merge')
      // Merged should have all 3 entries (a from local since newer, b from local, c from cloud)
      expect(result.entries).toHaveLength(3)
      const entryA = result.entries.find((e) => e.id === 'a')
      expect(entryA?.content).toBe('local-edit')
    })

    it('should push when user chooses push on conflict', async () => {
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 1500 })],
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const localEntries = [makeEntry({ id: 'a', updatedAt: 2000, content: 'local' })]
      const input = makeDefaultInput({
        localEntries,
        lastSyncedAt: 1000,
        onConflict: vi.fn().mockResolvedValue('push'),
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('push')
      expect(result.entries).toEqual(localEntries)
    })

    it('should pull when user chooses pull on conflict', async () => {
      const cloudEntries = [makeEntry({ id: 'a', updatedAt: 1500, content: 'cloud' })]
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: cloudEntries,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.downloadImage.mockResolvedValue(new Blob())

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 2000, content: 'local' })],
        lastSyncedAt: 1000,
        onConflict: vi.fn().mockResolvedValue('pull'),
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('pull')
      expect(result.entries).toEqual(cloudEntries)
    })

    it('should cancel when user chooses cancel on conflict', async () => {
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 1500 })],
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 2000 })],
        lastSyncedAt: 1000,
        onConflict: vi.fn().mockResolvedValue('cancel'),
      })

      try {
        await manager.sync(input)
        expect.unreachable('should have thrown')
      } catch (error) {
        const syncError = error as SyncError
        expect(syncError.kind).toBe('cancelled')
      }
    })

    it('should pass conflict info with change counts', async () => {
      // Local: modified 'a', added 'b'
      const localEntries = [
        makeEntry({ id: 'a', updatedAt: 2000, content: 'local-edit' }),
        makeEntry({ id: 'b', updatedAt: 2000 }),
      ]
      // Cloud: modified 'a', added 'c'
      const cloudEntries = [
        makeEntry({ id: 'a', updatedAt: 1500, content: 'cloud-edit' }),
        makeEntry({ id: 'c', updatedAt: 1500 }),
      ]
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: cloudEntries,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onConflict = vi.fn().mockResolvedValue('merge')
      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries,
        lastSyncedAt: 1000,
        onConflict,
      })

      await manager.sync(input)

      expect(onConflict).toHaveBeenCalledOnce()
      const conflictInfo = onConflict.mock.calls[0]?.[0]
      expect(conflictInfo).toBeDefined()
      // Local: a modified (updatedAt > lastSyncedAt), b added (not in cloud previous state)
      expect(conflictInfo.localChanges.modified).toBeGreaterThanOrEqual(1)
      // Cloud: a modified (updatedAt > lastSyncedAt), c added
      expect(conflictInfo.cloudChanges.modified).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // Merge flow with images
  // ============================================

  describe('merge flow with images', () => {
    it('should download cloud-only images and upload local-only images', async () => {
      const localManifest = [makeManifest({ id: 'img-local', entryId: 'a' })]
      const cloudManifest = [makeManifest({ id: 'img-cloud', entryId: 'b' })]
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: [makeEntry({ id: 'b', updatedAt: 1500 })],
        imageManifest: cloudManifest,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const cloudBlob = new Blob(['cloud-img'], { type: 'image/jpeg' })
      const cloudThumb = new Blob(['cloud-thumb'], { type: 'image/jpeg' })
      adapter.downloadImage.mockResolvedValueOnce(cloudBlob).mockResolvedValueOnce(cloudThumb)

      const localBlob = new Blob(['local-img'], { type: 'image/jpeg' })
      const localThumb = new Blob(['local-thumb'], { type: 'image/jpeg' })
      adapter.uploadImage.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 2000 })],
        localImageManifest: localManifest,
        lastSyncedAt: 1000,
        onConflict: vi.fn().mockResolvedValue('merge'),
        getImageBlobs: vi.fn().mockResolvedValue({ blob: localBlob, thumbnail: localThumb }),
      })

      const result = await manager.sync(input)

      // Downloaded cloud images
      expect(adapter.downloadImage).toHaveBeenCalledWith('images/img-cloud.jpg')
      expect(adapter.downloadImage).toHaveBeenCalledWith('images/img-cloud_thumb.jpg')
      expect(result.downloadedImages).toHaveLength(1)
      expect(result.downloadedImages[0]?.id).toBe('img-cloud')

      // Uploaded local images
      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-local.jpg', localBlob)
      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-local_thumb.jpg', localThumb)
      expect(result.summary.imagesUploaded).toBe(1)
      expect(result.summary.imagesDownloaded).toBe(1)
    })

    it('should throw data_corrupt when image is in download list but missing from cloud manifest', async () => {
      // Cloud manifest has img-cloud, but we'll make mergeImages return an ID
      // that doesn't exist in the manifest by having the cloud data with a
      // manifest that references a different image than what's in entries.
      // We achieve this by constructing cloud data where imageManifest is empty
      // but entries reference images — the mergeImages function filters by ID,
      // so we need toDownload to contain an ID not in imageManifest.
      //
      // Simplest approach: mock mergeImages to return an extra phantom ID.
      // But since mergeImages is imported directly, we'll instead construct
      // a scenario where the manifest find fails by mutating cloud data
      // after mergeImages runs. Since that's not possible with the current
      // architecture, we use vi.mock.

      const cloudManifest = [makeManifest({ id: 'img-real', entryId: 'b' })]
      const cloudData = makeCloudData({
        syncedAt: new Date(1500).toISOString(),
        entries: [makeEntry({ id: 'b', updatedAt: 1500 })],
        imageManifest: cloudManifest,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)
      adapter.downloadImage.mockResolvedValue(new Blob(['data'], { type: 'image/jpeg' }))

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      // Temporarily mock mergeImages to inject a phantom image ID
      const syncModule = await import('@/lib/sync/merge')
      const mergeImagesSpy = vi.spyOn(syncModule, 'mergeImages').mockReturnValue({
        toUpload: [],
        toDownload: ['img-phantom'], // This ID does NOT exist in cloudData.imageManifest
      })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', updatedAt: 2000 })],
        localImageManifest: [],
        lastSyncedAt: 1000,
        onConflict: vi.fn().mockResolvedValue('merge'),
      })

      try {
        await manager.sync(input)
        expect.unreachable('should have thrown')
      } catch (error) {
        const syncError = error as SyncError
        expect(syncError.kind).toBe('data_corrupt')
        expect(syncError.message).toContain('img-phantom')
        expect(syncError.message).toContain('not found in cloud manifest')
      } finally {
        mergeImagesSpy.mockRestore()
      }
    })
  })

  // ============================================
  // Push flow — skip existing cloud images
  // ============================================

  describe('push flow (skip existing cloud images)', () => {
    it('should only upload images not already on cloud when local-only changes', async () => {
      // Scenario: pull downloaded 2 images, then user adds entry (no new images), syncs again
      const cloudManifest = [
        makeManifest({ id: 'img-1', entryId: 'a' }),
        makeManifest({ id: 'img-2', entryId: 'a' }),
      ]
      const cloudData = makeCloudData({
        syncedAt: new Date(1000).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 1000, imageIds: ['img-1', 'img-2'] })],
        imageManifest: cloudManifest,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.uploadImage.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([
        'images/img-1.jpg',
        'images/img-1_thumb.jpg',
        'images/img-2.jpg',
        'images/img-2_thumb.jpg',
      ])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      // Local has the same 2 images (downloaded earlier) + a new entry without images
      const input = makeDefaultInput({
        localEntries: [
          makeEntry({ id: 'a', updatedAt: 1000, imageIds: ['img-1', 'img-2'] }),
          makeEntry({ id: 'b', updatedAt: 2000, content: 'new entry' }),
        ],
        localImageManifest: cloudManifest, // same images as cloud
        lastSyncedAt: 1000,
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('push')
      // Should NOT upload any images since they all already exist on cloud
      expect(adapter.uploadImage).not.toHaveBeenCalled()
      expect(result.summary.imagesUploaded).toBe(0)
    })

    it('should only upload new images when push has mix of existing and new', async () => {
      const cloudManifest = [makeManifest({ id: 'img-existing', entryId: 'a' })]
      const cloudData = makeCloudData({
        syncedAt: new Date(1000).toISOString(),
        entries: [makeEntry({ id: 'a', updatedAt: 1000, imageIds: ['img-existing'] })],
        imageManifest: cloudManifest,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.uploadImage.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([
        'images/img-existing.jpg',
        'images/img-existing_thumb.jpg',
        'images/img-new.jpg',
        'images/img-new_thumb.jpg',
      ])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const localBlob = new Blob(['new-img'], { type: 'image/jpeg' })
      const localThumb = new Blob(['new-thumb'], { type: 'image/jpeg' })

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [
          makeEntry({ id: 'a', updatedAt: 1000, imageIds: ['img-existing'] }),
          makeEntry({ id: 'b', updatedAt: 2000, imageIds: ['img-new'] }),
        ],
        localImageManifest: [
          makeManifest({ id: 'img-existing', entryId: 'a' }),
          makeManifest({ id: 'img-new', entryId: 'b' }),
        ],
        lastSyncedAt: 1000,
        getImageBlobs: vi.fn().mockResolvedValue({ blob: localBlob, thumbnail: localThumb }),
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('push')
      // Should only upload the new image, not the existing one
      expect(adapter.uploadImage).toHaveBeenCalledTimes(2) // blob + thumbnail
      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-new.jpg', localBlob)
      expect(adapter.uploadImage).toHaveBeenCalledWith('images/img-new_thumb.jpg', localThumb)
      expect(result.summary.imagesUploaded).toBe(1)
    })
  })

  // ============================================
  // Cancellation
  // ============================================

  describe('cancellation', () => {
    it('should throw cancelled error when signal is aborted before sync starts', async () => {
      const adapter = createMockAdapter()
      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const controller = new AbortController()
      controller.abort()

      const input = makeDefaultInput()

      try {
        await manager.sync(input, controller.signal)
        expect.unreachable('should have thrown')
      } catch (error) {
        const syncError = error as SyncError
        expect(syncError.kind).toBe('cancelled')
      }
    })

    it('should throw cancelled error when signal is aborted during sync', async () => {
      const adapter = createMockAdapter()
      const controller = new AbortController()

      // Abort during readJson
      adapter.readJson.mockImplementation(async () => {
        controller.abort()
        return null
      })

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a' })],
      })

      try {
        await manager.sync(input, controller.signal)
        expect.unreachable('should have thrown')
      } catch (error) {
        const syncError = error as SyncError
        expect(syncError.kind).toBe('cancelled')
      }
    })
  })

  // ============================================
  // Progress reporting
  // ============================================

  describe('progress reporting', () => {
    it('should call onProgress with increasing percent ending at 100', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const progressValues: number[] = []
      const onProgress = vi.fn().mockImplementation((p: SyncProgress) => {
        progressValues.push(p.percent)
      })

      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })
      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a' })],
      })

      await manager.sync(input)

      expect(onProgress).toHaveBeenCalled()
      // Last progress should be 100
      expect(progressValues[progressValues.length - 1]).toBe(100)
      // Percent should be non-decreasing
      for (let i = 1; i < progressValues.length; i++) {
        const current = progressValues[i] ?? 0
        const previous = progressValues[i - 1] ?? 0
        expect(current).toBeGreaterThanOrEqual(previous)
      }
    })

    it('should report phase names in progress', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const phases: string[] = []
      const onProgress = vi.fn().mockImplementation((p: SyncProgress) => {
        const phase = p.currentPhase.phase
        if (!phases.includes(phase)) {
          phases.push(phase)
        }
      })

      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })
      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a' })],
      })

      await manager.sync(input)

      expect(phases).toContain('preparing')
      expect(phases).toContain('checking')
      expect(phases).toContain('done')
    })
  })

  // ============================================
  // Cloud cleanup
  // ============================================

  describe('cloud cleanup', () => {
    it('should delete orphaned cloud images after push', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.uploadImage.mockResolvedValue(undefined)
      // Cloud has images that are not in local manifest
      adapter.listFiles.mockResolvedValue([
        'images/img-1.jpg',
        'images/img-1_thumb.jpg',
        'images/orphan.jpg',
        'images/orphan_thumb.jpg',
      ])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', imageIds: ['img-1'] })],
        localImageManifest: [makeManifest({ id: 'img-1' })],
      })

      await manager.sync(input)

      expect(adapter.deleteFiles).toHaveBeenCalledWith([
        'images/orphan.jpg',
        'images/orphan_thumb.jpg',
      ])
    })

    it('should not call deleteFiles when there are no orphans', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue(['images/img-1.jpg', 'images/img-1_thumb.jpg'])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a', imageIds: ['img-1'] })],
        localImageManifest: [makeManifest({ id: 'img-1' })],
      })

      await manager.sync(input)

      expect(adapter.deleteFiles).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Disconnect
  // ============================================

  describe('disconnect', () => {
    it('should delete all cloud files when deleteCloudData is true', async () => {
      const adapter = createMockAdapter()
      adapter.listFiles.mockResolvedValue([
        'mini-diary.json',
        'images/img-1.jpg',
        'images/img-1_thumb.jpg',
      ])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.disconnect(true)

      expect(adapter.listFiles).toHaveBeenCalled()
      expect(adapter.deleteFiles).toHaveBeenCalledWith([
        'mini-diary.json',
        'images/img-1.jpg',
        'images/img-1_thumb.jpg',
      ])
    })

    it('should not delete anything when deleteCloudData is false', async () => {
      const adapter = createMockAdapter()

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.disconnect(false)

      expect(adapter.listFiles).not.toHaveBeenCalled()
      expect(adapter.deleteFiles).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Corrupt cloud data
  // ============================================

  describe('corrupt cloud data', () => {
    it('should throw data_corrupt error when cloud data is invalid', async () => {
      const adapter = createMockAdapter()
      // readJson returns something, but validateCloudData will fail
      // We simulate this by having the adapter return invalid data
      // But CloudAdapter.readJson returns CloudData | null...
      // The validation happens on the raw data. Let's test via a version mismatch
      // Actually, readJson returns CloudData | null typed, but the actual data
      // might be corrupt. We need to test validation at the manager level.
      // Since readJson is typed CloudData | null, but actual network data might be bad,
      // the manager should validate it.
      adapter.readJson.mockResolvedValue({ version: 99, bad: true })

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({ lastSyncedAt: 1000 })

      try {
        await manager.sync(input)
        expect.unreachable('should have thrown')
      } catch (error) {
        const syncError = error as SyncError
        expect(syncError.kind).toBe('data_corrupt')
      }
    })
  })

  // ============================================
  // First sync with lastSyncedAt undefined
  // ============================================

  describe('first sync', () => {
    it('should treat undefined lastSyncedAt as first sync and push', async () => {
      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'a' })],
        lastSyncedAt: undefined,
      })

      const result = await manager.sync(input)

      expect(result.summary.direction).toBe('push')
    })

    it('should return no-change when lastSyncedAt is undefined but data is identical', async () => {
      const entries = [makeEntry({ id: 'a', updatedAt: 1000 })]
      const cloudData = makeCloudData({
        entries,
        imageManifest: [],
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)

      const onConflict = vi.fn()
      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: entries,
        lastSyncedAt: undefined,
        onConflict,
      })

      const result = await manager.sync(input)

      // Should NOT show conflict dialog
      expect(onConflict).not.toHaveBeenCalled()
      expect(result.summary.noChange).toBe(true)
    })

    it('should pull from cloud when cloud exists but lastSyncedAt is undefined', async () => {
      const cloudEntries = [makeEntry({ id: 'a', content: 'cloud' })]
      const cloudData = makeCloudData({
        entries: cloudEntries,
      })

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(cloudData)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onConflict = vi.fn().mockResolvedValue('merge')
      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const input = makeDefaultInput({
        localEntries: [makeEntry({ id: 'b' })],
        lastSyncedAt: undefined,
        onConflict,
      })

      const result = await manager.sync(input)

      // With no lastSyncedAt but both sides have data, should trigger merge
      expect(onConflict).toHaveBeenCalled()
      expect(result.summary.direction).toBe('merge')
    })
  })

  // ============================================
  // Retry behavior
  // ============================================

  describe('retry behavior', () => {
    it('should retry adapter.readJson on network error and succeed', async () => {
      const adapter = createMockAdapter()
      const error = { kind: 'network', message: 'timeout' }
      adapter.readJson.mockRejectedValueOnce(error).mockResolvedValueOnce(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const result = await manager.sync(
        makeDefaultInput({ localEntries: [makeEntry({ id: 'a' })] }),
      )

      expect(adapter.readJson).toHaveBeenCalledTimes(2)
      expect(result.summary.direction).toBe('push')
    })

    it('should retry image upload on network error', async () => {
      const adapter = createMockAdapter()
      const entries = [makeEntry({ id: 'a', imageIds: ['img-1'] })]
      const manifest: ImageManifest[] = [{ id: 'img-1', entryId: 'a', createdAt: 1000 }]

      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)
      adapter.uploadImage
        .mockRejectedValueOnce({ kind: 'network', message: 'fail' })
        .mockResolvedValue(undefined)

      const getImageBlobs = vi.fn(async () => ({
        blob: new Blob(['img']),
        thumbnail: new Blob(['thumb']),
      }))

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const result = await manager.sync(
        makeDefaultInput({
          localEntries: entries,
          localImageManifest: manifest,
          getImageBlobs,
        }),
      )

      expect(adapter.uploadImage.mock.calls.length).toBeGreaterThanOrEqual(3)
      expect(result.summary.imagesUploaded).toBe(1)
    })

    it('should track failed images after retry exhaustion', async () => {
      const adapter = createMockAdapter()
      const entries = [makeEntry({ id: 'a', imageIds: ['img-1', 'img-2'] })]
      const manifest: ImageManifest[] = [
        { id: 'img-1', entryId: 'a', createdAt: 1000 },
        { id: 'img-2', entryId: 'a', createdAt: 1000 },
      ]

      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)
      adapter.uploadImage.mockImplementation(async (path: string) => {
        if (path.includes('img-1')) {
          throw { kind: 'network', message: 'persistent failure' }
        }
      })

      const getImageBlobs = vi.fn(async () => ({
        blob: new Blob(['img']),
        thumbnail: new Blob(['thumb']),
      }))

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      const result = await manager.sync(
        makeDefaultInput({
          localEntries: entries,
          localImageManifest: manifest,
          getImageBlobs,
        }),
      )

      expect(result.failedImages).toContain('img-1')
      expect(result.summary.imagesFailed).toBe(1)
      expect(result.summary.imagesUploaded).toBe(1)
    })

    it('should not retry auth errors', async () => {
      const adapter = createMockAdapter()
      const error = { kind: 'auth', message: '401' }
      adapter.readJson.mockRejectedValue(error)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await expect(manager.sync(makeDefaultInput())).rejects.toMatchObject({ kind: 'auth' })

      expect(adapter.readJson).toHaveBeenCalledOnce()
    })

    it('should report retry progress', async () => {
      const adapter = createMockAdapter()
      adapter.readJson
        .mockRejectedValueOnce({ kind: 'network', message: 'fail' })
        .mockResolvedValueOnce(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.sync(makeDefaultInput({ localEntries: [makeEntry({ id: 'a' })] }))

      const retryPhases = onProgress.mock.calls.filter(
        (call) => (call[0] as SyncProgress).currentPhase.phase === 'retrying',
      )
      expect(retryPhases.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Backup lifecycle
  // ============================================

  describe('backup lifecycle', () => {
    it('should call createBackup before pull', async () => {
      const createBackup = vi.fn(async () => {})
      const deleteBackup = vi.fn(async () => {})

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(
        makeCloudData({
          syncedAt: new Date(2000).toISOString(),
          entries: [makeEntry({ id: 'b' })],
        }),
      )

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.sync(
        makeDefaultInput({
          lastSyncedAt: 1000,
          createBackup,
          deleteBackup,
        }),
      )

      expect(createBackup).toHaveBeenCalledOnce()
      expect(deleteBackup).toHaveBeenCalledOnce()
      const createOrder = createBackup.mock.invocationCallOrder[0] ?? 0
      const deleteOrder = deleteBackup.mock.invocationCallOrder[0] ?? 0
      expect(createOrder).toBeLessThan(deleteOrder)
    })

    it('should call createBackup before merge', async () => {
      const createBackup = vi.fn(async () => {})
      const deleteBackup = vi.fn(async () => {})

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(
        makeCloudData({
          syncedAt: new Date(2000).toISOString(),
          entries: [makeEntry({ id: 'b' })],
        }),
      )
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.sync(
        makeDefaultInput({
          localEntries: [makeEntry({ id: 'a', updatedAt: 2000 })],
          lastSyncedAt: 1000,
          onConflict: vi.fn(async () => 'merge' as const),
          createBackup,
          deleteBackup,
        }),
      )

      expect(createBackup).toHaveBeenCalledOnce()
      expect(deleteBackup).toHaveBeenCalledOnce()
    })

    it('should NOT call createBackup for push', async () => {
      const createBackup = vi.fn(async () => {})
      const deleteBackup = vi.fn(async () => {})

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(null)
      adapter.writeJson.mockResolvedValue(undefined)
      adapter.listFiles.mockResolvedValue([])
      adapter.deleteFiles.mockResolvedValue(undefined)

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await manager.sync(
        makeDefaultInput({
          localEntries: [makeEntry({ id: 'a' })],
          createBackup,
          deleteBackup,
        }),
      )

      expect(createBackup).not.toHaveBeenCalled()
    })

    it('should NOT call deleteBackup when sync fails', async () => {
      const createBackup = vi.fn(async () => {})
      const deleteBackup = vi.fn(async () => {})

      const adapter = createMockAdapter()
      adapter.readJson.mockResolvedValue(
        makeCloudData({
          syncedAt: new Date(2000).toISOString(),
          entries: [makeEntry({ id: 'b' })],
        }),
      )
      adapter.writeJson.mockRejectedValue({ kind: 'auth', message: '401' })
      adapter.downloadImage.mockResolvedValue(new Blob(['data']))

      const onProgress = vi.fn()
      const manager = new SyncManager(adapter, onProgress, { baseDelay: 0 })

      await expect(
        manager.sync(
          makeDefaultInput({
            localEntries: [makeEntry({ id: 'a', updatedAt: 2000 })],
            lastSyncedAt: 1000,
            onConflict: vi.fn(async () => 'merge' as const),
            createBackup,
            deleteBackup,
          }),
        ),
      ).rejects.toMatchObject({ kind: 'auth' })

      expect(createBackup).toHaveBeenCalledOnce()
      expect(deleteBackup).not.toHaveBeenCalled()
    })
  })
})
