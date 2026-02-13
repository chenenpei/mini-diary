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
  /** Soft delete timestamp, undefined means not deleted */
  deletedAt?: number
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
  /** Last successful sync timestamp */
  lastSyncedAt?: number
  /** Cloud storage provider */
  cloudProvider?: 'google-drive'
  /** Cloud OAuth access token */
  cloudAccessToken?: string
  /** Cloud token expiration timestamp */
  cloudTokenExpiresAt?: number
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

// ============================================
// Cloud Sync Types
// ============================================

/**
 * Cloud storage JSON format
 */
export interface CloudData {
  version: 1
  syncedAt: string // ISO 8601
  entries: DiaryEntry[]
  imageManifest: ImageManifest[]
}

/**
 * Image manifest entry (without blob data)
 */
export interface ImageManifest {
  id: string
  entryId: string
  createdAt: number
}

/**
 * Result of cloud data validation (discriminated union)
 */
export type ValidationResult =
  | { valid: true; data: CloudData; warnings: string[] }
  | { valid: false; errors: string[]; warnings: string[] }

/**
 * Result of image merge operation
 */
export interface ImageMergeResult {
  toUpload: string[]
  toDownload: string[]
}

/**
 * Write-ahead backup before pull/merge operations
 */
export interface SyncBackup {
  id: 'latest'
  entries: DiaryEntry[]
  imageManifest: ImageManifest[]
  createdAt: number
}

/**
 * Change detection state
 */
export type ChangeState = 'no-change' | 'local-only' | 'cloud-only' | 'both-changed'

// ============================================
// Sync Progress Types
// ============================================

/**
 * Sync phase discriminated union
 */
export type SyncPhase =
  | { phase: 'preparing'; message: string }
  | { phase: 'checking'; message: string }
  | { phase: 'downloading-entries'; message: string }
  | { phase: 'downloading-images'; current: number; total: number }
  | { phase: 'merging'; message: string }
  | { phase: 'uploading-entries'; message: string }
  | { phase: 'uploading-images'; current: number; total: number }
  | { phase: 'verifying'; message: string }
  | { phase: 'cleanup'; message: string }
  | { phase: 'retrying'; failedPhase: string; attempt: number; maxAttempts: number; nextRetryIn: number }
  | { phase: 'done'; summary: SyncSummary }
  | { phase: 'error'; error: SyncError; failedAt: string }

export interface SyncProgress {
  currentPhase: SyncPhase
  completedPhases: number
  totalPhases: number
  percent: number
}

export interface SyncSummary {
  direction: 'push' | 'pull' | 'merge'
  entriesSynced: number
  imagesUploaded: number
  imagesDownloaded: number
  imagesFailed: number
  duration: number
}

export interface SyncError {
  kind: SyncErrorKind
  message: string
}

export type SyncErrorKind =
  | 'network'
  | 'server'
  | 'rate_limit'
  | 'auth'
  | 'data_corrupt'
  | 'quota'
  | 'cancelled'

// ============================================
// Sync Conflict Types
// ============================================

export interface ConflictInfo {
  localChanges: { added: number; modified: number; deleted: number }
  cloudChanges: { added: number; modified: number; deleted: number }
}

export type ConflictResolver = (info: ConflictInfo) => Promise<'merge' | 'pull' | 'push' | 'cancel'>

// ============================================
// Sync Operation Types
// ============================================

export type SyncOperation = 'push' | 'pull' | 'merge'

export interface SyncInput {
  localEntries: DiaryEntry[]
  localImageManifest: ImageManifest[]
  lastSyncedAt: number | undefined
  getImageBlobs: (id: string) => Promise<{ blob: Blob; thumbnail: Blob }>
  onConflict: ConflictResolver
  createBackup?: () => Promise<void>
  deleteBackup?: () => Promise<void>
}

export interface SyncResult {
  entries: DiaryEntry[]
  downloadedImages: Array<{ id: string; entryId: string; blob: Blob; thumbnail: Blob }>
  failedImages: string[]
  lastSyncedAt: number
  summary: SyncSummary
}
