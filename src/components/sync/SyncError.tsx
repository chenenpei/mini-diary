'use client'

import { AlertCircle } from 'lucide-react'
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
    <div className="flex flex-1 flex-col items-center gap-6">
      {/* Error icon */}
      <AlertCircle className="h-12 w-12 text-red-500" />

      {/* Error message */}
      <p className="text-center text-sm text-muted-foreground" role="alert">{t(messageKey)}</p>

      {/* Action button based on error kind */}
      <div className="flex w-full flex-col gap-2">
        {error.kind === 'auth' && (
          <button
            type="button"
            onClick={onReauth}
            autoFocus
            className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('reauth')}
          </button>
        )}

        {(error.kind === 'network' || error.kind === 'server' || error.kind === 'rate_limit') && (
          <button
            type="button"
            onClick={onRetry}
            autoFocus
            className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('retry')}
          </button>
        )}

        {error.kind === 'data_corrupt' && (
          <button
            type="button"
            onClick={onRetry}
            autoFocus
            className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('overwriteCloud')}
          </button>
        )}

        {error.kind === 'quota' && (
          <button
            type="button"
            onClick={() => window.open('https://drive.google.com/settings/storage', '_blank')}
            autoFocus
            className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('manageStorage')}
          </button>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-md p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          {t('done')}
        </button>
      </div>
    </div>
  )
}
