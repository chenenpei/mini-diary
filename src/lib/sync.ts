import type {
  ChangeState,
  CloudData,
  DiaryEntry,
  ImageManifest,
  ImageMergeResult,
  ValidationResult,
} from '@/types'

/**
 * Merge local and cloud entries by keeping the newer version (by updatedAt)
 */
export function mergeEntries(local: DiaryEntry[], cloud: DiaryEntry[]): DiaryEntry[] {
  const merged = new Map<string, DiaryEntry>()

  for (const entry of cloud) {
    merged.set(entry.id, entry)
  }

  for (const entry of local) {
    const existing = merged.get(entry.id)
    if (!existing || entry.updatedAt > existing.updatedAt) {
      merged.set(entry.id, entry)
    }
  }

  return Array.from(merged.values())
}

/**
 * Determine which images need to be uploaded/downloaded
 */
export function mergeImages(
  localManifest: ImageManifest[],
  cloudManifest: ImageManifest[],
): ImageMergeResult {
  const localIds = new Set(localManifest.map((i) => i.id))
  const cloudIds = new Set(cloudManifest.map((i) => i.id))

  return {
    toUpload: localManifest.filter((i) => !cloudIds.has(i.id)).map((i) => i.id),
    toDownload: cloudManifest.filter((i) => !localIds.has(i.id)).map((i) => i.id),
  }
}

/**
 * Detect what changed since last sync
 */
export function detectChanges(
  localUpdatedAt: number,
  cloudSyncedAt: number,
  lastSyncedAt: number,
): ChangeState {
  const localChanged = localUpdatedAt > lastSyncedAt
  const cloudChanged = cloudSyncedAt > lastSyncedAt

  if (localChanged && cloudChanged) return 'both-changed'
  if (localChanged) return 'local-only'
  if (cloudChanged) return 'cloud-only'
  return 'no-change'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Validate cloud data structure and integrity
 */
export function validateCloudData(data: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(data)) {
    return { valid: false, errors: ['Data is not an object'], warnings: [] }
  }

  if (!('version' in data) || data.version !== 1) {
    errors.push(
      `Unsupported or missing version: ${String('version' in data ? data.version : 'missing')}`,
    )
  }

  if (typeof data.syncedAt !== 'string') {
    errors.push('Missing or invalid syncedAt')
  }

  if (!Array.isArray(data.entries)) {
    errors.push('Missing or invalid entries array')
  } else {
    const requiredEntryFields = ['id', 'content', 'date', 'createdAt', 'updatedAt', 'imageIds']
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i]
      if (isRecord(entry)) {
        const missing = requiredEntryFields.filter((field) => !(field in entry))
        if (missing.length > 0) {
          warnings.push(`Entry ${i}: missing fields: ${missing.join(', ')}`)
        }
      } else {
        warnings.push(`Entry ${i}: not an object`)
      }
    }
  }

  if (!Array.isArray(data.imageManifest)) {
    errors.push('Missing or invalid imageManifest array')
  } else {
    const requiredManifestFields = ['id', 'entryId', 'createdAt']
    for (let i = 0; i < data.imageManifest.length; i++) {
      const manifest = data.imageManifest[i]
      if (isRecord(manifest)) {
        const missing = requiredManifestFields.filter((field) => !(field in manifest))
        if (missing.length > 0) {
          warnings.push(`ImageManifest ${i}: missing fields: ${missing.join(', ')}`)
        }
      } else {
        warnings.push(`ImageManifest ${i}: not an object`)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings }
  }
  // Safe assertion: all runtime checks above have validated the structure
  return { valid: true, data: data as unknown as CloudData, warnings }
}
