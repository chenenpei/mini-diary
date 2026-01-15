'use client'

import { createFileRoute } from '@tanstack/react-router'

interface NewEntrySearch {
  date: string | undefined
}

export const Route = createFileRoute('/entry/new')({
  validateSearch: (search: Record<string, unknown>): NewEntrySearch => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: NewEntryPage,
})

function NewEntryPage() {
  const { date } = Route.useSearch()

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-medium">新建日记</h1>
      <p className="text-muted-foreground">日期: {date}</p>
      {/* TODO: 实现编辑器 */}
    </div>
  )
}
