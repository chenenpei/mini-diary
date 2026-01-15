'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { DiaryEditor, EditorHeader } from '@/components/editor'
import { Skeleton } from '@/components/timeline'
import { useEntry, useUpdateEntry, useDeleteEntry } from '@/hooks/useEntries'
import { useImagesByIds, useCreateImages, useDeleteImage } from '@/hooks/useImages'

interface ProcessedImage {
  file: File
  blob: Blob
  thumbnail: Blob
}

export const Route = createFileRoute('/entry/$id')({
  component: EditEntryPage,
})

function EditEntryPage() {
  const navigate = useNavigate()
  const { id } = Route.useParams()

  const { data: entry, isLoading, error } = useEntry(id)
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()
  const createImages = useCreateImages()
  const deleteImage = useDeleteImage()

  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const newImagesRef = useRef<ProcessedImage[]>([])

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

  const handleImagesChange = useCallback((images: ProcessedImage[]) => {
    newImagesRef.current = images
    setIsDirty(true)
  }, [])

  const handleExistingImageRemove = useCallback((imageId: string) => {
    setRemovedImageIds((prev) => [...prev, imageId])
    setIsDirty(true)
  }, [])

  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('有未保存的修改，确定要离开吗？')
      if (!confirmed) return
    }
    navigate({ to: '/' })
  }, [isDirty, navigate])

  const handleSave = useCallback(async () => {
    if (!entry) return

    // 没有内容时直接返回（相当于取消）
    if (!content.trim()) {
      navigate({ to: '/' })
      return
    }

    try {
      // Delete removed images
      for (const imageId of removedImageIds) {
        await deleteImage.mutateAsync({ id: imageId, entryId: entry.id })
      }

      // Save new images
      let newImageIds: string[] = []
      if (newImagesRef.current.length > 0) {
        const imageInputs = newImagesRef.current.map((img) => ({
          entryId: entry.id,
          blob: img.blob,
          thumbnail: img.thumbnail,
        }))
        const savedImages = await createImages.mutateAsync(imageInputs)
        newImageIds = savedImages.map((img) => img.id)
      }

      // Calculate final imageIds
      const remainingImageIds = entry.imageIds.filter((id) => !removedImageIds.includes(id))
      const finalImageIds = [...remainingImageIds, ...newImageIds]

      // Update entry
      await updateEntry.mutateAsync({
        id: entry.id,
        content: content.trim(),
        imageIds: finalImageIds,
      })

      setIsDirty(false)
      navigate({ to: '/' })
    } catch {
      alert('保存失败，请重试')
    }
  }, [entry, content, removedImageIds, updateEntry, createImages, deleteImage, navigate])

  const handleDelete = useCallback(async () => {
    if (!entry) return

    const confirmed = window.confirm('确定要删除这条日记吗？此操作不可撤销。')
    if (!confirmed) return

    try {
      await deleteEntry.mutateAsync({ id: entry.id, date: entry.date })
      navigate({ to: '/' })
    } catch {
      alert('删除失败，请重试')
    }
  }, [entry, deleteEntry, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <EditorHeader title="编辑日记" onBack={handleBack} saveDisabled />
        <main className="mx-auto max-w-[600px] p-4">
          <Skeleton className="h-[300px] w-full sm:h-[400px]" />
        </main>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-background">
        <EditorHeader title="编辑日记" onBack={handleBack} saveDisabled />
        <main className="mx-auto max-w-[600px] p-4">
          <div className="py-16 text-center">
            <p className="text-muted-foreground">日记不存在或加载失败</p>
            <button
              type="button"
              onClick={() => navigate({ to: '/' })}
              className="mt-4 text-primary hover:underline"
            >
              返回首页
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 允许保存空内容（相当于取消）
  const saveDisabled = false

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader
        title="编辑日记"
        isDirty={isDirty}
        onBack={handleBack}
        onSave={handleSave}
        saveDisabled={saveDisabled}
        isSaving={updateEntry.isPending}
      />

      <main className="mx-auto max-w-[600px] p-4">
        <DiaryEditor
          initialContent={entry.content}
          onChange={handleContentChange}
          existingImages={existingImages}
          onImagesChange={handleImagesChange}
          onExistingImageRemove={handleExistingImageRemove}
        />

        {/* Delete button */}
        <div className="mt-8 border-t border-border pt-8">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteEntry.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive py-3 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleteEntry.isPending ? '删除中...' : '删除日记'}</span>
          </button>
        </div>
      </main>
    </div>
  )
}
