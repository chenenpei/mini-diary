import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getRandomPrompt,
  getTimeSlot,
  MINDFUL_PROMPTS,
  TIME_SLOT_PROMPTS,
  type TimeSlot,
} from '@/lib/prompts'

describe('prompts', () => {
  describe('getTimeSlot', () => {
    it.each([
      [6, 'earlyMorning'],
      [7, 'earlyMorning'],
      [8, 'earlyMorning'],
      [9, 'morning'],
      [10, 'morning'],
      [11, 'morning'],
      [12, 'noon'],
      [13, 'noon'],
      [14, 'afternoon'],
      [15, 'afternoon'],
      [17, 'afternoon'],
      [18, 'evening'],
      [19, 'evening'],
      [20, 'evening'],
      [21, 'night'],
      [22, 'night'],
      [23, 'night'],
      [0, 'night'],
      [3, 'night'],
      [5, 'night'],
    ])('hour %i should return %s', (hour, expected) => {
      expect(getTimeSlot(hour)).toBe(expected)
    })
  })

  describe('TIME_SLOT_PROMPTS', () => {
    const timeSlots: TimeSlot[] = [
      'earlyMorning',
      'morning',
      'noon',
      'afternoon',
      'evening',
      'night',
    ]

    it('should have all 6 time slots', () => {
      expect(Object.keys(TIME_SLOT_PROMPTS)).toHaveLength(6)
      for (const slot of timeSlots) {
        expect(TIME_SLOT_PROMPTS[slot]).toBeDefined()
      }
    })

    it('should have 5 prompts per time slot', () => {
      for (const slot of timeSlots) {
        expect(TIME_SLOT_PROMPTS[slot]).toHaveLength(5)
      }
    })

    it('should have keys in correct format', () => {
      for (const slot of timeSlots) {
        for (const key of TIME_SLOT_PROMPTS[slot]) {
          expect(key).toMatch(new RegExp(`^${slot}\\d+$`))
        }
      }
    })
  })

  describe('MINDFUL_PROMPTS', () => {
    it('should have 8 prompts', () => {
      expect(MINDFUL_PROMPTS).toHaveLength(8)
    })

    it('should have keys in correct format', () => {
      for (const key of MINDFUL_PROMPTS) {
        expect(key).toMatch(/^mindful\d+$/)
      }
    })

    it('should have unique keys', () => {
      const uniqueKeys = new Set(MINDFUL_PROMPTS)
      expect(uniqueKeys.size).toBe(MINDFUL_PROMPTS.length)
    })
  })

  describe('getRandomPrompt', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return time slot prompt when random < 0.7', () => {
      // First random for 70/30 split, second for index selection
      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      const result = getRandomPrompt(8) // earlyMorning
      expect(result).toBe('earlyMorning1')
    })

    it('should return mindful prompt when random >= 0.7', () => {
      vi.mocked(Math.random).mockReturnValueOnce(0.8).mockReturnValueOnce(0)
      const result = getRandomPrompt(8)
      expect(result).toBe('mindful1')
    })

    it('should use correct time slot based on hour', () => {
      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      expect(getRandomPrompt(10)).toBe('morning1')

      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      expect(getRandomPrompt(13)).toBe('noon1')

      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      expect(getRandomPrompt(15)).toBe('afternoon1')

      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      expect(getRandomPrompt(19)).toBe('evening1')

      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
      expect(getRandomPrompt(23)).toBe('night1')
    })

    it('should return last prompt when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0.999)
      const result = getRandomPrompt(8) // earlyMorning has 5 prompts
      expect(result).toBe('earlyMorning5')
    })
  })
})
