'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/sync')({
  component: SyncPage,
})

function SyncPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('sync')
  const { t: tCommon } = useTranslation('common')

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
        {/* Placeholder — will be replaced by state-driven content in Tasks 3-6 */}
      </main>
    </div>
  )
}
