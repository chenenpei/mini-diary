'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, Cloud, Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SyncProgressView } from '@/components/sync/SyncProgress'
import { useSyncFlow } from '@/hooks/useSyncFlow'

export const Route = createFileRoute('/sync')({
  component: SyncPage,
})

function SyncPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('sync')
  const { t: tCommon } = useTranslation('common')
  const { state, connect, sync, cancel, disconnect } = useSyncFlow()

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
      <main className="flex-1 p-4">
        {state.status === 'idle' && <IdleView onConnect={connect} />}
        {state.status === 'connecting' && <ConnectingView />}
        {state.status === 'connected' && (
          <ConnectedView
            provider={state.provider}
            lastSyncedAt={state.lastSyncedAt}
            onSync={sync}
            onDisconnect={disconnect}
          />
        )}
        {state.status === 'syncing' && (
          <SyncProgressView progress={state.progress} onCancel={cancel} />
        )}
        {state.status === 'conflict' && (
          <p className="text-sm text-muted-foreground">{t('conflictTitle')}</p>
        )}
        {state.status === 'complete' && (
          <p className="text-sm text-muted-foreground">{t('syncComplete')}</p>
        )}
        {state.status === 'error' && (
          <p className="text-sm text-muted-foreground">{state.error.message}</p>
        )}
      </main>
    </div>
  )
}

// ─── Idle View ───

function IdleView({ onConnect }: { onConnect: (provider: 'google-drive') => void }) {
  const { t } = useTranslation('sync')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Cloud className="h-16 w-16 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{t('selectProvider')}</p>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => onConnect('google-drive')}
          className="w-full rounded-md border border-border p-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          {t('googleDrive')}
        </button>
        <div className="flex w-full items-center justify-between rounded-md border border-border p-4 opacity-50">
          <span className="text-sm font-medium text-foreground">{t('oneDrive')}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
            {t('comingSoon')}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Connecting View ───

function ConnectingView() {
  const { t } = useTranslation('sync')

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{t('connecting')}</p>
    </div>
  )
}

// ─── Connected View ───

function ConnectedView({
  provider,
  lastSyncedAt,
  onSync,
  onDisconnect,
}: {
  provider: string
  lastSyncedAt?: number | undefined
  onSync: () => void
  onDisconnect: () => void
}) {
  const { t, i18n } = useTranslation('sync')
  const providerLabel = provider === 'google-drive' ? t('googleDrive') : provider

  return (
    <div className="flex flex-col gap-4">
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
      <button
        type="button"
        onClick={onSync}
        className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('syncButton')}
      </button>
      <button
        type="button"
        onClick={onDisconnect}
        className="w-full rounded-md border border-border p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('disconnect')}
      </button>
    </div>
  )
}
