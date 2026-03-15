'use client'

import { CheckCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncSummary } from '@/types'

/** Animated checkmark that draws itself — a satisfying "done" moment */
function AnimatedCheck({ reduced }: { reduced: boolean | null }) {
  if (reduced) {
    return <CheckCircle className="h-12 w-12 text-foreground" />
  }

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className="h-12 w-12 text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Circle */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      />
      {/* Checkmark */}
      <motion.path
        d="M8 12.5l2.5 2.5 5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
      />
    </motion.svg>
  )
}

interface SyncCompleteProps {
  summary: SyncSummary
  onDismiss: () => void
  onRetryFailed?: () => void
}

export function SyncCompleteView({ summary, onDismiss, onRetryFailed }: SyncCompleteProps) {
  const { t } = useTranslation('sync')
  const prefersReducedMotion = useReducedMotion()

  // Auto-dismiss only for no-change case; when data actually synced, let user read the summary
  useEffect(() => {
    if (!summary.noChange) return
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [summary.noChange, onDismiss])

  if (summary.noChange) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: div needed for flex layout
      <div className="flex flex-col items-center gap-6 py-16" role="status">
        <AnimatedCheck reduced={prefersReducedMotion} />

        <motion.h2
          className="text-lg font-semibold tracking-tight text-foreground"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
        >
          {t('alreadyUpToDate')}
        </motion.h2>

        <div className="flex flex-col items-center gap-1">
          <motion.p
            className="text-sm text-muted-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.6 }}
          >
            {t('noSyncNeeded')}
          </motion.p>

          <motion.p
            className="text-sm text-muted-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.65 }}
          >
            {t('duration', { seconds: Math.round(summary.duration / 1000) })}
          </motion.p>
        </div>

        <motion.div
          className="w-full"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.8 }}
        >
          <button
            type="button"
            onClick={onDismiss}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('done')}
          </button>
        </motion.div>
      </div>
    )
  }

  const hasImageStats = summary.imagesUploaded > 0 || summary.imagesDownloaded > 0

  return (
    // biome-ignore lint/a11y/useSemanticElements: div needed for flex layout
    <div className="flex flex-col items-center gap-6 py-16" role="status">
      {/* Success icon with draw animation */}
      <AnimatedCheck reduced={prefersReducedMotion} />

      {/* Title */}
      <motion.h2
        className="text-lg font-semibold tracking-tight text-foreground"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
      >
        {t('syncComplete')}
      </motion.h2>

      {/* Summary lines with staggered animation */}
      <div className="flex flex-col items-center gap-1">
        <motion.p
          className="text-sm text-muted-foreground"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.6 }}
        >
          {t('entriesSynced', { count: summary.entriesSynced })}
        </motion.p>

        {hasImageStats && (
          <motion.p
            className="text-sm text-muted-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.65 }}
          >
            {`↑ ${t('imagesUploaded', { count: summary.imagesUploaded })} · ↓ ${t('imagesDownloaded', { count: summary.imagesDownloaded })}`}
          </motion.p>
        )}

        <motion.p
          className="text-sm text-muted-foreground"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { delay: hasImageStats ? 0.7 : 0.65 }
          }
        >
          {t('duration', { seconds: Math.round(summary.duration / 1000) })}
        </motion.p>
      </div>

      {/* Partial failure warning */}
      {summary.imagesFailed > 0 && onRetryFailed && (
        <motion.div
          className="w-full rounded-sm border border-destructive/30 bg-destructive/5 p-3"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.8 }}
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
              className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
            >
              {t('retryFailed')}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-sm p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
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
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.8 }}
        >
          <button
            type="button"
            onClick={onDismiss}
            // biome-ignore lint/a11y/noAutofocus: Focus management for state transition UX
            autoFocus
            className="w-full rounded-sm bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
          >
            {t('done')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
