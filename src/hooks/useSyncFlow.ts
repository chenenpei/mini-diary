import { useCallback, useEffect, useRef, useState } from 'react'
import { backupsRepository } from '@/lib/repositories/backups'
import { settingsRepository } from '@/lib/repositories/settings'
import type { RecoveryInfo } from '@/lib/sync/recovery'
import type { ConflictInfo, SyncError, SyncProgress, SyncSummary } from '@/types'

// ─── State Types ───

export type SyncFlowState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected'; provider: string; lastSyncedAt?: number }
  | { status: 'syncing'; progress: SyncProgress }
  | { status: 'conflict'; info: ConflictInfo }
  | { status: 'complete'; summary: SyncSummary }
  | { status: 'error'; error: SyncError }
  | { status: 'recovery'; info: RecoveryInfo }

function isSyncError(error: unknown): error is SyncError {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error
}

// ─── Hook ───

export function useSyncFlow() {
  const [state, setState] = useState<SyncFlowState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const conflictResolverRef = useRef<
    ((choice: 'merge' | 'pull' | 'push' | 'cancel') => void) | null
  >(null)

  const checkConnection = useCallback(async () => {
    const { checkPendingRecovery } = await import('@/lib/sync/recovery')
    const recoveryInfo = await checkPendingRecovery()
    if (recoveryInfo) {
      setState({ status: 'recovery', info: recoveryInfo })
      return
    }

    const provider = await settingsRepository.getCloudProvider()
    if (provider) {
      const lastSyncedAt = await settingsRepository.getLastSyncedAt()
      setState({
        status: 'connected',
        provider,
        ...(lastSyncedAt !== undefined ? { lastSyncedAt } : {}),
      })
    } else {
      setState({ status: 'idle' })
    }
  }, [])

  // Check connection on mount
  useEffect(() => {
    checkConnection()
    return () => {
      abortRef.current?.abort()
    }
  }, [checkConnection])

  const connect = useCallback(async (provider: 'google-drive') => {
    setState({ status: 'connecting' })
    try {
      const { createGoogleTokenProvider } = await import('@/lib/cloud/auth')
      const tokenProvider = createGoogleTokenProvider(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '')
      await tokenProvider()
      await settingsRepository.setCloudProvider(provider)
      setState({ status: 'connected', provider })
    } catch (error) {
      if (isSyncError(error)) {
        setState({ status: 'error', error })
      } else {
        setState({
          status: 'error',
          error: { kind: 'auth', message: String(error) },
        })
      }
    }
  }, [])

  const sync = useCallback(async () => {
    const provider = await settingsRepository.getCloudProvider()
    if (!provider) return

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const { GoogleDriveAdapter } = await import('@/lib/cloud/google-drive')
      const { createGoogleTokenProvider } = await import('@/lib/cloud/auth')
      const { SyncManager } = await import('@/lib/sync/manager')
      const { entriesRepository } = await import('@/lib/repositories/entries')
      const { imagesRepository } = await import('@/lib/repositories/images')
      const { db } = await import('@/lib/db')

      const tokenProvider = createGoogleTokenProvider(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '')
      const adapter = new GoogleDriveAdapter(tokenProvider)
      const manager = new SyncManager(adapter, (progress) => {
        setState({ status: 'syncing', progress })
      })

      setState({
        status: 'syncing',
        progress: {
          currentPhase: { phase: 'preparing', message: '' },
          completedPhases: 0,
          totalPhases: 0,
          percent: 0,
        },
      })

      const localEntries = await entriesRepository.getAllIncludeDeleted()
      const localImageManifest = await imagesRepository.getManifest()
      const lastSyncedAt = await settingsRepository.getLastSyncedAt()

      const result = await manager.sync(
        {
          localEntries,
          localImageManifest,
          lastSyncedAt,
          getImageBlobs: async (id) => {
            const record = await imagesRepository.getById(id)
            if (!record) throw { kind: 'data_corrupt', message: `Image not found: ${id}` }
            return { blob: record.blob, thumbnail: record.thumbnail }
          },
          onConflict: (info) =>
            new Promise((resolve) => {
              conflictResolverRef.current = resolve
              setState({ status: 'conflict', info })
            }),
          createBackup: async () => {
            await backupsRepository.createBackup(localEntries, localImageManifest)
          },
          deleteBackup: async () => {
            await backupsRepository.deleteBackup()
          },
        },
        controller.signal,
      )

      // Write results to IndexedDB
      await db.transaction('rw', db.entries, db.images, async () => {
        await db.entries.clear()
        if (result.entries.length > 0) {
          await db.entries.bulkPut(result.entries)
        }
        for (const img of result.downloadedImages) {
          await db.images.put({
            id: img.id,
            entryId: img.entryId,
            blob: img.blob,
            thumbnail: img.thumbnail,
            createdAt: Date.now(),
          })
        }
      })

      await settingsRepository.setLastSyncedAt(result.lastSyncedAt)
      setState({ status: 'complete', summary: result.summary })
    } catch (error) {
      if (isSyncError(error)) {
        if (error.kind === 'cancelled') {
          await checkConnection()
        } else {
          setState({ status: 'error', error })
        }
      } else {
        setState({
          status: 'error',
          error: { kind: 'network', message: String(error) },
        })
      }
    } finally {
      abortRef.current = null
    }
  }, [checkConnection])

  const resolveConflict = useCallback((choice: 'merge' | 'pull' | 'push' | 'cancel') => {
    conflictResolverRef.current?.(choice)
    conflictResolverRef.current = null
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    if (conflictResolverRef.current) {
      conflictResolverRef.current('cancel')
      conflictResolverRef.current = null
    }
  }, [])

  const disconnect = useCallback(async () => {
    await settingsRepository.clearSyncSettings()
    setState({ status: 'idle' })
  }, [])

  const dismiss = useCallback(() => {
    checkConnection()
  }, [checkConnection])

  const restoreBackup = useCallback(async () => {
    const { restoreFromBackup } = await import('@/lib/sync/recovery')
    await restoreFromBackup()
    await checkConnection()
  }, [checkConnection])

  const dismissRecovery = useCallback(async () => {
    await backupsRepository.deleteBackup()
    await checkConnection()
  }, [checkConnection])

  return {
    state,
    connect,
    sync,
    resolveConflict,
    cancel,
    disconnect,
    dismiss,
    restoreBackup,
    dismissRecovery,
  }
}
