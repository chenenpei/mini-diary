'use client'

import { useState, useCallback, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DiaryEditor, EditorHeader, EditorToolbar } from '@/components/editor'
import type { DiaryEditorRef } from '@/components/editor/DiaryEditor'
import { ConfirmDialog } from '@/components/ui'
import { useCreateEntry, useUpdateEntry } from '@/hooks/useEntries'
import { useCreateImages } from '@/hooks/useImages'
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

export const Route = createFileRoute('/entry/new')({
  validateSearch: (search: Record<string, unknown>): NewEntrySearch => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: NewEntryPage,
})

function NewEntryPage() {
  const navigate = useNavigate()
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

      navigate({ to: '/', search: { date: entryDate, scrollTo: entry.id } })
    } catch {
      alert('保存失败，请重试')
    }
  }, [content, entryDate, createEntry, updateEntry, createImages, navigate])

  // 新建日记必须有内容才能保存
  const saveDisabled = !content.trim()
  const imageCount = images.length

  return (
    <div className="flex h-dvh flex-col bg-background">
      <EditorHeader
        title="新建日记"
        isDirty={isDirty}
        onBack={handleBack}
        onSave={handleSave}
        saveDisabled={saveDisabled}
        isSaving={createEntry.isPending}
      />

      <main
        className="flex min-h-0 flex-1 flex-col px-4 pt-4"
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
        textareaRef={editorRef.current?.textareaRef ?? { current: null }}
        setContent={editorRef.current?.setContent}
        imageCount={imageCount}
        onImagesAdd={handleImagesAdd}
        onImageProcessed={handleImageProcessed}
        onImageError={handleImageError}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="放弃新建"
        message="有未保存的内容，确定要离开吗？"
        confirmText="离开"
        cancelText="继续编辑"
        destructive
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
      />
    </div>
  )
}
