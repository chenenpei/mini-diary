'use client'

import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean
  /** Whether to auto-focus the first focusable element on activation */
  autoFocus?: boolean
  /** Whether to restore focus to the previously focused element on deactivation */
  restoreFocus?: boolean
}

/**
 * useFocusTrap - Hook for trapping focus within a container
 *
 * Implements accessible focus trapping for modals, dialogs, and drawers.
 * When active, Tab/Shift+Tab cycles through focusable elements within the container.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>({
  isActive,
  autoFocus = true,
  restoreFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null) // Filter out hidden elements
  }, [])

  useEffect(() => {
    if (!isActive) {
      // Restore focus when deactivating
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
        previousActiveElement.current = null
      }
      return
    }

    // Store the currently focused element
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }

    // Auto-focus the first focusable element
    if (autoFocus) {
      const focusableElements = getFocusableElements()
      const first = focusableElements[0]
      if (first) {
        // Slight delay to ensure the element is rendered and visible
        requestAnimationFrame(() => {
          first.focus()
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (!firstElement || !lastElement) return

      // Shift+Tab on first element -> move to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
        return
      }

      // Tab on last element -> move to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
        return
      }

      // If focus is outside container, move to first element
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, autoFocus, restoreFocus, getFocusableElements])

  return containerRef
}
