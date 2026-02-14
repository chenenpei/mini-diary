import type { CloudAdapter } from '@/lib/cloud/types'
import {
  areEntriesIdentical,
  detectChanges,
  mergeEntries,
  mergeImages,
  validateCloudData,
} from '@/lib/sync/merge'
import { calculateProgress, getOperationPhases } from '@/lib/sync/progress'
import { type RetryOptions, withRetry } from '@/lib/sync/retry'
import type {
  CloudData,
  ConflictInfo,
  DiaryEntry,
  ImageManifest,
  SyncError,
  SyncInput,
  SyncOperation,
  SyncPhase,
  SyncProgress,
  SyncResult,
  SyncSummary,
} from '@/types'

const CLOUD_JSON_PATH = 'mini-diary.json'
const IMAGES_FOLDER = 'images'

function imagePath(imageId: string): string {
  return `${IMAGES_FOLDER}/${imageId}.jpg`
}

function thumbnailPath(imageId: string): string {
  return `${IMAGES_FOLDER}/${imageId}_thumb.jpg`
}

function throwCancelled(): never {
  throw { kind: 'cancelled', message: 'Sync cancelled' } satisfies SyncError
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throwCancelled()
  }
}

function getMaxUpdatedAt(entries: DiaryEntry[]): number {
  let max = 0
  for (const entry of entries) {
    if (entry.updatedAt > max) {
      max = entry.updatedAt
    }
  }
  return max
}

/**
 * Compute conflict info by comparing local and cloud entries against lastSyncedAt.
 * Entries with updatedAt > lastSyncedAt are considered changed.
 * An entry that exists on one side but not the other is "added".
 * An entry that exists on both sides and was updated is "modified".
 * An entry with deletedAt is "deleted".
 */
function computeConflictInfo(
  localEntries: DiaryEntry[],
  cloudEntries: DiaryEntry[],
  lastSyncedAt: number,
): ConflictInfo {
  const cloudIds = new Set(cloudEntries.map((e) => e.id))
  const localIds = new Set(localEntries.map((e) => e.id))

  const localChanges = { added: 0, modified: 0, deleted: 0 }
  for (const entry of localEntries) {
    if (entry.updatedAt <= lastSyncedAt) continue
    if (entry.deletedAt !== undefined && entry.deletedAt > lastSyncedAt) {
      localChanges.deleted++
    } else if (!cloudIds.has(entry.id)) {
      localChanges.added++
    } else {
      localChanges.modified++
    }
  }

  const cloudChanges = { added: 0, modified: 0, deleted: 0 }
  for (const entry of cloudEntries) {
    if (entry.updatedAt <= lastSyncedAt) continue
    if (entry.deletedAt !== undefined && entry.deletedAt > lastSyncedAt) {
      cloudChanges.deleted++
    } else if (!localIds.has(entry.id)) {
      cloudChanges.added++
    } else {
      cloudChanges.modified++
    }
  }

  return { localChanges, cloudChanges }
}

export class SyncManager {
  private retryConfig: RetryOptions

