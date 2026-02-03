import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRandomPrompt } from '@/hooks/useRandomPrompt'
import * as prompts from '@/lib/prompts'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}))

describe('useRandomPrompt', () => {
  beforeEach(() => {
    vi.spyOn(prompts, 'getRandomPrompt')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a translated prompt', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('morning1')
    const { result } = renderHook(() => useRandomPrompt())
    expect(result.current).toBe('translated:morning1')
  })

  it('should call getRandomPrompt once on mount', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('morning1')
    renderHook(() => useRandomPrompt())
    expect(prompts.getRandomPrompt).toHaveBeenCalledTimes(1)
  })

  it('should not change prompt on re-render', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('morning1')
    const { result, rerender } = renderHook(() => useRandomPrompt())
    const firstPrompt = result.current
    rerender()
    expect(result.current).toBe(firstPrompt)
    // getRandomPrompt should still only be called once (via useMemo)
    expect(prompts.getRandomPrompt).toHaveBeenCalledTimes(1)
  })
})
