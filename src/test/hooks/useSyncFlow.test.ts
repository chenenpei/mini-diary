import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncFlow } from '@/hooks/useSyncFlow'

// Mock dependencies
vi.mock('@/lib/repositories/settings', () => ({
  settingsRepository: {
    getCloudProvider: vi.fn(async () => null),
    setCloudProvider: vi.fn(async () => {}),
    getLastSyncedAt: vi.fn(async () => undefined),
    setLastSyncedAt: vi.fn(async () => {}),
    getAccessToken: vi.fn(async () => null),
    clearSyncSettings: vi.fn(async () => {}),
  },
}))

vi.mock('@/lib/repositories/backups', () => ({
  backupsRepository: {
    createBackup: vi.fn(async () => {}),
    deleteBackup: vi.fn(async () => {}),
    hasBackup: vi.fn(async () => false),
  },
}))

import { settingsRepository } from '@/lib/repositories/settings'

describe('useSyncFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start in idle state when no provider is connected', async () => {
    const { result } = renderHook(() => useSyncFlow())

    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('idle')
    })
  })

  it('should start in connected state when provider exists', async () => {
    vi.mocked(settingsRepository.getCloudProvider).mockResolvedValue('google-drive')
    vi.mocked(settingsRepository.getLastSyncedAt).mockResolvedValue(1000)

    const { result } = renderHook(() => useSyncFlow())

    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('connected')
    })
  })

  it('should include lastSyncedAt in connected state', async () => {
    vi.mocked(settingsRepository.getCloudProvider).mockResolvedValue('google-drive')
    vi.mocked(settingsRepository.getLastSyncedAt).mockResolvedValue(1000)

    const { result } = renderHook(() => useSyncFlow())

    await vi.waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'connected',
        provider: 'google-drive',
        lastSyncedAt: 1000,
      })
    })
  })

  it('should transition to idle after disconnect', async () => {
    vi.mocked(settingsRepository.getCloudProvider).mockResolvedValue('google-drive')

    const { result } = renderHook(() => useSyncFlow())

    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('connected')
    })

    await act(async () => {
      await result.current.disconnect()
    })

    expect(result.current.state.status).toBe('idle')
    expect(settingsRepository.clearSyncSettings).toHaveBeenCalled()
  })

  it('should transition to connected after dismiss from complete', async () => {
    vi.mocked(settingsRepository.getCloudProvider).mockResolvedValue('google-drive')

    const { result } = renderHook(() => useSyncFlow())

    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('connected')
    })

    act(() => {
      result.current.dismiss()
    })

    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('connected')
    })
  })
})
