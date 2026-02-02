'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSwipeable } from 'react-swipeable'
import { TopBar, FAB, PageLayout, Drawer } from '@/components/layout'
import {
  DateNavigator,
  DiaryList,
  DiaryListSkeleton,
  EmptyState,
  SparseHint,
  dateUtils,
} from '@/components/timeline'
import { ConfirmDialog, DatePicker, ClearDataDialog, useToast } from '@/components/ui'
import { useEntriesByDate, usePrefetchEntriesByDate, useDeleteEntry, useDistinctDates } from '@/hooks/useEntries'
import { useImagesByIds, useDeleteImagesByEntry } from '@/hooks/useImages'
import { useTheme, useStorageEstimate, useTimelineAnimationPolicy } from '@/hooks'
import { downloadExport, importData, clearAllData } from '@/lib/dataTransfer'
import type { DiaryEntry } from '@/types'

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === 'string' ? search.date : undefined,
    scrollTo: typeof search.scrollTo === 'string' ? search.scrollTo : undefined,
  }),
})

function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { t: tData } = useTranslation('data')
  const { t: tEntry } = useTranslation('entry')
  const { date: urlDate, scrollTo } = Route.useSearch()

  // 初始化时使用 URL 中的日期，否则使用今天
  const [currentDate, setCurrentDate] = useState(() => urlDate ?? dateUtils.getToday())
  const { data: entries, isLoading } = useEntriesByDate(currentDate)
  const prefetchEntries = usePrefetchEntriesByDate()
  const isToday = dateUtils.isToday(currentDate)
  const { shouldAnimatePage, shouldAnimateEntries } = useTimelineAnimationPolicy(currentDate, scrollTo)

  // URL 日期变化时更新状态
  useEffect(() => {
    if (urlDate && urlDate !== currentDate) {
      setCurrentDate(urlDate)
    }
  }, [urlDate, currentDate])

  // 获取有日记的日期列表
  const { data: distinctDates } = useDistinctDates()
  const datesWithEntriesSet = useMemo(
    () => new Set(distinctDates ?? []),
    [distinctDates]
  )

  // 滚动完成后清除 URL 参数
  const handleScrollComplete = useCallback(() => {
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined }, replace: true })
  }, [navigate])

  // Theme
  const { themeMode, setTheme } = useTheme()

  // Storage
  const { data: storageData } = useStorageEstimate()

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

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

  const handlePreviousDay = useCallback(() => {
    const prevDate = dateUtils.getPreviousDay(currentDate)
    setCurrentDate(prevDate)
    // Prefetch the day before
    prefetchEntries(dateUtils.getPreviousDay(prevDate))
  }, [currentDate, prefetchEntries])

  const handleNextDay = useCallback(() => {
    if (!isToday) {
      const nextDate = dateUtils.getNextDay(currentDate)
      setCurrentDate(nextDate)
      // Prefetch the day after if not future
      if (!dateUtils.isFuture(dateUtils.getNextDay(nextDate))) {
        prefetchEntries(dateUtils.getNextDay(nextDate))
      }
    }
  }, [isToday, currentDate, prefetchEntries])

  // 移动端滑动切换日期
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isToday) handleNextDay()
    },
    onSwipedRight: handlePreviousDay,
    delta: 80,
    swipeDuration: 300,
    trackMouse: false,
    preventScrollOnSwipe: false,
  })

  const handleCreateEntry = () => {
    navigate({ to: '/entry/new', search: { date: currentDate } })
  }

  const handleSearchClick = () => {
    navigate({ to: '/search' })
  }

  const handleEditEntry = (entry: DiaryEntry) => {
    navigate({ to: '/entry/$id', params: { id: entry.id } })
  }

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleDateClick = useCallback(() => {
    setShowDatePicker(true)
  }, [])

  const handleDateSelect = useCallback((date: string) => {
    setCurrentDate(date)
  }, [])

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DiaryEntry | null>(null)
  const deleteEntry = useDeleteEntry()
  const deleteImages = useDeleteImagesByEntry()

  const handleDeleteClick = useCallback((entry: DiaryEntry) => {
    setDeleteTarget(entry)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    // Delete images first
    if (deleteTarget.imageIds.length > 0) {
      await deleteImages.mutateAsync(deleteTarget.id)
    }
    // Delete entry
    await deleteEntry.mutateAsync({ id: deleteTarget.id, date: deleteTarget.date })
    setDeleteTarget(null)
  }, [deleteTarget, deleteEntry, deleteImages])

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  // Drawer handlers
  const handleMenuClick = useCallback(() => {
    setIsDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await downloadExport()
      addToast(tData('exportSuccess'), 'success')
    } catch {
      addToast(tData('exportFailed'), 'error')
    } finally {
      setIsExporting(false)
    }
  }, [addToast, tData])

  const handleImportClick = useCallback(() => {
    // Create and trigger file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const result = await importData(file)
        await queryClient.invalidateQueries({ queryKey: ['entries'] })
        await queryClient.invalidateQueries({ queryKey: ['images'] })
        addToast(tData('importSuccess', { entryCount: result.entriesCount, imageCount: result.imagesCount }), 'success')
      } catch (error) {
        addToast(error instanceof Error ? error.message : tData('importFailed'), 'error')
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }, [queryClient, addToast, tData])

  const handleClearData = useCallback(() => {
    setShowClearDialog(true)
    setIsDrawerOpen(false)
  }, [])

  const handleClearConfirm = useCallback(async () => {
    await clearAllData()
    await queryClient.invalidateQueries({ queryKey: ['entries'] })
    await queryClient.invalidateQueries({ queryKey: ['images'] })
    await queryClient.invalidateQueries({ queryKey: ['storage'] })
    setShowClearDialog(false)
    addToast(tData('clearSuccess'), 'success')
  }, [queryClient, addToast, tData])

  // 键盘快捷键导航日期
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框、文本区域和可编辑元素内的按键
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 忽略弹窗打开时的按键
      if (isDrawerOpen || showDatePicker || deleteTarget !== null || showClearDialog) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlePreviousDay()
          break
        case 'ArrowRight':
          if (!isToday) {
            e.preventDefault()
            handleNextDay()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, showDatePicker, deleteTarget, showClearDialog, isToday, handlePreviousDay, handleNextDay])

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-background" {...swipeHandlers}>
      <TopBar onMenuClick={handleMenuClick} onSearchClick={handleSearchClick}>
        <DateNavigator
          date={currentDate}
          onPrevious={handlePreviousDay}
          onNext={handleNextDay}
          onDateClick={handleDateClick}
          disableNext={isToday}
        />
      </TopBar>

      <PageLayout animate={shouldAnimatePage}>
        {isLoading ? (
          <DiaryListSkeleton />
        ) : !entries || entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DiaryList
              entries={entries}
              animateEntries={shouldAnimateEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteClick}
              thumbnailUrlsMap={thumbnailUrlsMap}
              fullImageUrlsMap={fullImageUrlsMap}
              scrollToId={scrollTo}
              onScrollComplete={handleScrollComplete}
            />
            {entries.length < 3 && <SparseHint />}
          </>
        )}
      </PageLayout>

      <FAB icon={<Plus className="h-6 w-6" />} onClick={handleCreateEntry} />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={tEntry('deleteTitle')}
        message={tEntry('deleteMessage')}
        confirmText={tEntry('deleteTitle')}
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deleteEntry.isPending || deleteImages.isPending}
      />

      <DatePicker
        isOpen={showDatePicker}
        selectedDate={currentDate}
        datesWithEntries={datesWithEntriesSet}
        onSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        themeMode={themeMode}
        onThemeChange={setTheme}
        storageUsed={storageData?.usage ?? 0}
        onExport={handleExport}
        onImport={handleImportClick}
        onClearData={handleClearData}
        isExporting={isExporting}
        isImporting={isImporting}
      />

      <ClearDataDialog
        isOpen={showClearDialog}
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  )
}
