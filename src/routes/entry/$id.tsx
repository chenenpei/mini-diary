'use client'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/entry/$id')({
  component: EditEntryPage,
})

function EditEntryPage() {
  const { id } = Route.useParams()

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-medium">编辑日记</h1>
      <p className="text-muted-foreground">ID: {id}</p>
      {/* TODO: 实现编辑器 */}
    </div>
  )
}
