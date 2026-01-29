import { db } from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { CreateImageInput, ImageRecord } from '@/types'

/**
 * Images Repository
 * Handles all image record CRUD operations
 */
export const imagesRepository = {
  /**
   * Get a single image by ID
   */
  async getById(id: string): Promise<ImageRecord | undefined> {
    return db.images.get(id)
  },

  /**
   * Get all images for a specific entry
   */
  async getByEntryId(entryId: string): Promise<ImageRecord[]> {
    return db.images.where('entryId').equals(entryId).sortBy('createdAt')
  },

  /**
   * Get multiple images by IDs
   */
  async getByIds(ids: string[]): Promise<ImageRecord[]> {
    return db.images.where('id').anyOf(ids).toArray()
  },

  /**
   * Get total count of images
   */
  async count(): Promise<number> {
    return db.images.count()
  },

  /**
   * Create a new image record
   */
  async create(input: CreateImageInput): Promise<ImageRecord> {
    const image: ImageRecord = {
      id: generateId(),
      entryId: input.entryId,
      blob: input.blob,
      thumbnail: input.thumbnail,
      createdAt: Date.now(),
    }

    await db.images.add(image)
    return image
  },

  /**
   * Create multiple image records
   */
  async createMany(inputs: CreateImageInput[]): Promise<ImageRecord[]> {
    const now = Date.now()
    const images: ImageRecord[] = inputs.map((input, index) => ({
      id: generateId(),
      entryId: input.entryId,
      blob: input.blob,
      thumbnail: input.thumbnail,
      createdAt: now + index, // Ensure unique timestamps for ordering
    }))

    await db.images.bulkAdd(images)
    return images
  },

  /**
   * Delete an image by ID
   */
  async delete(id: string): Promise<void> {
    await db.images.delete(id)
  },

  /**
   * Delete all images for a specific entry
   */
  async deleteByEntryId(entryId: string): Promise<void> {
    await db.images.where('entryId').equals(entryId).delete()
  },

  /**
   * Delete multiple images by IDs
   */
  async deleteMany(ids: string[]): Promise<void> {
    await db.images.where('id').anyOf(ids).delete()
  },

  /**
   * Delete all images (for testing or reset)
   */
  async deleteAll(): Promise<void> {
    await db.images.clear()
  },

  /**
   * Get oldest images (for cleanup when quota exceeded)
   */
  async getOldest(limit: number): Promise<ImageRecord[]> {
    return db.images.orderBy('createdAt').limit(limit).toArray()
  },

  /**
   * Calculate total storage size (approximate)
   */
  async getTotalSize(): Promise<number> {
    let totalSize = 0
    await db.images.each((image) => {
      // Handle both Blob and serialized Blob (from fake-indexeddb)
      const blobSize = image.blob?.size ?? 0
      const thumbnailSize = image.thumbnail?.size ?? 0
      totalSize += blobSize + thumbnailSize
    })
    return totalSize
  },
}
