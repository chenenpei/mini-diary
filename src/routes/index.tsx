'use client'

import { useState, useMemo } from 'react'
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
import { useImagesByIds } from '@/hooks/useImages'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(dateUtils.getToday)
  const { data: entries, isLoading } = useEntriesByDate(currentDate)
  const prefetchEntries = usePrefetchEntriesByDate()

  // Collect all image IDs from entries
  const allImageIds = useMemo(() => {
    if (!entries) return []
    return entries.flatMap((entry) => entry.imageIds)
  }, [entries])

  // Fetch all images for entries
  const { data: images } = useImagesByIds(allImageIds)

  // Build image URLs maps (thumbnails for display, full for lightbox)
  const { thumbnailUrlsMap, fullImageUrlsMap } = useMemo(() => {
    const thumbnailMap = new Map<string, string[]>()
    const fullMap = new Map<string, string[]>()
    if (!entries || !images) return { thumbnailUrlsMap: thumbnailMap, fullImageUrlsMap: fullMap }

    for (const entry of entries) {
      const entryImages = images.filter((img) => entry.imageIds.includes(img.id))
      if (entryImages.length > 0) {
        thumbnailMap.set(entry.id, entryImages.map((img) => URL.createObjectURL(img.thumbnail)))
        fullMap.set(entry.id, entryImages.map((img) => URL.createObjectURL(img.blob)))
      }
    }
    return { thumbnailUrlsMap: thumbnailMap, fullImageUrlsMap: fullMap }
  }, [entries, images])

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
            <DiaryList entries={entries} onCardClick={handleEditEntry} thumbnailUrlsMap={thumbnailUrlsMap} fullImageUrlsMap={fullImageUrlsMap} />
            {entries.length < 3 && <SparseHint />}
          </>
        )}
      </PageLayout>

      <FAB icon={<Plus className="h-6 w-6" />} onClick={handleCreateEntry} />
    </div>
  )
}
