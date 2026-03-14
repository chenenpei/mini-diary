'use client'

import { useNavigate } from '@tanstack/react-router'
import { Cloud, Download, Monitor, Moon, Sun, Trash2, Upload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { Locale } from '@/i18n'
import { useLocale } from '@/i18n/useLocale'
import { easing } from '@/lib/motion'
import { cn } from '@/lib/utils'

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
  const navigate = useNavigate()
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { t: tData } = useTranslation('data')
  const { t: tSync } = useTranslation('sync')
  const { locale, setLocale } = useLocale()

  // Focus trap
  const drawerRef = useFocusTrap<HTMLElement>({
    isActive: isOpen,
    autoFocus: true,
    restoreFocus: true,
  })

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
            ref={drawerRef}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: easing.smooth }}
            className="absolute left-0 top-0 h-full w-[280px] max-w-[80vw] bg-background shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            {/* 头部 */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-semibold tracking-tight text-foreground">{t('title')}</span>
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
            <div className="flex flex-col overflow-y-auto p-4 pb-16">
              {/* 偏好设置 */}
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('theme')}</h3>
                <div className="flex gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onThemeChange(option.value)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-sm border p-3 transition-colors',
                        themeMode === option.value
                          ? 'border-foreground bg-surface'
                          : 'border-border hover:bg-surface',
                      )}
                    >
                      {option.icon}
                      <span className="text-xs text-foreground">{option.label}</span>
                    </button>
                  ))}
                </div>

                <h3 className="mb-3 mt-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('language')}</h3>
                <div className="flex gap-2">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLocale(option.value)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-sm border p-3 transition-colors',
                        locale === option.value
                          ? 'border-foreground bg-surface'
                          : 'border-border hover:bg-surface',
                      )}
                    >
                      <span className="text-base">{option.flag}</span>
                      <span className="text-xs text-foreground">{t(option.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 云同步 */}
              <section className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate({ to: '/sync' })
                  }}
                  className="flex w-full items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-surface"
                >
                  <Cloud className="h-5 w-5 text-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{tSync('title')}</div>
                    <div className="text-xs text-muted-foreground">{tSync('description')}</div>
                  </div>
                </button>
              </section>

              {/* 数据管理 */}
              <section className="mt-6">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {t('dataManagement')}
                </h3>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={onExport}
                    disabled={isExporting}
                    className="flex items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    <Download className="h-5 w-5 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {isExporting ? tData('exporting') : tData('export')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onImport}
                    disabled={isImporting}
                    className="flex items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    <Upload className="h-5 w-5 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {isImporting ? tData('importing') : tData('import')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onClearData}
                    className="flex items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-destructive/5"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{tData('clearAll')}</span>
                  </button>
                </div>
              </section>
            </div>

            {/* 底部：存储信息 + 版本号 */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
              <div className="text-center text-xs text-muted-foreground">
                {t('storageUsed', { size: formatStorageSize(storageUsed) })}
              </div>
              <div className="mt-0.5 text-center text-xs text-muted-foreground/60">
                MiniDiary v1.0.0
              </div>
            </div>
          </motion.aside>

        </div>
      )}
    </AnimatePresence>
  )
}