  constructor(
    private adapter: CloudAdapter,
    private onProgress: (progress: SyncProgress) => void,
    retryConfig?: RetryOptions,
  ) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 3,
      ...retryConfig,
    }
  }

  async sync(input: SyncInput, signal?: AbortSignal): Promise<SyncResult> {
    const startTime = Date.now()

    // Phase: preparing
    checkAborted(signal)
    this.reportPhase('push', 0, { phase: 'preparing', message: 'Preparing sync...' })

    // Phase: checking
    checkAborted(signal)
    this.reportPhase('push', 1, { phase: 'checking', message: 'Reading cloud data...' })
    const cloudData = await this.retryableCall(
      () => this.adapter.readJson(CLOUD_JSON_PATH),
      'checking',
      signal,
    )
    checkAborted(signal)

    // Determine operation
    if (cloudData === null) {
      // First sync or cloud empty — push everything
      return this.executePush(input, startTime, signal)
    }

    // Validate cloud data
    const validation = validateCloudData(cloudData)
    if (!validation.valid) {
      throw {
        kind: 'data_corrupt',
        message: `Invalid cloud data: ${validation.errors.join(', ')}`,
      } satisfies SyncError
    }

    const validCloudData = validation.data

    // Determine what changed
    if (input.lastSyncedAt === undefined) {
      // First sync with existing cloud data — both sides potentially have data
      // Treat as both-changed if local has entries
      if (input.localEntries.length === 0) {
        return this.executePull(validCloudData, input, startTime, signal)
      }
      // Check if data is actually identical (e.g. disconnect/reconnect scenario)
      if (areEntriesIdentical(input.localEntries, validCloudData.entries)) {
        return this.buildNoChangeResult(input, startTime)
      }
      // Both sides have data, need conflict resolution
      const conflictInfo = computeConflictInfo(
        input.localEntries,
        validCloudData.entries,
        0, // lastSyncedAt=0 means everything is "changed"
      )
      const resolution = await input.onConflict(conflictInfo)
      checkAborted(signal)
      return this.executeResolution(resolution, validCloudData, input, startTime, signal)
    }

    const localUpdatedAt = getMaxUpdatedAt(input.localEntries)
    const cloudSyncedAt = new Date(validCloudData.syncedAt).getTime()
    const changeState = detectChanges(localUpdatedAt, cloudSyncedAt, input.lastSyncedAt)

    switch (changeState) {
      case 'no-change':
        // If local is empty but cloud has entries, pull (e.g. after "clear all data")
        if (input.localEntries.length === 0 && validCloudData.entries.length > 0) {
          return this.executePull(validCloudData, input, startTime, signal)
        }
        return this.buildNoChangeResult(input, startTime)
      case 'local-only':
        return this.executePush(input, startTime, signal, validCloudData.imageManifest)
      case 'cloud-only':
        return this.executePull(validCloudData, input, startTime, signal)
      case 'both-changed': {
        const conflictInfo = computeConflictInfo(
          input.localEntries,
          validCloudData.entries,
          input.lastSyncedAt,
        )
        const resolution = await input.onConflict(conflictInfo)
        checkAborted(signal)
        return this.executeResolution(resolution, validCloudData, input, startTime, signal)
      }
    }
  }

  async disconnect(deleteCloudData: boolean): Promise<void> {
    if (!deleteCloudData) return

    const files = await this.adapter.listFiles('')
    if (files.length > 0) {
      await this.adapter.deleteFiles(files)
    }
  }

  // ============================================
  // Operation executors
  // ============================================

  private async executeResolution(
    resolution: 'merge' | 'push' | 'pull' | 'cancel',
    cloudData: CloudData,
    input: SyncInput,
    startTime: number,
    signal?: AbortSignal,
  ): Promise<SyncResult> {
    switch (resolution) {
      case 'merge':
        return this.executeMerge(cloudData, input, startTime, signal)
      case 'push':
        return this.executePush(input, startTime, signal, cloudData.imageManifest)
      case 'pull':
        return this.executePull(cloudData, input, startTime, signal)
      case 'cancel':
        throwCancelled()
    }
  }

  private async executePush(
    input: SyncInput,
    startTime: number,
    signal?: AbortSignal,
    cloudImageManifest?: ImageManifest[],
  ): Promise<SyncResult> {
    const operation: SyncOperation = 'push'
    const phases = getOperationPhases(operation)

    // Phase: uploading-entries
    checkAborted(signal)
    const uploadEntriesIdx = phases.indexOf('uploading-entries')
    this.reportPhase(operation, uploadEntriesIdx, {
      phase: 'uploading-entries',
      message: 'Uploading entries...',
    })

    const now = new Date().toISOString()
    const cloudData: CloudData = {
      version: 1,
      syncedAt: now,
      entries: input.localEntries,
      imageManifest: input.localImageManifest,
    }
    await this.retryableCall(
      () => this.adapter.writeJson(CLOUD_JSON_PATH, cloudData),
      'uploading-entries',
      signal,
    )
    checkAborted(signal)

    // Phase: uploading-images — only upload images not already on cloud
    const uploadImagesIdx = phases.indexOf('uploading-images')
    let imagesUploaded = 0
    const failedImages: string[] = []
    const imagesToUpload = mergeImages(input.localImageManifest, cloudImageManifest ?? []).toUpload

    for (const [i, imageId] of imagesToUpload.entries()) {
      checkAborted(signal)
      this.reportPhaseWithProgress(
        operation,
        uploadImagesIdx,
        {
          phase: 'uploading-images',
          current: i + 1,
          total: imagesToUpload.length,
        },
        imagesToUpload.length > 0 ? i / imagesToUpload.length : 0,
      )

      try {
        const { blob, thumbnail } = await input.getImageBlobs(imageId)
        await this.retryableCall(
          () => this.adapter.uploadImage(imagePath(imageId), blob),
          'uploading-images',
          signal,
        )
        await this.retryableCall(
          () => this.adapter.uploadImage(thumbnailPath(imageId), thumbnail),
          'uploading-images',
          signal,
        )
        imagesUploaded++
      } catch {
        failedImages.push(imageId)
      }
    }

    // Report uploading-images complete
    if (imagesToUpload.length > 0) {
      this.reportPhaseWithProgress(
        operation,
        uploadImagesIdx,
        {
          phase: 'uploading-images',
          current: imagesToUpload.length,
          total: imagesToUpload.length,
        },
        1,
      )
    } else {
      this.reportPhase(operation, uploadImagesIdx, {
        phase: 'uploading-images',
        current: 0,
        total: 0,
      })
    }

    checkAborted(signal)

    // Phase: cleanup
    const cleanupIdx = phases.indexOf('cleanup')
    this.reportPhase(operation, cleanupIdx, {
      phase: 'cleanup',
      message: 'Cleaning up orphaned images...',
    })
    await this.cleanupOrphanedImages(input.localImageManifest, signal)
    checkAborted(signal)

    const summary: SyncSummary = {
      direction: 'push',
      entriesSynced: input.localEntries.length,
      imagesUploaded,
      imagesDownloaded: 0,
      imagesFailed: failedImages.length,
      duration: Date.now() - startTime,
    }

    // Phase: done
    this.reportPhase(operation, phases.length, { phase: 'done', summary })

    return {
      entries: input.localEntries,
      downloadedImages: [],
      failedImages,
      lastSyncedAt: Date.now(),
      summary,
    }
  }

  private async executePull(
    cloudData: CloudData,
    input: SyncInput,
    startTime: number,
    signal?: AbortSignal,
  ): Promise<SyncResult> {
    const operation: SyncOperation = 'pull'
    const phases = getOperationPhases(operation)

    // Phase: downloading-entries
    checkAborted(signal)
    const downloadEntriesIdx = phases.indexOf('downloading-entries')
    this.reportPhase(operation, downloadEntriesIdx, {
      phase: 'downloading-entries',
      message: 'Downloading entries...',
    })

    // Create backup before any destructive operations
    await input.createBackup?.()

    // Phase: downloading-images
    const downloadImagesIdx = phases.indexOf('downloading-images')
    const imagesToDownload = cloudData.imageManifest.filter(
      (cm) => !input.localImageManifest.some((lm) => lm.id === cm.id),
    )
    const downloadedImages: SyncResult['downloadedImages'] = []
    const failedImages: string[] = []

    for (const [i, manifest] of imagesToDownload.entries()) {
      checkAborted(signal)
      this.reportPhaseWithProgress(
        operation,
        downloadImagesIdx,
        {
          phase: 'downloading-images',
          current: i + 1,
          total: imagesToDownload.length,
        },
        imagesToDownload.length > 0 ? i / imagesToDownload.length : 0,
      )

      try {
        const blob = await this.retryableCall(
          () => this.adapter.downloadImage(imagePath(manifest.id)),
          'downloading-images',
          signal,
        )
        const thumbnail = await this.retryableCall(
          () => this.adapter.downloadImage(thumbnailPath(manifest.id)),
          'downloading-images',
          signal,
        )
        downloadedImages.push({
          id: manifest.id,
          entryId: manifest.entryId,
          blob,
          thumbnail,
        })
      } catch {
        failedImages.push(manifest.id)
      }
    }

    if (imagesToDownload.length > 0) {
      this.reportPhaseWithProgress(
        operation,
        downloadImagesIdx,
        {
          phase: 'downloading-images',
          current: imagesToDownload.length,
          total: imagesToDownload.length,
        },
        1,
      )
    } else {
      this.reportPhase(operation, downloadImagesIdx, {
        phase: 'downloading-images',
        current: 0,
        total: 0,
      })
    }

    checkAborted(signal)

    // Phase: verifying
    const verifyIdx = phases.indexOf('verifying')
    this.reportPhase(operation, verifyIdx, {
      phase: 'verifying',
      message: 'Verifying data integrity...',
    })

    const summary: SyncSummary = {
      direction: 'pull',
      entriesSynced: cloudData.entries.length,
      imagesUploaded: 0,
      imagesDownloaded: downloadedImages.length,
      imagesFailed: failedImages.length,
      duration: Date.now() - startTime,
    }

    // Delete backup after successful completion
    await input.deleteBackup?.()

    // Phase: done
    this.reportPhase(operation, phases.length, { phase: 'done', summary })

    return {
      entries: cloudData.entries,
      downloadedImages,
      failedImages,
      lastSyncedAt: Date.now(),
      summary,
    }
  }

  private async executeMerge(
    cloudData: CloudData,
    input: SyncInput,
    startTime: number,
    signal?: AbortSignal,
  ): Promise<SyncResult> {
    const operation: SyncOperation = 'merge'
    const phases = getOperationPhases(operation)

    // Phase: downloading-entries
    checkAborted(signal)
    const downloadEntriesIdx = phases.indexOf('downloading-entries')
    this.reportPhase(operation, downloadEntriesIdx, {
      phase: 'downloading-entries',
      message: 'Downloading cloud entries...',
    })

    // Create backup before any destructive operations
    await input.createBackup?.()

    // Phase: downloading-images
    const downloadImagesIdx = phases.indexOf('downloading-images')
    const imageMerge = mergeImages(input.localImageManifest, cloudData.imageManifest)
    const downloadedImages: SyncResult['downloadedImages'] = []
    const failedImages: string[] = []

    for (const [i, imageId] of imageMerge.toDownload.entries()) {
      checkAborted(signal)
      const cloudManifestEntry = cloudData.imageManifest.find((m) => m.id === imageId)
      this.reportPhaseWithProgress(
        operation,
        downloadImagesIdx,
        {
          phase: 'downloading-images',
          current: i + 1,
          total: imageMerge.toDownload.length,
        },
        imageMerge.toDownload.length > 0 ? i / imageMerge.toDownload.length : 0,
      )

      if (!cloudManifestEntry) {
        throw {
          kind: 'data_corrupt',
          message: `Image ${imageId} in download list but not found in cloud manifest`,
        } satisfies SyncError
      }

      try {
        const blob = await this.retryableCall(
          () => this.adapter.downloadImage(imagePath(imageId)),
          'downloading-images',
          signal,
        )
        const thumbnail = await this.retryableCall(
          () => this.adapter.downloadImage(thumbnailPath(imageId)),
          'downloading-images',
          signal,
        )
        downloadedImages.push({
          id: imageId,
          entryId: cloudManifestEntry.entryId,
          blob,
          thumbnail,
        })
      } catch {
        failedImages.push(imageId)
      }
    }

    if (imageMerge.toDownload.length > 0) {
      this.reportPhaseWithProgress(
        operation,
        downloadImagesIdx,
        {
          phase: 'downloading-images',
          current: imageMerge.toDownload.length,
          total: imageMerge.toDownload.length,
        },
        1,
      )
    } else {
      this.reportPhase(operation, downloadImagesIdx, {
        phase: 'downloading-images',
        current: 0,
        total: 0,
      })
    }

    checkAborted(signal)

    // Phase: merging
    const mergingIdx = phases.indexOf('merging')
    this.reportPhase(operation, mergingIdx, {
      phase: 'merging',
      message: 'Merging entries...',
    })

    const mergedEntries = mergeEntries(input.localEntries, cloudData.entries)

    // Build merged manifest: local + downloaded
    const mergedManifest = [
      ...input.localImageManifest,
      ...cloudData.imageManifest.filter((cm) => imageMerge.toDownload.includes(cm.id)),
    ]

    checkAborted(signal)

    // Phase: uploading-entries
    const uploadEntriesIdx = phases.indexOf('uploading-entries')
    this.reportPhase(operation, uploadEntriesIdx, {
      phase: 'uploading-entries',
      message: 'Uploading merged entries...',
    })

    const now = new Date().toISOString()
    const mergedCloudData: CloudData = {
      version: 1,
      syncedAt: now,
      entries: mergedEntries,
      imageManifest: mergedManifest,
    }
    await this.retryableCall(
      () => this.adapter.writeJson(CLOUD_JSON_PATH, mergedCloudData),
      'uploading-entries',
      signal,
    )
    checkAborted(signal)

    // Phase: uploading-images
    const uploadImagesIdx = phases.indexOf('uploading-images')
    let imagesUploaded = 0

    for (const [i, imageId] of imageMerge.toUpload.entries()) {
      checkAborted(signal)
      this.reportPhaseWithProgress(
        operation,
        uploadImagesIdx,
        {
          phase: 'uploading-images',
          current: i + 1,
          total: imageMerge.toUpload.length,
        },
        imageMerge.toUpload.length > 0 ? i / imageMerge.toUpload.length : 0,
      )

      try {
        const { blob, thumbnail } = await input.getImageBlobs(imageId)
        await this.retryableCall(
          () => this.adapter.uploadImage(imagePath(imageId), blob),
          'uploading-images',
          signal,
        )
        await this.retryableCall(
          () => this.adapter.uploadImage(thumbnailPath(imageId), thumbnail),
          'uploading-images',
          signal,
        )
        imagesUploaded++
      } catch {
        failedImages.push(imageId)
      }
    }

    if (imageMerge.toUpload.length > 0) {
      this.reportPhaseWithProgress(
        operation,
        uploadImagesIdx,
        {
          phase: 'uploading-images',
          current: imageMerge.toUpload.length,
          total: imageMerge.toUpload.length,
        },
        1,
      )
    } else {
      this.reportPhase(operation, uploadImagesIdx, {
        phase: 'uploading-images',
        current: 0,
        total: 0,
      })
    }

    checkAborted(signal)

    // Phase: cleanup
    const cleanupIdx = phases.indexOf('cleanup')
    this.reportPhase(operation, cleanupIdx, {
      phase: 'cleanup',
      message: 'Cleaning up orphaned images...',
    })
    await this.cleanupOrphanedImages(mergedManifest, signal)
    checkAborted(signal)

    const summary: SyncSummary = {
      direction: 'merge',
      entriesSynced: mergedEntries.length,
      imagesUploaded,
      imagesDownloaded: downloadedImages.length,
      imagesFailed: failedImages.length,
      duration: Date.now() - startTime,
    }

    // Delete backup after successful completion
    await input.deleteBackup?.()

    // Phase: done
    this.reportPhase(operation, phases.length, { phase: 'done', summary })

    return {
      entries: mergedEntries,
      downloadedImages,
      failedImages,
      lastSyncedAt: Date.now(),
      summary,
    }
  }

  // ============================================
  // Retry helper
  // ============================================

  private async retryableCall<T>(
    fn: () => Promise<T>,
    phaseName: string,
    signal?: AbortSignal,
  ): Promise<T> {
    return withRetry(fn, {
      ...this.retryConfig,
      ...(signal ? { signal } : {}),
      onRetry: (attempt, delay, _error) => {
        this.onProgress({
          currentPhase: {
            phase: 'retrying',
            failedPhase: phaseName,
            attempt,
            maxAttempts: this.retryConfig.maxAttempts ?? 3,
            nextRetryIn: delay,
          },
          completedPhases: 0,
          totalPhases: 0,
          percent: 0,
        })
      },
    })
  }

  // ============================================
  // Helpers
  // ============================================

  private buildNoChangeResult(input: SyncInput, startTime: number): SyncResult {
    const summary: SyncSummary = {
      direction: 'push',
      entriesSynced: 0,
      imagesUploaded: 0,
      imagesDownloaded: 0,
      imagesFailed: 0,
      duration: Date.now() - startTime,
      noChange: true,
    }

    // Report done immediately
    this.reportPhase('push', getOperationPhases('push').length, { phase: 'done', summary })

    return {
      entries: input.localEntries,
      downloadedImages: [],
      failedImages: [],
      lastSyncedAt: input.lastSyncedAt ?? Date.now(),
      summary,
    }
  }

  private async cleanupOrphanedImages(
    validManifest: ImageManifest[],
    signal?: AbortSignal,
  ): Promise<void> {
    const cloudFiles = await this.retryableCall(
      () => this.adapter.listFiles(IMAGES_FOLDER),
      'cleanup',
      signal,
    )
    const validPaths = new Set<string>()
    for (const m of validManifest) {
      validPaths.add(imagePath(m.id))
      validPaths.add(thumbnailPath(m.id))
    }

    const orphanedFiles = cloudFiles.filter((f) => !validPaths.has(f))
    if (orphanedFiles.length > 0) {
      await this.retryableCall(() => this.adapter.deleteFiles(orphanedFiles), 'cleanup', signal)
    }
  }

  private reportPhase(
    operation: SyncOperation,
    completedPhaseCount: number,
    currentPhase: SyncPhase,
  ): void {
    const phases = getOperationPhases(operation)
    const percent = calculateProgress(operation, completedPhaseCount, 0)
    this.onProgress({
      currentPhase,
      completedPhases: completedPhaseCount,
      totalPhases: phases.length,
      percent,
    })
  }

  private reportPhaseWithProgress(
    operation: SyncOperation,
    phaseIndex: number,
    currentPhase: SyncPhase,
    phaseProgress: number,
  ): void {
    const phases = getOperationPhases(operation)
    const percent = calculateProgress(operation, phaseIndex, phaseProgress)
    this.onProgress({
      currentPhase,
      completedPhases: phaseIndex,
      totalPhases: phases.length,
      percent,
    })
  }
}
