'use client'

import { useState, useCallback, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DiaryEditor, EditorHeader } from '@/components/editor'
import { useCreateEntry, useUpdateEntry } from '@/hooks/useEntries'
import { useCreateImages } from '@/hooks/useImages'
import { dateUtils } from '@/components/timeline'

interface ProcessedImage {
  file: File
  blob: Blob
  thumbnail: Blob
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
  const imagesRef = useRef<ProcessedImage[]>([])

  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const createImages = useCreateImages()

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsDirty(true)
  }, [])

  const handleImagesChange = useCallback((images: ProcessedImage[]) => {
    imagesRef.current = images
    setIsDirty(true)
  }, [])

  const handleBack = useCallback(() => {
    if (isDirty && content.trim()) {
      // TODO: 添加确认对话框
      const confirmed = window.confirm('有未保存的内容，确定要离开吗？')
      if (!confirmed) return
    }
    navigate({ to: '/' })
  }, [isDirty, content, navigate])

  const handleSave = useCallback(async () => {
    if (!content.trim()) return

    try {
      // Create entry first
      const entry = await createEntry.mutateAsync({
        content: content.trim(),
        date: entryDate,
      })

      // Save images if any
      if (imagesRef.current.length > 0) {
        const imageInputs = imagesRef.current.map((img) => ({
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

      navigate({ to: '/' })
    } catch {
      alert('保存失败，请重试')
    }
  }, [content, entryDate, createEntry, updateEntry, createImages, navigate])

  const saveDisabled = !content.trim()

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader
        title="新建日记"
        isDirty={isDirty}
        onBack={handleBack}
        onSave={handleSave}
        saveDisabled={saveDisabled}
        isSaving={createEntry.isPending}
      />

      <main className="mx-auto max-w-[600px] p-4">
        <DiaryEditor
          initialContent=""
          onChange={handleContentChange}
          onImagesChange={handleImagesChange}
          autoFocus
        />
      </main>
    </div>
  )
}
