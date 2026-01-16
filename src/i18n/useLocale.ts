import { useState, useCallback, useEffect } from 'react'
import i18n from './index'
import { type Locale, getStoredLocale, setStoredLocale } from './index'

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // SSR 安全：在服务端返回默认值
    if (typeof window === 'undefined') return 'zh-CN'
    return (i18n.language as Locale) || 'zh-CN'
  })

  const setLocale = useCallback((newLocale: Locale) => {
    i18n.changeLanguage(newLocale)
    setStoredLocale(newLocale)
    setLocaleState(newLocale)
    // 更新 html lang 属性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale
    }
  }, [])

  // 初始化时同步存储的语言设置
  useEffect(() => {
    const stored = getStoredLocale()
    if (stored && stored !== locale) {
      setLocale(stored)
    }
  }, [locale, setLocale])

  return { locale, setLocale }
}
