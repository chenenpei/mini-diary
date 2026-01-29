import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

/**
 * 触发触觉反馈（震动）
 * @param duration 震动持续时间（毫秒），默认 10ms
 */
export function triggerHaptic(duration = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(duration)
  }
}

/**
 * 生成 UUID v4
 * 优先使用 crypto.randomUUID()，不可用时（非安全上下文）使用 fallback
 */
export function generateId(): string {
  // 优先使用 crypto.randomUUID（需要安全上下文）
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: 使用 crypto.getRandomValues（大多数环境可用）
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // Set version (4) and variant bits via index assignment
    const hex = Array.from(bytes, (byte, i) => {
      let value = byte
      if (i === 6) value = (byte & 0x0f) | 0x40 // version 4
      if (i === 8) value = (byte & 0x3f) | 0x80 // variant
      return value.toString(16).padStart(2, '0')
    }).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  // Last resort: Math.random（不推荐，但作为最后手段）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
