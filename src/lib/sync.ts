import type { DiaryEntry, ImageManifest, ImageMergeResult } from '@/types'

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
