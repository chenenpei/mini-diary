'use client'

import { useState, useMemo, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
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
import { useEntriesByDate, usePrefetchEntriesByDate, useDeleteEntry } from '@/hooks/useEntries'
import { useImagesByIds, useDeleteImagesByEntry } from '@/hooks/useImages'
import { useTheme, useStorageEstimate } from '@/hooks'
import { downloadExport, importData, clearAllData } from '@/lib/dataTransfer'
import type { DiaryEntry } from '@/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [currentDate, setCurrentDate] = useState(dateUtils.getToday)
  const { data: entries, isLoading } = useEntriesByDate(currentDate)
  const prefetchEntries = usePrefetchEntriesByDate()

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
      addToast('数据导出成功', 'success')
    } catch {
      addToast('导出失败，请重试', 'error')
    } finally {
      setIsExporting(false)
    }
  }, [addToast])

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
        addToast(`导入成功：${result.entriesCount} 条日记，${result.imagesCount} 张图片`, 'success')
      } catch (error) {
        addToast(error instanceof Error ? error.message : '导入失败', 'error')
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }, [queryClient, addToast])

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
    addToast('已清空所有数据', 'success')
  }, [queryClient, addToast])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar onMenuClick={handleMenuClick} onSearchClick={handleSearchClick}>
        <DateNavigator
          date={currentDate}
          onPrevious={handlePreviousDay}
          onNext={handleNextDay}
          onDateClick={handleDateClick}
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
            <DiaryList
                entries={entries}
                onEdit={handleEditEntry}
                onDelete={handleDeleteClick}
                thumbnailUrlsMap={thumbnailUrlsMap}
                fullImageUrlsMap={fullImageUrlsMap}
              />
            {entries.length < 3 && <SparseHint />}
          </>
        )}
      </PageLayout>

      <FAB icon={<Plus className="h-6 w-6" />} onClick={handleCreateEntry} />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="删除日记"
        message="确定要删除这条日记吗？此操作无法撤销。"
        confirmText="删除"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deleteEntry.isPending || deleteImages.isPending}
      />

      <DatePicker
        isOpen={showDatePicker}
        selectedDate={currentDate}
        onSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        themeMode={themeMode}
        onThemeChange={setTheme}
        storageUsed={storageData?.usage ?? 0}
        storageQuota={storageData?.quota ?? 0}
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
