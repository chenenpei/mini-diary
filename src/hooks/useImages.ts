import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { imagesRepository } from '@/lib/repositories'
import type { CreateImageInput } from '@/types'
import { entriesKeys } from './useEntries'

// Query keys factory
export const imagesKeys = {
  all: ['images'] as const,
  details: () => [...imagesKeys.all, 'detail'] as const,
  detail: (id: string) => [...imagesKeys.details(), id] as const,
  byEntry: (entryId: string) => [...imagesKeys.all, 'entry', entryId] as const,
  byIds: (ids: string[]) => [...imagesKeys.all, 'ids', ids.sort().join(',')] as const,
}

/**
 * Hook to get a single image by ID
 */
export function useImage(id: string) {
  return useQuery({
    queryKey: imagesKeys.detail(id),
    queryFn: () => imagesRepository.getById(id),
    enabled: Boolean(id),
  })
}

/**
 * Hook to get all images for an entry
 */
export function useImagesByEntry(entryId: string) {
  return useQuery({
    queryKey: imagesKeys.byEntry(entryId),
    queryFn: () => imagesRepository.getByEntryId(entryId),
    enabled: Boolean(entryId),
  })
}

/**
 * Hook to get multiple images by IDs
 */
export function useImagesByIds(ids: string[]) {
  return useQuery({
    queryKey: imagesKeys.byIds(ids),
    queryFn: () => imagesRepository.getByIds(ids),
    enabled: ids.length > 0,
  })
}

/**
 * Hook to create a new image
 */
export function useCreateImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateImageInput) => imagesRepository.create(input),
    onSuccess: (image) => {
      // Update cache
      queryClient.setQueryData(imagesKeys.detail(image.id), image)
      queryClient.invalidateQueries({ queryKey: imagesKeys.byEntry(image.entryId) })
    },
  })
}

/**
 * Hook to create multiple images
 */
export function useCreateImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inputs: CreateImageInput[]) => imagesRepository.createMany(inputs),
    onSuccess: (images) => {
      // Update cache for each image
      for (const image of images) {
        queryClient.setQueryData(imagesKeys.detail(image.id), image)
      }
      // Invalidate entry queries if needed
      const entryIds = [...new Set(images.map((img) => img.entryId))]
      for (const entryId of entryIds) {
        queryClient.invalidateQueries({ queryKey: imagesKeys.byEntry(entryId) })
      }
    },
  })
}

/**
 * Hook to delete an image
 */
export function useDeleteImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      entryId,
    }: {
      id: string
      entryId: string
    }) => {
      await imagesRepository.delete(id)
      return { id, entryId }
    },
    onSuccess: ({ id, entryId }) => {
      queryClient.removeQueries({ queryKey: imagesKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: imagesKeys.byEntry(entryId) })
    },
  })
}

/**
 * Hook to delete all images for an entry
 */
export function useDeleteImagesByEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entryId: string) => imagesRepository.deleteByEntryId(entryId),
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: imagesKeys.byEntry(entryId) })
      queryClient.invalidateQueries({ queryKey: imagesKeys.all })
    },
  })
}

/**
 * Hook to get images count
 */
export function useImagesCount() {
  return useQuery({
    queryKey: [...imagesKeys.all, 'count'],
    queryFn: () => imagesRepository.count(),
  })
}

/**
 * Hook to get total storage size
 */
export function useImagesTotalSize() {
  return useQuery({
    queryKey: [...imagesKeys.all, 'totalSize'],
    queryFn: () => imagesRepository.getTotalSize(),
  })
}

/**
 * Combined hook to delete an entry and its images
 */
export function useDeleteEntryWithImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      date,
    }: {
      entryId: string
      date: string
    }) => {
      // Delete images first, then entry
      await imagesRepository.deleteByEntryId(entryId)
      // Note: Entry deletion is handled separately by useDeleteEntry
      return { entryId, date }
    },
    onSuccess: ({ entryId, date }) => {
      // Invalidate both images and entries queries
      queryClient.invalidateQueries({ queryKey: imagesKeys.byEntry(entryId) })
      queryClient.invalidateQueries({ queryKey: imagesKeys.all })
      queryClient.invalidateQueries({ queryKey: entriesKeys.detail(entryId) })
      queryClient.invalidateQueries({ queryKey: entriesKeys.byDate(date) })
    },
  })
}
