'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DiaryEditor, EditorHeader, EditorToolbar } from '@/components/editor'
import type { DiaryEditorRef } from '@/components/editor/DiaryEditor'
import { ConfirmDialog } from '@/components/ui'
import { useCreateEntry, useUpdateEntry } from '@/hooks/useEntries'
import { useCreateImages } from '@/hooks/useImages'
import { useToast } from '@/components/ui'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { dateUtils } from '@/components/timeline'
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

interface NewEntrySearch {
  date: string | undefined
}

export const Route = createFileRoute('/_timeline/entry/new')({
  validateSearch: (search: Record<string, unknown>): NewEntrySearch => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: NewEntryPage,
})

function NewEntryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('entry')
  const { t: tCommon } = useTranslation('common')
  const { addToast } = useToast()
  const { date } = Route.useSearch()
  const entryDate = date ?? dateUtils.getToday()

  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])
  const processedImagesRef = useRef<Map<string, ProcessedImage>>(new Map())
  const editorRef = useRef<DiaryEditorRef>(null)

  const keyboardHeight = useKeyboardHeight()

  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const createImages = useCreateImages()

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsDirty(true)
  }, [])

  // 图片相关处理
  const handleImagesAdd = useCallback((newImages: ImageItem[]) => {
    setImages((prev) => [...prev, ...newImages])
    setIsDirty(true)
  }, [])

  const handleImageProcessed = useCallback(
    (id: string, result: { file: File; blob: Blob; thumbnail: Blob }) => {
      processedImagesRef.current.set(id, {
        file: result.file,
        blob: result.blob,
        thumbnail: result.thumbnail,
      })
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, isProcessing: false } : img))
      )
    },
    []
  )

  const handleImageError = useCallback((id: string, error: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, isProcessing: false, error } : img))
    )
  }, [])

  const handleNewImageRemove = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        revokeImageUrl(imageToRemove.previewUrl)
      }
      return prev.filter((img) => img.id !== id)
    })
    processedImagesRef.current.delete(id)
  }, [])

  // Cancel confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleBack = useCallback(() => {
    if (isDirty && content.trim()) {
      setShowCancelConfirm(true)
      return
    }
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [isDirty, content, navigate])

  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirm(false)
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [navigate])

  const handleCancelCancel = useCallback(() => {
    setShowCancelConfirm(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!content.trim()) return

    try {
      // Create entry first
      const entry = await createEntry.mutateAsync({
        content: content.trim(),
        date: entryDate,
      })

      // Save images if any
      const validImages = Array.from(processedImagesRef.current.values())
      if (validImages.length > 0) {
        const imageInputs = validImages.map((img) => ({
          entryId: entry.id,
          blob: img.blob,
          thumbnail: img.thumbnail,
        }))
        const savedImages = await createImages.mutateAsync(imageInputs)

        // Update entry with image IDs
        await updateEntry.mutateAsync({
          id: entry.id,
          imageIds: savedImages.map((img) => img.id),
        })
      }

      navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
    } catch {
      addToast(t('saveFailed'), 'error')
    }
  }, [content, entryDate, createEntry, updateEntry, createImages, navigate, t, addToast])

  // 新建日记必须有内容才能保存
  const saveDisabled = !content.trim()
  const imageCount = images.length

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果确认弹窗已打开，让弹窗处理 ESC
      if (showCancelConfirm) return

      // Cmd/Ctrl + Enter: 保存
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!saveDisabled && !createEntry.isPending) {
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
  }, [showCancelConfirm, saveDisabled, createEntry.isPending, handleSave, handleBack])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <EditorHeader
        title={t('createTitle')}
        isDirty={isDirty}
        onBack={handleBack}
        onSave={handleSave}
        saveDisabled={saveDisabled}
        isSaving={createEntry.isPending}
      />

      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-5"
        style={{ paddingBottom: keyboardHeight + 56 }}
      >
        <DiaryEditor
          ref={editorRef}
          initialContent=""
          onChange={handleContentChange}
          newImages={images}
          onNewImageRemove={handleNewImageRemove}
          autoFocus
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
        title={t('discardCreateTitle')}
        message={t('unsavedMessage')}
        confirmText={tCommon('leave')}
        cancelText={tCommon('continueEditing')}
        destructive
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
      />
    </div>
  )
}
