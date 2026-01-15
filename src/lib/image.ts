/**
 * Image compression utilities using Canvas API
 */

interface ImageConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  outputFormat: 'image/jpeg' | 'image/webp'
}

const imageConfig: ImageConfig = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  outputFormat: 'image/jpeg',
}

const thumbnailConfig: ImageConfig = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.7,
  outputFormat: 'image/jpeg',
}

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Supported image formats */
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']

interface ProcessedImage {
  blob: Blob
  thumbnail: Blob
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return { valid: false, error: '不支持的图片格式，请使用 JPG、PNG 或 WebP' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '图片大小不能超过 10MB' }
  }

  return { valid: true }
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  config: ImageConfig
): { width: number; height: number } {
  let newWidth = width
  let newHeight = height

  if (width > config.maxWidth) {
    newWidth = config.maxWidth
    newHeight = (height * config.maxWidth) / width
  }

  if (newHeight > config.maxHeight) {
    newHeight = config.maxHeight
    newWidth = (width * config.maxHeight) / height
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) }
}

/**
 * Compress image using Canvas API
 */
async function compressWithCanvas(
  file: File,
  config: ImageConfig
): Promise<Blob> {
  // Create image bitmap from file
  const bitmap = await createImageBitmap(file)

  const { width, height } = calculateDimensions(
    bitmap.width,
    bitmap.height,
    config
  )

  // Use OffscreenCanvas if available, fallback to regular canvas
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建 Canvas 上下文')

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    return canvas.convertToBlob({
      type: config.outputFormat,
      quality: config.quality,
    })
  }

  // Fallback for browsers without OffscreenCanvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('图片压缩失败'))
        }
      },
      config.outputFormat,
      config.quality
    )
  })
}

/**
 * Process image: validate, compress, and generate thumbnail
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const validation = validateImage(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Compress main image and thumbnail in parallel
  const [blob, thumbnail] = await Promise.all([
    compressWithCanvas(file, imageConfig),
    compressWithCanvas(file, thumbnailConfig),
  ])

  return { blob, thumbnail }
}

/**
 * Create object URL from blob (remember to revoke when done)
 */
export function createImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Revoke object URL to free memory
 */
export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url)
}
