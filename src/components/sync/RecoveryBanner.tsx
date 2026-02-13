'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RecoveryInfo } from '@/lib/sync/recovery'

interface RecoveryBannerProps {
  info: RecoveryInfo
  onRestore: () => void
  onDismiss: () => void
}

export function RecoveryBanner({ info, onRestore, onDismiss }: RecoveryBannerProps) {
  const { t } = useTranslation('sync')

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <AlertTriangle className="h-12 w-12 text-yellow-500" />

      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">{t('recoveryTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('recoveryMessage')}</p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onRestore}
          // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
          autoFocus
          className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          {t('recoveryRestore', { count: info.entryCount })}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-md p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
        >
          {t('recoveryDismiss')}
        </button>
      </div>
    </div>
  )
}
