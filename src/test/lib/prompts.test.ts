import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRandomPrompt, PROMPT_KEYS } from '@/lib/prompts'

describe('prompts', () => {
  describe('PROMPT_KEYS', () => {
    it('should have at least 30 prompt keys', () => {
      expect(PROMPT_KEYS.length).toBeGreaterThanOrEqual(30)
    })

    it('should have unique keys', () => {
      const uniqueKeys = new Set(PROMPT_KEYS)
      expect(uniqueKeys.size).toBe(PROMPT_KEYS.length)
    })

    it('should have keys in correct format', () => {
      for (const key of PROMPT_KEYS) {
        expect(key).toMatch(/^prompt\d+$/)
      }
    })
  })

  describe('getRandomPrompt', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return a prompt key from PROMPT_KEYS', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const result = getRandomPrompt()
      expect(PROMPT_KEYS).toContain(result)
    })

    it('should return first prompt when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const result = getRandomPrompt()
      expect(result).toBe(PROMPT_KEYS[0])
    })

    it('should return last prompt when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const result = getRandomPrompt()
      expect(result).toBe(PROMPT_KEYS[PROMPT_KEYS.length - 1])
    })
  })
})
