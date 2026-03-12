'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { ConflictInfo } from '@/types'

interface ConflictDialogProps {
  isOpen: boolean
  info: ConflictInfo
  onResolve: (choice: 'merge' | 'pull' | 'push' | 'cancel') => void
}

export function ConflictDialog({ isOpen, info, onResolve }: ConflictDialogProps) {
  const { t } = useTranslation('sync')
  const prefersReducedMotion = useReducedMotion()

  const handleCancel = useCallback(() => {
    onResolve('cancel')
  }, [onResolve])

  // Focus trap
  const dialogRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    autoFocus: true,
    restoreFocus: true,
  })

  // ESC key handler (capture phase)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, handleCancel])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
        >
          <motion.div
            ref={dialogRef}
            className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl"
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="conflict-dialog-title"
            aria-describedby="conflict-dialog-desc"
          >
            {/* Title */}
            <h2 id="conflict-dialog-title" className="text-lg font-semibold text-foreground">
              {t('conflictTitle')}
            </h2>

            {/* Change summary */}
            <div id="conflict-dialog-desc" className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('conflictLocal', {
                  added: info.localChanges.added,
                  modified: info.localChanges.modified,
                  deleted: info.localChanges.deleted,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('conflictCloud', {
                  added: info.cloudChanges.added,
                  modified: info.cloudChanges.modified,
                  deleted: info.cloudChanges.deleted,
                })}
              </p>
            </div>

            {/* Action buttons (stacked, full-width) */}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onResolve('merge')}
                className="w-full rounded-md bg-foreground p-3 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                {t('conflictMergeRecommended')}
              </button>
              <button
                type="button"
                onClick={() => onResolve('pull')}
                className="w-full rounded-md border border-border p-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                {t('conflictPull')}
              </button>
              <button
                type="button"
                onClick={() => onResolve('push')}
                className="w-full rounded-md border border-border p-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
              >
                {t('conflictPush')}
              </button>
            </div>

            {/* Cancel text button */}
            <button
              type="button"
              onClick={handleCancel}
              className="mt-2 w-full rounded-md p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80"
            >
              {t('cancel')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
