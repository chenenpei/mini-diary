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

/**
 * Check if local and cloud entries are identical (same IDs with same updatedAt).
 * Used to skip conflict dialog when data hasn't actually changed (e.g. disconnect/reconnect).
 */
export function areEntriesIdentical(local: DiaryEntry[], cloud: DiaryEntry[]): boolean {
  if (local.length !== cloud.length) return false
  const cloudMap = new Map(cloud.map((e) => [e.id, e.updatedAt]))
  return local.every((e) => cloudMap.get(e.id) === e.updatedAt)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function checkFieldType(
  record: Record<string, unknown>,
  field: string,
  expectedType: string,
  label: string,
  warnings: string[],
): void {
  if (!(field in record)) {
    warnings.push(`${label}: missing field '${field}'`)
    return
  }
  const value = record[field]
  if (expectedType === 'array<string>') {
    if (!Array.isArray(value)) {
      warnings.push(`${label}: field '${field}' should be array, got ${typeof value}`)
    } else {
      for (let j = 0; j < value.length; j++) {
        if (typeof value[j] !== 'string') {
          warnings.push(`${label}: field '${field}[${j}]' should be string, got ${typeof value[j]}`)
        }
      }
    }
  } else if (typeof value !== expectedType) {
    warnings.push(`${label}: field '${field}' should be ${expectedType}, got ${typeof value}`)
  }
}

function validateEntryFields(
  entry: Record<string, unknown>,
  index: number,
  warnings: string[],
): void {
  const label = `Entry ${index}`
  checkFieldType(entry, 'id', 'string', label, warnings)
  checkFieldType(entry, 'content', 'string', label, warnings)
  checkFieldType(entry, 'date', 'string', label, warnings)
  checkFieldType(entry, 'createdAt', 'number', label, warnings)
  checkFieldType(entry, 'updatedAt', 'number', label, warnings)
  checkFieldType(entry, 'imageIds', 'array<string>', label, warnings)

  // Optional fields: only validate type if present
  if ('deletedAt' in entry && typeof entry.deletedAt !== 'number') {
    warnings.push(`${label}: field 'deletedAt' should be number, got ${typeof entry.deletedAt}`)
  }
  if ('modifiedFields' in entry) {
    if (!Array.isArray(entry.modifiedFields)) {
      warnings.push(
        `${label}: field 'modifiedFields' should be array, got ${typeof entry.modifiedFields}`,
      )
    } else {
      for (let j = 0; j < entry.modifiedFields.length; j++) {
        if (typeof entry.modifiedFields[j] !== 'string') {
          warnings.push(
            `${label}: field 'modifiedFields[${j}]' should be string, got ${typeof entry.modifiedFields[j]}`,
          )
        }
      }
    }
  }
}

function validateManifestFields(
  manifest: Record<string, unknown>,
  index: number,
  warnings: string[],
): void {
  const label = `ImageManifest ${index}`
  checkFieldType(manifest, 'id', 'string', label, warnings)
  checkFieldType(manifest, 'entryId', 'string', label, warnings)
  checkFieldType(manifest, 'createdAt', 'number', label, warnings)
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
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i]
      if (isRecord(entry)) {
        validateEntryFields(entry, i, warnings)
      } else {
        warnings.push(`Entry ${i}: not an object`)
      }
    }
  }

  if (!Array.isArray(data.imageManifest)) {
    errors.push('Missing or invalid imageManifest array')
  } else {
    for (let i = 0; i < data.imageManifest.length; i++) {
      const manifest = data.imageManifest[i]
      if (isRecord(manifest)) {
        validateManifestFields(manifest, i, warnings)
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
