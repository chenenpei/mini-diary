'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DiaryEditor, EditorHeader, EditorToolbar } from '@/components/editor'
import type { DiaryEditorRef } from '@/components/editor/DiaryEditor'
import { Skeleton } from '@/components/timeline'
import { ConfirmDialog, useToast } from '@/components/ui'
import { useEntry, useUpdateEntry } from '@/hooks/useEntries'
import { useCreateImages, useDeleteImage, useImagesByIds } from '@/hooks/useImages'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { revokeImageUrl } from '@/lib/image'

interface ProcessedImage {
  file: File
  blob: Blob
  thumbnail: Blob
}

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  isProcessing: boolean
  error: string | undefined
}

export const Route = createFileRoute('/_timeline/entry/$id')({
  component: EditEntryPage,
})

function EditEntryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('entry')
  const { t: tCommon } = useTranslation('common')
  const { addToast } = useToast()
  const { id } = Route.useParams()

  const { data: entry, isLoading, error } = useEntry(id)
  const updateEntry = useUpdateEntry()
  const createImages = useCreateImages()
  const deleteImage = useDeleteImage()

  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [newImages, setNewImages] = useState<ImageItem[]>([])
  const processedImagesRef = useRef<Map<string, ProcessedImage>>(new Map())
  const editorRef = useRef<DiaryEditorRef>(null)

  const keyboardHeight = useKeyboardHeight()

  // Fetch existing images
  const { data: existingImagesData } = useImagesByIds(entry?.imageIds ?? [])

  // Build existing images with URLs (excluding removed ones)
  const existingImages = useMemo(() => {
    if (!existingImagesData) return []
    return existingImagesData
      .filter((img) => !removedImageIds.includes(img.id))
      .map((img) => ({
        id: img.id,
        url: URL.createObjectURL(img.thumbnail),
      }))
  }, [existingImagesData, removedImageIds])

  // Sync content when entry loads
  useEffect(() => {
    if (entry) {
      setContent(entry.content)
    }
  }, [entry])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsDirty(true)
  }, [])

  // 新图片相关处理
  const handleImagesAdd = useCallback((addedImages: ImageItem[]) => {
    setNewImages((prev) => [...prev, ...addedImages])
    setIsDirty(true)
  }, [])

  const handleImageProcessed = useCallback(
    (imageId: string, result: { file: File; blob: Blob; thumbnail: Blob }) => {
      processedImagesRef.current.set(imageId, {
        file: result.file,
        blob: result.blob,
        thumbnail: result.thumbnail,
      })
      setNewImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, isProcessing: false } : img)),
      )
    },
    [],
  )

  const handleImageError = useCallback((imageId: string, errorMsg: string) => {
    setNewImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isProcessing: false, error: errorMsg } : img,
      ),
    )
  }, [])

  const handleExistingImageRemove = useCallback((imageId: string) => {
    setRemovedImageIds((prev) => [...prev, imageId])
    setIsDirty(true)
  }, [])

  const handleNewImageRemove = useCallback((imageId: string) => {
    setNewImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId)
      if (imageToRemove) {
        revokeImageUrl(imageToRemove.previewUrl)
      }
      return prev.filter((img) => img.id !== imageId)
    })
    processedImagesRef.current.delete(imageId)
  }, [])

  // Cancel confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true)
      return
    }
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [isDirty, navigate])

  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirm(false)
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [navigate])

  const handleCancelCancel = useCallback(() => {
    setShowCancelConfirm(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!entry) return

    // 没有内容时直接返回（相当于取消）
    if (!content.trim()) {
      navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
      return
    }

    try {
      // Delete removed images
      for (const imageId of removedImageIds) {
        await deleteImage.mutateAsync({ id: imageId, entryId: entry.id })
      }

      // Save new images
      let newImageIds: string[] = []
      const validImages = Array.from(processedImagesRef.current.values())
      if (validImages.length > 0) {
        const imageInputs = validImages.map((img) => ({
          entryId: entry.id,
          blob: img.blob,
          thumbnail: img.thumbnail,
        }))
        const savedImages = await createImages.mutateAsync(imageInputs)
        newImageIds = savedImages.map((img) => img.id)
      }

      // Calculate final imageIds
      const remainingImageIds = entry.imageIds.filter((imgId) => !removedImageIds.includes(imgId))
      const finalImageIds = [...remainingImageIds, ...newImageIds]

      // Update entry
      await updateEntry.mutateAsync({
        id: entry.id,
        content: content.trim(),
        imageIds: finalImageIds,
      })

      setIsDirty(false)
      navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
    } catch {
      addToast(t('saveFailed'), 'error')
    }
  }, [
    entry,
    content,
    removedImageIds,
    updateEntry,
    createImages,
    deleteImage,
    navigate,
    t,
    addToast,
  ])

  const imageCount = existingImages.length + newImages.length

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果确认弹窗已打开，让弹窗处理 ESC
      if (showCancelConfirm) return

      // Cmd/Ctrl + Enter: 保存
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!updateEntry.isPending) {
          handleSave()
        }
        return
      }
      // Esc: 取消
      if (e.key === 'Escape') {
        e.preventDefault()
        handleBack()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showCancelConfirm, updateEntry.isPending, handleSave, handleBack])

  if (isLoading) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <EditorHeader title={t('editTitle')} onBack={handleBack} saveDisabled />
        <main className="flex-1 overflow-y-auto px-4 pt-4">
          <Skeleton className="h-[300px] w-full sm:h-[400px]" />
        </main>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <EditorHeader title={t('editTitle')} onBack={handleBack} saveDisabled />
        <main className="flex-1 overflow-y-auto px-4 pt-4">
          <div className="py-16 text-center">
            <p className="text-muted-foreground">{t('notFound')}</p>
            <button
              type="button"
              onClick={() =>
                navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
              }
              className="mt-4 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              {tCommon('backToHome')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 允许保存空内容（相当于取消）
  const saveDisabled = false

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <EditorHeader
        title={t('editTitle')}
        isDirty={isDirty}
        onBack={handleBack}
        onSave={handleSave}
        saveDisabled={saveDisabled}
        isSaving={updateEntry.isPending}
      />

      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-5"
        style={{ paddingBottom: keyboardHeight + 56 }}
      >
        <DiaryEditor
          ref={editorRef}
          initialContent={entry.content}
          onChange={handleContentChange}
          existingImages={existingImages}
          newImages={newImages}
          onExistingImageRemove={handleExistingImageRemove}
          onNewImageRemove={handleNewImageRemove}
        />
      </main>

      <EditorToolbar
        editorRef={editorRef.current?.editorRef ?? { current: null }}
        imageCount={imageCount}
        onImagesAdd={handleImagesAdd}
        onImageProcessed={handleImageProcessed}
        onImageError={handleImageError}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title={t('discardEditTitle')}
        message={t('unsavedChangesMessage')}
        confirmText={tCommon('leave')}
        cancelText={tCommon('continueEditing')}
        destructive
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
      />
    </div>
  )
}
