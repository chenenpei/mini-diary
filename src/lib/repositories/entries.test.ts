import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { entriesRepository } from './entries'

describe('entriesRepository', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.entries.clear()
  })

  afterEach(async () => {
    // Clean up after each test
    await db.entries.clear()
  })

  describe('create', () => {
    it('should create a new entry', async () => {
      const input = {
        content: 'Test entry content',
        date: '2024-01-15',
      }

      const entry = await entriesRepository.create(input)

      expect(entry.id).toBeDefined()
      expect(entry.content).toBe(input.content)
      expect(entry.date).toBe(input.date)
      expect(entry.imageIds).toEqual([])
      expect(entry.createdAt).toBeDefined()
      expect(entry.updatedAt).toBeDefined()
    })

    it('should create entry with imageIds', async () => {
      const input = {
        content: 'Entry with images',
        date: '2024-01-15',
        imageIds: ['img-1', 'img-2'],
      }

      const entry = await entriesRepository.create(input)

      expect(entry.imageIds).toEqual(['img-1', 'img-2'])
    })

    it('should throw error for content exceeding max length', async () => {
      const longContent = 'a'.repeat(10001)

      await expect(
        entriesRepository.create({
          content: longContent,
          date: '2024-01-15',
        })
      ).rejects.toThrow('Content exceeds maximum length')
    })

    it('should throw error for more than 3 images', async () => {
      await expect(
        entriesRepository.create({
          content: 'Test',
          date: '2024-01-15',
          imageIds: ['1', '2', '3', '4'],
        })
      ).rejects.toThrow('Cannot attach more than 3 images')
    })

    it('should throw error for invalid date format', async () => {
      await expect(
        entriesRepository.create({
          content: 'Test',
          date: '2024/01/15',
        })
      ).rejects.toThrow('Date must be in YYYY-MM-DD format')
    })
  })

  describe('getById', () => {
    it('should get entry by id', async () => {
      const created = await entriesRepository.create({
        content: 'Test',
        date: '2024-01-15',
      })

      const entry = await entriesRepository.getById(created.id)

      expect(entry).toEqual(created)
    })

    it('should return undefined for non-existent id', async () => {
      const entry = await entriesRepository.getById('non-existent')

      expect(entry).toBeUndefined()
    })
  })

  describe('getByDate', () => {
    it('should get entries by date', async () => {
      await entriesRepository.create({ content: 'Entry 1', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 2', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 3', date: '2024-01-16' })

      const entries = await entriesRepository.getByDate('2024-01-15')

      expect(entries).toHaveLength(2)
      expect(entries.every((e) => e.date === '2024-01-15')).toBe(true)
    })

    it('should return empty array for date with no entries', async () => {
      const entries = await entriesRepository.getByDate('2024-01-15')

      expect(entries).toEqual([])
    })
  })

  describe('getByDateRange', () => {
    it('should get entries within date range', async () => {
      await entriesRepository.create({ content: 'Entry 1', date: '2024-01-14' })
      await entriesRepository.create({ content: 'Entry 2', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 3', date: '2024-01-16' })
      await entriesRepository.create({ content: 'Entry 4', date: '2024-01-17' })

      const entries = await entriesRepository.getByDateRange({
        startDate: '2024-01-15',
        endDate: '2024-01-16',
      })

      expect(entries).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update entry content', async () => {
      const created = await entriesRepository.create({
        content: 'Original',
        date: '2024-01-15',
      })

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 5))

      const updated = await entriesRepository.update({
        id: created.id,
        content: 'Updated',
      })

      expect(updated.content).toBe('Updated')
      expect(updated.date).toBe(created.date)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
    })

    it('should update entry imageIds', async () => {
      const created = await entriesRepository.create({
        content: 'Test',
        date: '2024-01-15',
        imageIds: ['img-1'],
      })

      const updated = await entriesRepository.update({
        id: created.id,
        imageIds: ['img-1', 'img-2'],
      })

      expect(updated.imageIds).toEqual(['img-1', 'img-2'])
    })

    it('should throw error for non-existent entry', async () => {
      await expect(
        entriesRepository.update({
          id: 'non-existent',
          content: 'Test',
        })
      ).rejects.toThrow('Entry with id non-existent not found')
    })
  })

  describe('delete', () => {
    it('should delete entry', async () => {
      const created = await entriesRepository.create({
        content: 'Test',
        date: '2024-01-15',
      })

      await entriesRepository.delete(created.id)

      const entry = await entriesRepository.getById(created.id)
      expect(entry).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all entries sorted by date descending', async () => {
      await entriesRepository.create({ content: 'Entry 1', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 2', date: '2024-01-17' })
      await entriesRepository.create({ content: 'Entry 3', date: '2024-01-16' })

      const entries = await entriesRepository.getAll()

      expect(entries).toHaveLength(3)
      expect(entries[0]?.date).toBe('2024-01-17')
      expect(entries[1]?.date).toBe('2024-01-16')
      expect(entries[2]?.date).toBe('2024-01-15')
    })
  })

  describe('count', () => {
    it('should return correct count', async () => {
      await entriesRepository.create({ content: 'Entry 1', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 2', date: '2024-01-16' })

      const count = await entriesRepository.count()

      expect(count).toBe(2)
    })
  })

  describe('search', () => {
    it('should find entries containing search query', async () => {
      await entriesRepository.create({ content: 'Hello world', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Goodbye world', date: '2024-01-16' })
      await entriesRepository.create({ content: 'Hello there', date: '2024-01-17' })

      const results = await entriesRepository.search('hello')

      expect(results).toHaveLength(2)
    })

    it('should be case insensitive', async () => {
      await entriesRepository.create({ content: 'HELLO WORLD', date: '2024-01-15' })

      const results = await entriesRepository.search('hello')

      expect(results).toHaveLength(1)
    })
  })

  describe('getDistinctDates', () => {
    it('should return unique dates', async () => {
      await entriesRepository.create({ content: 'Entry 1', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 2', date: '2024-01-15' })
      await entriesRepository.create({ content: 'Entry 3', date: '2024-01-16' })

      const dates = await entriesRepository.getDistinctDates()

      expect(dates).toHaveLength(2)
      expect(dates).toContain('2024-01-15')
      expect(dates).toContain('2024-01-16')
    })
  })
})
