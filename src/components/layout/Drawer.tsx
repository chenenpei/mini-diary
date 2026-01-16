'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Download, Upload, Moon, Sun, Monitor, Trash2, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

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

// 主题选项配置
const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
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
            aria-label="设置菜单"
          >
            {/* 头部 */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-medium text-foreground">设置</span>
              <button
                type="button"
                onClick={onClose}
                className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
                aria-label="关闭菜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex flex-col gap-6 p-4">
              {/* 存储监控 */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <HardDrive className="h-4 w-4" />
                  存储空间
                </h3>
                <div className="rounded-md border border-border bg-surface p-3">
                  <div className="text-sm text-foreground">
                    已使用 {formatStorageSize(storageUsed)}
                  </div>
                </div>
              </section>

              {/* 主题切换 */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-foreground">主题</h3>
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

              {/* 数据管理 */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-foreground">数据管理</h3>
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
                        {isExporting ? '导出中...' : '导出数据'}
                      </div>
                      <div className="text-xs text-muted-foreground">导出为 JSON 备份文件</div>
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
                        {isImporting ? '导入中...' : '导入数据'}
                      </div>
                      <div className="text-xs text-muted-foreground">从 JSON 备份恢复</div>
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
                      <div className="text-sm font-medium text-red-500">清空数据</div>
                      <div className="text-xs text-muted-foreground">删除所有日记（不可恢复）</div>
                    </div>
                  </button>
                </div>
              </section>
            </div>

            {/* 底部版本信息 */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
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
