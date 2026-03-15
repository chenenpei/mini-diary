'use client'

import { AlertCircle, HardDrive, KeyRound, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SyncError, SyncErrorKind } from '@/types'

const ERROR_MESSAGES = {
  auth: 'errorAuth',
  network: 'errorNetwork',
  server: 'errorServer',
  rate_limit: 'errorRateLimit',
  data_corrupt: 'errorDataCorrupt',
  quota: 'errorQuota',
  cancelled: 'errorNetwork',
} as const satisfies Record<SyncErrorKind, string>

/** Visual treatment per error severity */
function ErrorIcon({ kind }: { kind: SyncErrorKind }) {
  const iconClass = 'h-12 w-12'

  switch (kind) {
    // Transient — calm tone, just retry
    case 'network':
    case 'server':
    case 'rate_limit':
    case 'cancelled':
      return <WifiOff className={`${iconClass} text-muted-foreground`} />

    // Action needed — routine, not alarming
    case 'auth':
      return <KeyRound className={`${iconClass} text-foreground`} />
    case 'quota':
      return <HardDrive className={`${iconClass} text-foreground`} />

    // Critical — data at risk
    case 'data_corrupt':
      return <AlertCircle className={`${iconClass} text-destructive`} />
  }
}

interface SyncErrorProps {
  error: SyncError
  onRetry: () => void
  onReauth: () => void
  onDismiss: () => void
}

export function SyncErrorView({ error, onRetry, onReauth, onDismiss }: SyncErrorProps) {
  const { t } = useTranslation('sync')
  const messageKey = ERROR_MESSAGES[error.kind]

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <ErrorIcon kind={error.kind} />

      <p className="text-center text-sm text-muted-foreground" role="alert">
        {t(messageKey)}
      </p>

      <div className="flex w-full flex-col gap-2">
        {error.kind === 'auth' && (
          <button
            type="button"
            onClick={onReauth}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('reauth')}
          </button>
        )}

        {(error.kind === 'network' || error.kind === 'server' || error.kind === 'rate_limit') && (
          <button
            type="button"
            onClick={onRetry}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('retry')}
          </button>
        )}

        {error.kind === 'data_corrupt' && (
          <button
            type="button"
            onClick={onRetry}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('overwriteCloud')}
          </button>
        )}

        {error.kind === 'quota' && (
          <button
            type="button"
            onClick={() => window.open('https://drive.google.com/settings/storage', '_blank')}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('manageStorage')}
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-sm p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          {t('done')}
        </button>
      </div>
    </div>
  )
}
