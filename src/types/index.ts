/**
 * MiniDiary Core Types
 * Based on TECH.md specifications
 */

// ============================================
// Core Data Models
// ============================================

/**
 * A single diary entry
 */
export interface DiaryEntry {
  /** UUID v4 */
  id: string
  /** Markdown content, max 10,000 characters */
  content: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  /** Unix timestamp in milliseconds */
  createdAt: number
  /** Unix timestamp in milliseconds */
  updatedAt: number
  /** Associated image IDs, max 3 */
  imageIds: string[]
}

/**
 * An image record associated with a diary entry
 */
export interface ImageRecord {
  /** UUID v4 */
  id: string
  /** Foreign key to DiaryEntry.id */
  entryId: string
  /** Compressed image blob */
  blob: Blob
  /** Thumbnail blob */
  thumbnail: Blob
  /** Unix timestamp in milliseconds */
  createdAt: number
}

/**
 * Application settings stored in IndexedDB
 */
export interface AppSettings {
  /** Settings key identifier */
  key: string
  /** Theme preference */
  theme: 'light' | 'dark' | 'system'
  /** App version */
  version: string
  /** Last backup timestamp */
  lastBackupAt?: number
}

// ============================================
// Input Types (for creating/updating)
// ============================================

/**
 * Input for creating a new diary entry
 */
export interface CreateEntryInput {
  content: string
  date: string
  imageIds?: string[]
}

/**
 * Input for updating an existing diary entry
 */
export interface UpdateEntryInput {
  id: string
  content?: string
  date?: string
  imageIds?: string[]
}

/**
 * Input for creating a new image record
 */
export interface CreateImageInput {
  entryId: string
  blob: Blob
  thumbnail: Blob
}

// ============================================
// Query Types
// ============================================

/**
 * Options for querying entries by date range
 */
export interface DateRangeQuery {
  /** Start date (YYYY-MM-DD), inclusive */
  startDate: string
  /** End date (YYYY-MM-DD), inclusive */
  endDate: string
}

/**
 * Options for paginated queries
 */
export interface PaginationOptions {
  /** Number of items per page */
  limit: number
  /** Offset for pagination */
  offset?: number
}

// ============================================
// Export/Import Types
// ============================================

/**
 * Format for exported data
 */
export interface ExportData {
  version: string
  exportedAt: number
  totalEntries: number
  totalImages: number
  entries: DiaryEntry[]
  images: Record<
    string,
    {
      blob: string // base64 data URL
      thumbnail: string // base64 data URL
      createdAt: number
    }
  >
}

// ============================================
// Image Processing Types
// ============================================

/**
 * Configuration for image compression
 */
export interface ImageCompressConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  outputFormat: 'image/jpeg' | 'image/webp'
}

/**
 * Result of image processing
 */
export interface ProcessedImage {
  blob: Blob
  thumbnail: Blob
  width: number
  height: number
}

// ============================================
// Sync Types (for multi-tab sync)
// ============================================

/**
 * Message format for BroadcastChannel sync
 */
export interface SyncMessage {
  type: 'entry' | 'image' | 'settings'
  action: 'create' | 'update' | 'delete'
  id: string
  timestamp: number
}
