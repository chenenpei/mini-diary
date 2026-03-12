'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, Cloud, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConflictDialog } from '@/components/sync/ConflictDialog'
import { RecoveryBanner } from '@/components/sync/RecoveryBanner'
import { SyncCompleteView } from '@/components/sync/SyncComplete'
import { SyncErrorView } from '@/components/sync/SyncError'
import { SyncProgressView } from '@/components/sync/SyncProgress'
import { useSyncFlow } from '@/hooks/useSyncFlow'

export const Route = createFileRoute('/sync')({
  component: SyncPage,
})

function SyncPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('sync')
  const { t: tCommon } = useTranslation('common')
  const {
    state,
    connect,
    sync,
    resolveConflict,
    cancel,
    disconnect,
    dismiss,
    restoreBackup,
    dismissRecovery,
  } = useSyncFlow()

  const handleBack = useCallback(() => {
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [navigate])

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
        <button
          type="button"
          onClick={handleBack}
          className="touch-target flex shrink-0 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
          aria-label={tCommon('back')}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="text-lg font-medium text-foreground">{t('title')}</span>
      </header>
      <main className="flex-1 px-5 pt-5 pb-24 sm:px-6 lg:px-8">
        {state.status === 'recovery' && (
          <RecoveryBanner info={state.info} onRestore={restoreBackup} onDismiss={dismissRecovery} />
        )}
        {state.status === 'idle' && <IdleView onConnect={connect} />}
        {state.status === 'connecting' && <ConnectingView />}
        {state.status === 'connected' && (
          <ConnectedView
            provider={state.provider}
            lastSyncedAt={state.lastSyncedAt}
            localCount={state.localCount}
            onSync={sync}
            onDisconnect={disconnect}
          />
        )}
        {state.status === 'syncing' && (
          <SyncProgressView progress={state.progress} onCancel={cancel} />
        )}
        <ConflictDialog
          isOpen={state.status === 'conflict'}
          info={
            state.status === 'conflict'
              ? state.info
              : {
                  localChanges: { added: 0, modified: 0, deleted: 0 },
                  cloudChanges: { added: 0, modified: 0, deleted: 0 },
                }
          }
          onResolve={resolveConflict}
        />
        {state.status === 'complete' && (
          <SyncCompleteView summary={state.summary} onDismiss={dismiss} onRetryFailed={sync} />
        )}
        {state.status === 'error' && (
          <SyncErrorView
            error={state.error}
            onRetry={sync}
            onReauth={() => connect('google-drive')}
            onDismiss={dismiss}
          />
        )}
      </main>
    </div>
  )
}

// ─── Idle View ───

function IdleView({ onConnect }: { onConnect: (provider: 'google-drive') => void }) {
  const { t } = useTranslation('sync')

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <Cloud className="h-16 w-16 text-muted-foreground/50" />
      <p className="text-lg font-medium text-foreground">{t('selectProvider')}</p>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => onConnect('google-drive')}
          className="flex w-full items-center gap-3 rounded-md border border-border p-4 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          <img src="/icons/google-drive.svg" alt="" className="h-5 w-5 shrink-0" />
          {t('googleDrive')}
        </button>
        <button
          type="button"
          disabled
          className="flex w-full items-center gap-3 rounded-md border border-border p-4 text-sm font-medium text-foreground opacity-50"
        >
          <img src="/icons/onedrive.svg" alt="" className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{t('oneDrive')}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {t('comingSoon')}
          </span>
        </button>
      </div>
    </div>
  )
}

// ─── Connecting View ───

function ConnectingView() {
  const { t } = useTranslation('sync')

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{t('connecting')}</p>
    </div>
  )
}

// ─── Connected View ───

function ConnectedView({
  provider,
  lastSyncedAt,
  localCount,
  onSync,
  onDisconnect,
}: {
  provider: string
  lastSyncedAt?: number | undefined
  localCount: number
  onSync: () => void
  onDisconnect: (deleteCloudData: boolean) => void
}) {
  const { t, i18n } = useTranslation('sync')
  const { t: tCommon } = useTranslation('common')
  const providerLabel = provider === 'google-drive' ? t('googleDrive') : provider

  const [showDisconnect, setShowDisconnect] = useState(false)
  const [deleteCloud, setDeleteCloud] = useState(false)

  function handleCancel(): void {
    setShowDisconnect(false)
    setDeleteCloud(false)
  }

  function handleConfirm(): void {
    setShowDisconnect(false)
    onDisconnect(deleteCloud)
    setDeleteCloud(false)
  }

  return (
    <div className="flex flex-col gap-4 py-16">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4" />
        <span>{providerLabel}</span>
      </div>
      {lastSyncedAt !== undefined && (
        <p className="text-sm text-muted-foreground">
          {t('lastSync')}:{' '}
          {new Intl.DateTimeFormat(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(lastSyncedAt)}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t('localCount', { count: localCount })}</p>
      <button
        type="button"
        onClick={onSync}
        className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('syncButton')}
      </button>
      <button
        type="button"
        onClick={() => setShowDisconnect(true)}
        className="w-full rounded-md border border-border p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('disconnect')}
      </button>

      <AnimatePresence>
        {showDisconnect && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          >
            <motion.div
              className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <h2 className="text-lg font-semibold text-foreground">{t('disconnect')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('disconnectConfirm')}</p>

              <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={deleteCloud}
                  onChange={(e) => setDeleteCloud(e.target.checked)}
                  className="h-4 w-4 accent-foreground"
                />
                {t('deleteCloudData')}
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:opacity-80"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 active:opacity-80"
                >
                  {tCommon('confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
