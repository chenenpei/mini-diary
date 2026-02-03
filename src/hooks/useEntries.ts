import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entriesRepository } from '@/lib/repositories'
import type { CreateEntryInput, DateRangeQuery, UpdateEntryInput } from '@/types'

// Query keys factory
export const entriesKeys = {
  all: ['entries'] as const,
  lists: () => [...entriesKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...entriesKeys.lists(), filters] as const,
  details: () => [...entriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...entriesKeys.details(), id] as const,
  byDate: (date: string) => [...entriesKeys.all, 'date', date] as const,
  byDateRange: (range: DateRangeQuery) => [...entriesKeys.all, 'range', range] as const,
  search: (query: string) => [...entriesKeys.all, 'search', query] as const,
}

/**
 * Hook to get a single entry by ID
 */
export function useEntry(id: string) {
  return useQuery({
    queryKey: entriesKeys.detail(id),
    queryFn: () => entriesRepository.getById(id),
    enabled: Boolean(id),
  })
}

/**
 * Hook to get all entries for a specific date
 */
export function useEntriesByDate(date: string) {
  return useQuery({
    queryKey: entriesKeys.byDate(date),
    queryFn: () => entriesRepository.getByDate(date),
    enabled: Boolean(date),
  })
}

/**
 * Hook to get entries within a date range
 */
export function useEntriesByDateRange(query: DateRangeQuery) {
  return useQuery({
    queryKey: entriesKeys.byDateRange(query),
    queryFn: () => entriesRepository.getByDateRange(query),
    enabled: Boolean(query.startDate && query.endDate),
  })
}

/**
 * Hook to get all entries
 */
export function useAllEntries() {
  return useQuery({
    queryKey: entriesKeys.lists(),
    queryFn: () => entriesRepository.getAll(),
  })
}

/**
 * Hook to get paginated entries
 */
export function usePaginatedEntries(limit: number, offset = 0) {
  return useQuery({
    queryKey: entriesKeys.list({ limit, offset }),
    queryFn: () => entriesRepository.getPaginated(limit, offset),
  })
}

/**
 * Hook to search entries
 */
export function useSearchEntries(query: string) {
  return useQuery({
    queryKey: entriesKeys.search(query),
    queryFn: () => entriesRepository.search(query),
    enabled: query.length > 0,
  })
}

/**
 * Hook to create a new entry
 */
export function useCreateEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateEntryInput) => entriesRepository.create(input),
    onSuccess: async (entry) => {
      // Set the new entry in cache first
      queryClient.setQueryData(entriesKeys.detail(entry.id), entry)
      // Invalidate and wait for refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: entriesKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: entriesKeys.byDate(entry.date) }),
      ])
    },
  })
}

/**
 * Hook to update an entry
 */
export function useUpdateEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateEntryInput) => entriesRepository.update(input),
    onSuccess: (entry) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: entriesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: entriesKeys.byDate(entry.date) })
      queryClient.setQueryData(entriesKeys.detail(entry.id), entry)
    },
  })
}

/**
 * Hook to delete an entry
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      await entriesRepository.delete(id)
      return { id, date }
    },
    onSuccess: ({ id, date }) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: entriesKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: entriesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: entriesKeys.byDate(date) })
    },
  })
}

/**
 * Hook to get distinct dates with entries
 */
export function useDistinctDates() {
  return useQuery({
    queryKey: [...entriesKeys.all, 'distinctDates'],
    queryFn: () => entriesRepository.getDistinctDates(),
  })
}

/**
 * Hook to get entries count
 */
export function useEntriesCount() {
  return useQuery({
    queryKey: [...entriesKeys.all, 'count'],
    queryFn: () => entriesRepository.count(),
  })
}

/**
 * Prefetch entries for a specific date
 */
export function usePrefetchEntriesByDate() {
  const queryClient = useQueryClient()

  return (date: string) => {
    queryClient.prefetchQuery({
      queryKey: entriesKeys.byDate(date),
      queryFn: () => entriesRepository.getByDate(date),
    })
  }
}
