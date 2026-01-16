'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Download, Upload, Moon, Sun, Monitor, Trash2, HardDrive, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/useLocale'
import type { Locale } from '@/i18n'

// 动画缓动函数
const easing = {
  smooth: [0.4, 0, 0.2, 1] as const,
}

export type ThemeMode = 'light' | 'dark' | 'system'

interface DrawerProps {
  /** 是否打开 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 当前主题模式 */
  themeMode: ThemeMode
  /** 主题切换回调 */
  onThemeChange: (mode: ThemeMode) => void
  /** 存储使用量（字节） */
  storageUsed?: number
  /** 导出数据回调 */
  onExport: () => void
  /** 导入数据回调 */
  onImport: () => void
  /** 清空数据回调 */
  onClearData: () => void
  /** 是否正在导出 */
  isExporting?: boolean
  /** 是否正在导入 */
  isImporting?: boolean
}

// 格式化存储大小
function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 语言选项配置
const languageOptions: { value: Locale; labelKey: 'languageZh' | 'languageEn'; flag: string }[] = [
  { value: 'zh-CN', labelKey: 'languageZh', flag: '🇨🇳' },
  { value: 'en', labelKey: 'languageEn', flag: '🇺🇸' },
]

/**
 * Drawer - 侧边栏组件
 *
 * 设计规范:
 * - 从左侧滑入动画
 * - 背景遮罩 50% 透明度
 * - 点击遮罩或关闭按钮关闭
 */
export function Drawer({
  isOpen,
  onClose,
  themeMode,
  onThemeChange,
  storageUsed = 0,
  onExport,
  onImport,
  onClearData,
  isExporting = false,
  isImporting = false,
}: DrawerProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { t: tData } = useTranslation('data')
  const { locale, setLocale } = useLocale()

  // 主题选项配置（需要在组件内部以获取翻译）
  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themeLight'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themeDark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: t('themeSystem'), icon: <Monitor className="h-4 w-4" /> },
  ]

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: easing.smooth }}
            className="absolute inset-0 bg-black/50"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* 侧边栏内容 */}
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: easing.smooth }}
            className="absolute left-0 top-0 h-full w-[280px] max-w-[80vw] bg-background shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            {/* 头部 */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-medium text-foreground">{t('title')}</span>
              <button
                type="button"
                onClick={onClose}
                className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
                aria-label={tCommon('closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex flex-col gap-6 overflow-y-auto p-4 pb-20">
              {/* 存储监控 */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <HardDrive className="h-4 w-4" />
                  {t('storage')}
                </h3>
                <div className="rounded-md border border-border bg-surface p-3">
                  <div className="text-sm text-foreground">
                    {t('storageUsed', { size: formatStorageSize(storageUsed) })}
                  </div>
                </div>
              </section>

              {/* 主题切换 */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-foreground">{t('theme')}</h3>
                <div className="flex gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onThemeChange(option.value)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-md border p-3 transition-colors',
                        themeMode === option.value
                          ? 'border-foreground bg-surface'
                          : 'border-border hover:bg-surface'
                      )}
                    >
                      {option.icon}
                      <span className="text-xs text-foreground">{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 语言切换 */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Languages className="h-4 w-4" />
                  {t('language')}
                </h3>
                <div className="flex gap-2">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLocale(option.value)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-md border p-3 transition-colors',
                        locale === option.value
                          ? 'border-foreground bg-surface'
                          : 'border-border hover:bg-surface'
                      )}
                    >
                      <span className="text-base">{option.flag}</span>
                      <span className="text-xs text-foreground">{t(option.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 数据管理 */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-foreground">{t('dataManagement')}</h3>
                <div className="flex flex-col gap-2">
                  {/* 导出 */}
                  <button
                    type="button"
                    onClick={onExport}
                    disabled={isExporting}
                    className="flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    <Download className="h-5 w-5 text-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {isExporting ? tData('exporting') : tData('export')}
                      </div>
                      <div className="text-xs text-muted-foreground">{tData('exportDescription')}</div>
                    </div>
                  </button>

                  {/* 导入 */}
                  <button
                    type="button"
                    onClick={onImport}
                    disabled={isImporting}
                    className="flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    <Upload className="h-5 w-5 text-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {isImporting ? tData('importing') : tData('import')}
                      </div>
                      <div className="text-xs text-muted-foreground">{tData('importDescription')}</div>
                    </div>
                  </button>

                  {/* 清空数据 */}
                  <button
                    type="button"
                    onClick={onClearData}
                    className="flex items-center gap-3 rounded-md border border-red-200 p-3 text-left transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-500">{tData('clearAll')}</div>
                      <div className="text-xs text-muted-foreground">{tData('clearDescription')}</div>
                    </div>
                  </button>
                </div>
              </section>
            </div>

            {/* 底部版本信息 */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4">
              <div className="text-center text-xs text-muted-foreground">
                MiniDiary v1.0.0
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
