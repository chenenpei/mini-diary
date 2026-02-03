import { db } from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { CreateEntryInput, DateRangeQuery, DiaryEntry, UpdateEntryInput } from '@/types'

const MAX_CONTENT_LENGTH = 10000
const MAX_IMAGE_IDS = 3

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
    return db.entries.get(id)
  },

  /**
   * Get all entries for a specific date
   * @param order - 'asc' for oldest first, 'desc' for newest first (default)
   */
  async getByDate(date: string, order: 'asc' | 'desc' = 'desc'): Promise<DiaryEntry[]> {
    const collection = db.entries.where('date').equals(date)
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
      .sortBy('date')
  },

  /**
   * Get all entries, sorted by date descending
   */
  async getAll(): Promise<DiaryEntry[]> {
    return db.entries.orderBy('date').reverse().toArray()
  },

  /**
   * Get entries with pagination
   */
  async getPaginated(limit: number, offset = 0): Promise<DiaryEntry[]> {
    return db.entries.orderBy('date').reverse().offset(offset).limit(limit).toArray()
  },

  /**
   * Get total count of entries
   */
  async count(): Promise<number> {
    return db.entries.count()
  },

  /**
   * Get distinct dates that have entries
   */
  async getDistinctDates(): Promise<string[]> {
    const entries = await db.entries.orderBy('date').uniqueKeys()
    return entries as string[]
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
   * Delete an entry by ID
   */
  async delete(id: string): Promise<void> {
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
    return db.entries.filter((entry) => entry.content.toLowerCase().includes(lowerQuery)).toArray()
  },
}
