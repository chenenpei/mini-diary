import { useCallback, useEffect, useState } from 'react'
import type { ThemeMode } from '@/components/layout'

const THEME_STORAGE_KEY = 'mini-diary-theme'

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 获取存储的主题设置
 */
function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Ignore storage errors
  }
  return 'system'
}

/**
 * 保存主题设置
 */
function storeTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage errors
  }
}

/**
 * 应用主题到 document
 */
function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme

  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/**
 * 主题管理 hook
 */
export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [mounted, setMounted] = useState(false)

  // 初始化
  useEffect(() => {
    const storedTheme = getStoredTheme()
    setThemeMode(storedTheme)
    applyTheme(storedTheme)
    setMounted(true)
  }, [])

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted, themeMode])

  // 切换主题
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeMode(newTheme)
    storeTheme(newTheme)
    applyTheme(newTheme)
  }, [])

  return {
    themeMode,
    setTheme,
    mounted,
  }
}
