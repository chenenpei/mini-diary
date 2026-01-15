import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <h1 className="text-2xl font-medium text-black">MiniDiary</h1>
    </div>
  )
}
