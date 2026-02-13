import type { SyncError } from '@/types'

const RETRYABLE_KINDS = new Set(['network', 'server', 'rate_limit'])

/**
 * Check if a SyncError is retryable.
 */
export function isRetryable(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof (error as Record<string, unknown>).kind === 'string'
  ) {
    return RETRYABLE_KINDS.has((error as Record<string, unknown>).kind as string)
  }
  return false
}

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  signal?: AbortSignal
  onRetry?: (attempt: number, delay: number, error: unknown) => void
}

const DEFAULTS = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 3,
}

/**
 * Retry an async function with exponential backoff.
 * Only retries errors where isRetryable returns true.
 * Non-retryable errors are thrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const config = { ...DEFAULTS, ...options }

  if (config.signal?.aborted) {
    throw { kind: 'cancelled', message: 'Aborted before start' } satisfies SyncError
  }

  let lastError: unknown

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isRetryable(error)) throw error
      if (config.signal?.aborted) {
        throw { kind: 'cancelled', message: 'Cancelled during retry' } satisfies SyncError
      }

      // Last attempt — don't wait, just throw
      if (attempt >= config.maxAttempts - 1) break

      const delay = Math.min(
        config.baseDelay * config.backoffMultiplier ** attempt,
        config.maxDelay,
      )

      config.onRetry?.(attempt + 1, delay, error)
      await sleep(delay, config.signal)
    }
  }

  throw lastError
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject({ kind: 'cancelled', message: 'Cancelled during wait' } satisfies SyncError)
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject({ kind: 'cancelled', message: 'Cancelled during wait' } satisfies SyncError)
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
