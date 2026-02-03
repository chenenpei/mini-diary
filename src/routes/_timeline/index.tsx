'use client'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_timeline/')({
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === 'string' ? search.date : undefined,
    scrollTo: typeof search.scrollTo === 'string' ? search.scrollTo : undefined,
  }),
  component: () => null,
})
