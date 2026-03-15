'use client'

import { CheckCircle, Circle, XCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { SyncPhase, SyncProgress } from '@/types'

type SyncI18nKey =
  | 'preparing'
  | 'checking'
  | 'downloadingEntries'
  | 'downloadingImages'
  | 'merging'
  | 'uploadingEntries'
  | 'uploadingImages'
  | 'verifying'
  | 'cleanup'

const PHASE_I18N_KEYS: Record<string, SyncI18nKey> = {
  preparing: 'preparing',
  checking: 'checking',
  'downloading-entries': 'downloadingEntries',
  'downloading-images': 'downloadingImages',
  merging: 'merging',
  'uploading-entries': 'uploadingEntries',
  'uploading-images': 'uploadingImages',
  verifying: 'verifying',
  cleanup: 'cleanup',
}

interface SyncProgressProps {
  progress: SyncProgress
  onCancel: () => void
}

export function SyncProgressView({ progress, onCancel }: SyncProgressProps) {
  const { t } = useTranslation('sync')
  const prefersReducedMotion = useReducedMotion()
  const [seenPhases, setSeenPhases] = useState<string[]>([])

  // Track phases as they appear (skip meta-phases)
  useEffect(() => {
    const currentPhaseName = progress.currentPhase.phase
    if (
      currentPhaseName !== 'retrying' &&
      currentPhaseName !== 'done' &&
      currentPhaseName !== 'error'
    ) {
      setSeenPhases((prev) => {
        if (prev.length === 0 || prev[prev.length - 1] !== currentPhaseName) {
          return [...prev, currentPhaseName]
        }
        return prev
      })
    }
  }, [progress.currentPhase.phase])

  function getPhaseLabel(phase: string): string {
    const key = PHASE_I18N_KEYS[phase]
    if (!key) return phase

    const label = t(key)

    if (
      phase === progress.currentPhase.phase &&
      'current' in progress.currentPhase &&
      'total' in progress.currentPhase
    ) {
      return `${label} (${progress.currentPhase.current}/${progress.currentPhase.total})`
    }

    return label
  }

  return (
    <div className="flex flex-col gap-6 py-16">
      {/* Phase steps */}
      {/* biome-ignore lint/a11y/useSemanticElements: div needed for flex layout */}
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        {seenPhases.map((phase, index) => {
          const isActive = index === seenPhases.length - 1
          const isCompleted = !isActive
          const isRetrying = isActive && progress.currentPhase.phase === 'retrying'

          return (
            <motion.div
              key={phase}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : isRetrying ? (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              ) : prefersReducedMotion ? (
                <Circle className="h-4 w-4 shrink-0 fill-foreground text-foreground" />
              ) : (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: 'easeInOut' }}
                >
                  <Circle className="h-4 w-4 shrink-0 fill-foreground text-foreground" />
                </motion.div>
              )}
              <span
                className={cn('text-sm', isRetrying ? 'text-destructive' : isActive ? 'text-foreground' : 'text-muted-foreground')}
              >
                {getPhaseLabel(phase)}
              </span>
            </motion.div>
          )
        })}

        {/* Retry indicator */}
        {progress.currentPhase.phase === 'retrying' && (
          <RetryIndicator phase={progress.currentPhase} />
        )}

      </div>

      {/* Progress bar with phase counter */}
      <div className="flex flex-col gap-1.5">
        <div
          className="h-2 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-foreground transition-[transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              transform: `scaleX(${progress.percent / 100})`,
              transformOrigin: 'left',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('phaseProgress', {
              current: seenPhases.length,
              total: progress.totalPhases,
            })}
          </span>
          <span>{progress.percent}%</span>
        </div>
      </div>

      {/* Cancel button */}
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('cancel')}
        className="w-full rounded-sm border border-border p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('cancel')}
      </button>
    </div>
  )
}

// ─── Retry Indicator ───

type RetryingPhase = Extract<SyncPhase, { phase: 'retrying' }>

function RetryIndicator({ phase }: { phase: RetryingPhase }) {
  const { t } = useTranslation('sync')
  const [countdown, setCountdown] = useState(Math.ceil(phase.nextRetryIn / 1000))

  useEffect(() => {
    setCountdown(Math.ceil(phase.nextRetryIn / 1000))
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase.nextRetryIn])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="ml-7 flex flex-col gap-0.5 text-xs text-muted-foreground"
    >
      <span>{t('retryError')}</span>
      <span>
        {t('retryCountdown', {
          seconds: countdown,
          attempt: phase.attempt,
          max: phase.maxAttempts,
        })}
      </span>
    </motion.div>
  )
}
