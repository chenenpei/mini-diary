import type { DiaryEntry } from '@/types'

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
