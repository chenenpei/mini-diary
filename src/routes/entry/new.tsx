'use client'

import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DiaryEditor, EditorHeader } from '@/components/editor'
import { useCreateEntry } from '@/hooks/useEntries'
import { dateUtils } from '@/components/timeline'

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

  const createEntry = useCreateEntry()

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
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
      await createEntry.mutateAsync({
        content: content.trim(),
        date: entryDate,
      })
      navigate({ to: '/' })
    } catch {
      // TODO: 添加 Toast 提示
      alert('保存失败，请重试')
    }
  }, [content, entryDate, createEntry, navigate])

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
          autoFocus
        />
      </main>
    </div>
  )
}
