'use client'

import { CheckCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncSummary } from '@/types'

interface SyncCompleteProps {
  summary: SyncSummary
  onDismiss: () => void
  onRetryFailed?: () => void
}

export function SyncCompleteView({ summary, onDismiss, onRetryFailed }: SyncCompleteProps) {
  const { t } = useTranslation('sync')
  const prefersReducedMotion = useReducedMotion()

  // Auto-return after 3s when no image failures
  useEffect(() => {
    if (summary.imagesFailed > 0) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [summary.imagesFailed, onDismiss])

  const hasImageStats = summary.imagesUploaded > 0 || summary.imagesDownloaded > 0

  return (
    // biome-ignore lint/a11y/useSemanticElements: div needed for flex layout
    <div className="flex flex-1 flex-col items-center gap-6" role="status">
      {/* Success icon with spring bounce */}
      <motion.div
        initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.2 }
            : { type: 'spring', duration: 0.5, bounce: 0.5 }
        }
      >
        <CheckCircle className="h-12 w-12 text-foreground" />
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-lg font-semibold text-foreground"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
      >
        {t('syncComplete')}
      </motion.h2>

      {/* Summary lines with staggered animation */}
      <div className="flex flex-col items-center gap-1">
        <motion.p
          className="text-sm text-muted-foreground"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
        >
          {t('entriesSynced', { count: summary.entriesSynced })}
        </motion.p>

        {hasImageStats && (
          <motion.p
            className="text-sm text-muted-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.35 }}
          >
            {`↑ ${t('imagesUploaded', { count: summary.imagesUploaded })} · ↓ ${t('imagesDownloaded', { count: summary.imagesDownloaded })}`}
          </motion.p>
        )}

        <motion.p
          className="text-sm text-muted-foreground"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: hasImageStats ? 0.4 : 0.35 }}
        >
          {t('duration', { seconds: Math.round(summary.duration / 1000) })}
        </motion.p>
      </div>

      {/* Partial failure warning */}
      {summary.imagesFailed > 0 && onRetryFailed && (
        <motion.div
          className="w-full rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
        >
          <p className="text-sm font-medium text-foreground">
            {t('imagesFailed', { count: summary.imagesFailed })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('dataAlreadySynced')}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={onRetryFailed}
              // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
              autoFocus
              className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
            >
              {t('retryFailed')}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-md p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
            >
              {t('ignoreFailed')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Done button (only when no failures) */}
      {summary.imagesFailed === 0 && (
        <motion.div
          className="w-full"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
        >
          <button
            type="button"
            onClick={onDismiss}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('done')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
