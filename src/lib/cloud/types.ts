import type { CloudData } from '@/types'

/**
 * Abstract interface for cloud storage providers.
 */
export interface CloudAdapter {
  readJson(path: string): Promise<CloudData | null>
  writeJson(path: string, data: CloudData): Promise<void>
  uploadImage(path: string, blob: Blob): Promise<void>
  downloadImage(path: string): Promise<Blob>
  listFiles(folderPath: string): Promise<string[]>
  deleteFiles(paths: string[]): Promise<void>
}

export type TokenProvider = () => Promise<string>
