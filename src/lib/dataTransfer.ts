import { db } from '@/lib/db'
import type { DiaryEntry, ImageRecord } from '@/types'

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string
  exportedAt: string
  entries: DiaryEntry[]
  images: Array<{
    id: string
    entryId: string
    blob: string // Base64
    thumbnail: string // Base64
    createdAt: number
  }>
}

/**
 * Blob 转 Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data URL 前缀，只保留 base64 部分
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Base64 转 Blob
 */
function base64ToBlob(base64: string, type = 'image/jpeg'): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type })
}

/**
 * 导出所有数据
 */
export async function exportAllData(): Promise<ExportData> {
  const entries = await db.entries.toArray()
  const images = await db.images.toArray()

  // 将图片 Blob 转换为 Base64
  const imagesWithBase64 = await Promise.all(
    images.map(async (image) => ({
      id: image.id,
      entryId: image.entryId,
      blob: await blobToBase64(image.blob),
      thumbnail: await blobToBase64(image.thumbnail),
      createdAt: image.createdAt,
    })),
  )

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    entries,
    images: imagesWithBase64,
  }
}

/**
 * 下载导出文件
 */
export async function downloadExport(): Promise<void> {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().split('T')[0]
  const filename = `mini-diary-backup-${date}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 验证导入数据格式
 */
function validateImportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>
  if (typeof obj.version !== 'string') return false
  if (!Array.isArray(obj.entries)) return false
  if (!Array.isArray(obj.images)) return false

  return true
}

/**
 * 导入数据
 * 策略: 遇到 ID 冲突时保留更新时间较新的版本
 */
export async function importData(
  file: File,
): Promise<{ entriesCount: number; imagesCount: number }> {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!validateImportData(data)) {
    throw new Error('无效的备份文件格式')
  }

  let entriesImported = 0
  let imagesImported = 0

  // 导入日记条目
  for (const entry of data.entries) {
    const existing = await db.entries.get(entry.id)
    if (!existing || entry.updatedAt > existing.updatedAt) {
      await db.entries.put(entry)
      entriesImported++
    }
  }

  // 导入图片
  for (const image of data.images) {
    const existing = await db.images.get(image.id)
    if (!existing) {
      const imageRecord: ImageRecord = {
        id: image.id,
        entryId: image.entryId,
        blob: base64ToBlob(image.blob),
        thumbnail: base64ToBlob(image.thumbnail),
        createdAt: image.createdAt,
      }
      await db.images.put(imageRecord)
      imagesImported++
    }
  }

  return {
    entriesCount: entriesImported,
    imagesCount: imagesImported,
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.entries, db.images], async () => {
    await db.entries.clear()
    await db.images.clear()
  })
}

/**
 * 读取文件
 */
export function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch {
        reject(new Error('无效的 JSON 文件'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
