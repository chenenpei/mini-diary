'use client'

import { CheckCircle, Circle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncProgress } from '@/types'

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
  const seenPhasesRef = useRef<string[]>([])

  // Track phases as they appear (skip meta-phases)
  const currentPhaseName = progress.currentPhase.phase
  if (
    currentPhaseName !== 'retrying' &&
    currentPhaseName !== 'done' &&
    currentPhaseName !== 'error'
  ) {
    const seen = seenPhasesRef.current
    if (seen.length === 0 || seen[seen.length - 1] !== currentPhaseName) {
      seenPhasesRef.current = [...seen, currentPhaseName]
    }
  }

  const seenPhases = seenPhasesRef.current
  const pendingCount = Math.max(0, progress.totalPhases - seenPhases.length)

  function getPhaseLabel(phase: string): string {
    const key = PHASE_I18N_KEYS[phase]
    if (!key) return phase

    if (phase === 'downloading-images' && progress.currentPhase.phase === 'downloading-images') {
      return t('downloadingImages', {
        current: progress.currentPhase.current,
        total: progress.currentPhase.total,
      })
    }
    if (phase === 'uploading-images' && progress.currentPhase.phase === 'uploading-images') {
      return t('uploadingImages', {
        current: progress.currentPhase.current,
        total: progress.currentPhase.total,
      })
    }

    return t(key)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Phase steps */}
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        {seenPhases.map((phase, index) => {
          const isActive = index === seenPhases.length - 1
          const isCompleted = !isActive

          return (
            <motion.div
              key={phase}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : prefersReducedMotion ? (
                <Circle className="h-4 w-4 shrink-0 fill-foreground text-foreground" />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                >
                  <Circle className="h-4 w-4 shrink-0 text-foreground" />
                </motion.div>
              )}
              <span className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {getPhaseLabel(phase)}
              </span>
            </motion.div>
          )
        })}

        {/* Retry indicator */}
        {progress.currentPhase.phase === 'retrying' && (
          <RetryIndicator nextRetryIn={progress.currentPhase.nextRetryIn} />
        )}

        {/* Pending steps */}
        {Array.from({ length: pendingCount }).map((_, i) => (
          <div key={`pending-${String(i)}`} className="flex items-center gap-3">
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            <span className="text-sm text-muted-foreground/30">...</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface"
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
        <span className="text-right text-xs text-muted-foreground">{progress.percent}%</span>
      </div>

      {/* Cancel button */}
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('cancel')}
        className="w-full rounded-md border border-border p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
      >
        {t('cancel')}
      </button>
    </div>
  )
}

// ─── Retry Indicator ───

function RetryIndicator({ nextRetryIn }: { nextRetryIn: number }) {
  const { t } = useTranslation('sync')
  const [countdown, setCountdown] = useState(Math.ceil(nextRetryIn / 1000))

  useEffect(() => {
    setCountdown(Math.ceil(nextRetryIn / 1000))
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [nextRetryIn])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="ml-7 text-xs text-muted-foreground"
    >
      {t('retrying', { seconds: countdown })}
    </motion.div>
  )
}
