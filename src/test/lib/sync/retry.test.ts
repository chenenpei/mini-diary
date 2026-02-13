import { afterEach, describe, expect, it, vi } from 'vitest'
import { isRetryable, withRetry } from '@/lib/sync/retry'
import type { SyncError } from '@/types'

describe('retry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isRetryable', () => {
    it('should return true for network errors', () => {
      expect(isRetryable({ kind: 'network', message: '' } satisfies SyncError)).toBe(true)
    })

    it('should return true for server errors', () => {
      expect(isRetryable({ kind: 'server', message: '' } satisfies SyncError)).toBe(true)
    })

    it('should return true for rate_limit errors', () => {
      expect(isRetryable({ kind: 'rate_limit', message: '' } satisfies SyncError)).toBe(true)
    })

    it('should return false for auth errors', () => {
      expect(isRetryable({ kind: 'auth', message: '' } satisfies SyncError)).toBe(false)
    })

    it('should return false for data_corrupt errors', () => {
      expect(isRetryable({ kind: 'data_corrupt', message: '' } satisfies SyncError)).toBe(false)
    })

    it('should return false for quota errors', () => {
      expect(isRetryable({ kind: 'quota', message: '' } satisfies SyncError)).toBe(false)
    })

    it('should return false for cancelled', () => {
      expect(isRetryable({ kind: 'cancelled', message: '' } satisfies SyncError)).toBe(false)
    })

    it('should return false for non-SyncError objects', () => {
      expect(isRetryable(new Error('random'))).toBe(false)
      expect(isRetryable('string')).toBe(false)
      expect(isRetryable(null)).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn(async () => 'ok')
      const result = await withRetry(fn)
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should retry on retryable error and succeed', async () => {
      vi.useFakeTimers()
      const error: SyncError = { kind: 'network', message: 'timeout' }
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok')

      const promise = withRetry(fn)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should throw after max attempts exhausted', async () => {
      vi.useFakeTimers()
      const error: SyncError = { kind: 'network', message: 'timeout' }
      const fn = vi.fn().mockRejectedValue(error)

      // Attach rejection handler immediately to avoid unhandled rejection
      const promise = withRetry(fn, { maxAttempts: 3 }).catch((e: unknown) => e)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toMatchObject({ kind: 'network' })
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const error: SyncError = { kind: 'auth', message: '401' }
      const fn = vi.fn().mockRejectedValue(error)

      await expect(withRetry(fn)).rejects.toMatchObject({ kind: 'auth' })
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should use exponential backoff', async () => {
      vi.useFakeTimers()
      const error: SyncError = { kind: 'server', message: '500' }
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('ok')
      const onRetry = vi.fn()

      const promise = withRetry(fn, {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 3,
        onRetry,
      })

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(3000)
      await promise

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry.mock.calls[0]?.[1]).toBe(1000)
      expect(onRetry.mock.calls[1]?.[1]).toBe(3000)
    })

    it('should cap delay at maxDelay', async () => {
      vi.useFakeTimers()
      const error: SyncError = { kind: 'network', message: 'fail' }
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok')
      const onRetry = vi.fn()

      const promise = withRetry(fn, {
        maxAttempts: 2,
        baseDelay: 5000,
        backoffMultiplier: 3,
        maxDelay: 10000,
        onRetry,
      })

      await vi.advanceTimersByTimeAsync(5000)
      await promise

      expect(onRetry.mock.calls[0]?.[1]).toBe(5000)
    })

    it('should call onRetry with attempt number, delay, and error', async () => {
      vi.useFakeTimers()
      const error: SyncError = { kind: 'network', message: 'fail' }
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok')
      const onRetry = vi.fn()

      const promise = withRetry(fn, { onRetry })
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(onRetry).toHaveBeenCalledWith(1, 1000, error)
    })

    it('should respect AbortSignal during wait', async () => {
      vi.useFakeTimers()
      const controller = new AbortController()
      const error: SyncError = { kind: 'network', message: 'fail' }
      const fn = vi.fn().mockRejectedValue(error)

      // Attach rejection handler immediately to avoid unhandled rejection
      const promise = withRetry(fn, { maxAttempts: 3, signal: controller.signal }).catch(
        (e: unknown) => e,
      )

      setTimeout(() => controller.abort(), 500)
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise
      expect(result).toMatchObject({ kind: 'cancelled' })
    })

    it('should abort immediately if signal already aborted', async () => {
      const controller = new AbortController()
      controller.abort()
      const fn = vi.fn(async () => 'ok')

      await expect(withRetry(fn, { signal: controller.signal })).rejects.toMatchObject({
        kind: 'cancelled',
      })
      expect(fn).not.toHaveBeenCalled()
    })
  })
})
