import { db } from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { CreateEntryInput, DateRangeQuery, DiaryEntry, UpdateEntryInput } from '@/types'

const MAX_CONTENT_LENGTH = 10000
const MAX_IMAGE_IDS = 3

/** Filter out soft-deleted entries */
const isNotDeleted = (entry: DiaryEntry): boolean => !entry.deletedAt

/**
 * Validate entry content
 */
function validateContent(content: string): void {
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`)
  }
}

/**
 * Validate image IDs array
 */
function validateImageIds(imageIds: string[]): void {
  if (imageIds.length > MAX_IMAGE_IDS) {
    throw new Error(`Cannot attach more than ${MAX_IMAGE_IDS} images`)
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function validateDate(date: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }
}

/**
 * Entries Repository
 * Handles all diary entry CRUD operations
 */
export const entriesRepository = {
  /**
   * Get a single entry by ID
   */
  async getById(id: string): Promise<DiaryEntry | undefined> {
    const entry = await db.entries.get(id)
    if (entry?.deletedAt) return undefined
    return entry
  },

  /**
   * Get all entries for a specific date
   * @param order - 'asc' for oldest first, 'desc' for newest first (default)
   */
  async getByDate(date: string, order: 'asc' | 'desc' = 'desc'): Promise<DiaryEntry[]> {
    const collection = db.entries.where('date').equals(date).filter(isNotDeleted)
    if (order === 'desc') {
      return collection.reverse().sortBy('createdAt')
    }
    return collection.sortBy('createdAt')
  },

  /**
   * Get entries within a date range
   */
  async getByDateRange(query: DateRangeQuery): Promise<DiaryEntry[]> {
    return db.entries
      .where('date')
      .between(query.startDate, query.endDate, true, true)
      .filter(isNotDeleted)
      .sortBy('date')
  },

  /**
   * Get all entries, sorted by date descending
   */
  async getAll(): Promise<DiaryEntry[]> {
    return db.entries.orderBy('date').reverse().filter(isNotDeleted).toArray()
  },

  /**
   * Get entries with pagination
   */
  async getPaginated(limit: number, offset = 0): Promise<DiaryEntry[]> {
    return db.entries
      .orderBy('date')
      .reverse()
      .filter(isNotDeleted)
      .offset(offset)
      .limit(limit)
      .toArray()
  },

  /**
   * Get total count of entries
   */
  async count(): Promise<number> {
    return db.entries.filter(isNotDeleted).count()
  },

  /**
   * Get distinct dates that have entries
   */
  async getDistinctDates(): Promise<string[]> {
    const entries = await db.entries.orderBy('date').filter(isNotDeleted).toArray()
    return [...new Set(entries.map((e) => e.date))]
  },

  /**
   * Create a new entry
   */
  async create(input: CreateEntryInput): Promise<DiaryEntry> {
    validateContent(input.content)
    validateDate(input.date)

    const imageIds = input.imageIds ?? []
    validateImageIds(imageIds)

    const now = Date.now()
    const entry: DiaryEntry = {
      id: generateId(),
      content: input.content,
      date: input.date,
      createdAt: now,
      updatedAt: now,
      imageIds,
    }

    await db.entries.add(entry)
    return entry
  },

  /**
   * Update an existing entry
   */
  async update(input: UpdateEntryInput): Promise<DiaryEntry> {
    const existing = await db.entries.get(input.id)
    if (!existing) {
      throw new Error(`Entry with id ${input.id} not found`)
    }

    if (input.content !== undefined) {
      validateContent(input.content)
    }

    if (input.date !== undefined) {
      validateDate(input.date)
    }

    if (input.imageIds !== undefined) {
      validateImageIds(input.imageIds)
    }

    const updated: DiaryEntry = {
      ...existing,
      ...(input.content !== undefined && { content: input.content }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.imageIds !== undefined && { imageIds: input.imageIds }),
      updatedAt: Date.now(),
    }

    await db.entries.put(updated)
    return updated
  },

  /**
   * Soft delete an entry by ID
   */
  async delete(id: string): Promise<void> {
    const now = Date.now()
    await db.entries.update(id, { deletedAt: now, updatedAt: now })
  },

  /**
   * Permanently delete an entry (for tombstone cleanup)
   */
  async hardDelete(id: string): Promise<void> {
    await db.entries.delete(id)
  },

  /**
   * Delete all entries (for testing or reset)
   */
  async deleteAll(): Promise<void> {
    await db.entries.clear()
  },

  /**
   * Search entries by content (simple text search)
   */
  async search(query: string): Promise<DiaryEntry[]> {
    const lowerQuery = query.toLowerCase()
    return db.entries
      .filter((entry) => isNotDeleted(entry) && entry.content.toLowerCase().includes(lowerQuery))
      .toArray()
  },

  /**
   * Get all entries including soft-deleted (for sync)
   */
  async getAllIncludeDeleted(): Promise<DiaryEntry[]> {
    return db.entries.toArray()
  },

  /**
   * Get only soft-deleted entries (for sync)
   */
  async getDeleted(): Promise<DiaryEntry[]> {
    return db.entries.filter((e) => e.deletedAt !== undefined).toArray()
  },

  /**
   * Clean up tombstones older than the specified duration and their associated images
   * @param olderThan Duration in milliseconds (e.g., 30 * 24 * 60 * 60 * 1000 for 30 days)
   * @returns Number of cleaned up entries
   */
  async cleanupTombstones(olderThan: number): Promise<number> {
    const threshold = Date.now() - olderThan
    const tombstones = await db.entries
      .filter((e) => e.deletedAt !== undefined && e.deletedAt < threshold)
      .toArray()

    if (tombstones.length === 0) return 0

    const imageIds = tombstones.flatMap((e) => e.imageIds)
    const entryIds = tombstones.map((e) => e.id)

    await db.transaction('rw', [db.entries, db.images], async () => {
      await db.entries.bulkDelete(entryIds)
      if (imageIds.length > 0) {
        await db.images.where('id').anyOf(imageIds).delete()
      }
    })

    return tombstones.length
  },
}
