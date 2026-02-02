'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Central policy for timeline animations.
 * Animate only on "first visit to home" or "date change"; no animation when
 * returning from edit/new or when adding an entry on the same day.
 */
export function useTimelineAnimationPolicy(currentDate: string, scrollTo: string | undefined) {
  const [shouldAnimate, setShouldAnimate] = useState(() => scrollTo === undefined)
  const prevDateRef = useRef(currentDate)

  // Returning from edit/new: disable animation
  useEffect(() => {
    if (scrollTo !== undefined) {
      setShouldAnimate(false)
    }
  }, [scrollTo])

  // Date changed: enable animation (e.g. first load or date navigator)
  useEffect(() => {
    if (prevDateRef.current !== currentDate) {
      setShouldAnimate(true)
      prevDateRef.current = currentDate
    }
  }, [currentDate])

  return {
    shouldAnimatePage: shouldAnimate,
    shouldAnimateEntries: shouldAnimate,
  }
}
