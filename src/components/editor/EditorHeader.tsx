'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface EditorHeaderProps {
  /** Page title */
  title: string
  /** Has unsaved changes */
  isDirty?: boolean
  /** Back button click handler */
  onBack?: () => void
  /** Save button click handler */
  onSave?: () => void
  /** Save button disabled state */
  saveDisabled?: boolean
  /** Is saving */
  isSaving?: boolean
}

/**
 * EditorHeader - 编辑器顶部栏
 */
export function EditorHeader({
  title,
  isDirty = false,
  onBack,
  onSave,
  saveDisabled = false,
  isSaving = false,
}: EditorHeaderProps) {
  const { t } = useTranslation('editor')

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-foreground transition-colors hover:text-foreground/70 active:opacity-60"
      >
        {t('cancel')}
      </button>

      {/* Title with dirty indicator */}
      <div className="flex items-center gap-2">
        <span className="text-base font-medium text-foreground">{title}</span>
        {isDirty && (
          <output className="sr-only" aria-live="polite">
            {t('unsavedChanges')}
          </output>
        )}
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled || isSaving}
        className={cn(
          'rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition-colors',
          saveDisabled || isSaving
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-primary/90 active:opacity-80',
        )}
      >
        {isSaving ? t('saving') : t('save')}
      </button>
    </header>
  )
}
