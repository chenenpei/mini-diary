'use client'

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { TopBar, FAB, PageLayout } from '@/components/layout'
import {
  DateNavigator,
  DiaryList,
  DiaryListSkeleton,
  EmptyState,
  SparseHint,
  dateUtils,
} from '@/components/timeline'
import { useEntriesByDate, usePrefetchEntriesByDate } from '@/hooks/useEntries'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(dateUtils.getToday)
  const { data: entries, isLoading } = useEntriesByDate(currentDate)
  const prefetchEntries = usePrefetchEntriesByDate()

  const isToday = dateUtils.isToday(currentDate)

  const handlePreviousDay = () => {
    const prevDate = dateUtils.getPreviousDay(currentDate)
    setCurrentDate(prevDate)
    // Prefetch the day before
    prefetchEntries(dateUtils.getPreviousDay(prevDate))
  }

  const handleNextDay = () => {
    if (!isToday) {
      const nextDate = dateUtils.getNextDay(currentDate)
      setCurrentDate(nextDate)
      // Prefetch the day after if not future
      if (!dateUtils.isFuture(dateUtils.getNextDay(nextDate))) {
        prefetchEntries(dateUtils.getNextDay(nextDate))
      }
    }
  }

  const handleCreateEntry = () => {
    navigate({ to: '/entry/new', search: { date: currentDate } })
  }

  const handleEditEntry = (entry: { id: string }) => {
    navigate({ to: '/entry/$id', params: { id: entry.id } })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar onMenuClick={() => {}} onSearchClick={() => {}}>
        <DateNavigator
          date={currentDate}
          onPrevious={handlePreviousDay}
          onNext={handleNextDay}
          disableNext={isToday}
        />
      </TopBar>

      <PageLayout>
        {isLoading ? (
          <DiaryListSkeleton />
        ) : !entries || entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DiaryList entries={entries} onCardClick={handleEditEntry} />
            {entries.length < 3 && <SparseHint />}
          </>
        )}
      </PageLayout>

      <FAB icon={<Plus className="h-6 w-6" />} onClick={handleCreateEntry} />
    </div>
  )
}
