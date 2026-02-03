'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

interface InfoDialogProps {
  /** 是否打开 */
  isOpen: boolean
  /** 标题 */
  title: string
  /** 内容列表 */
  items: string[]
  /** 关闭按钮文本 */
  closeText: string
  /** 关闭回调 */
  onClose: () => void
}

/**
 * InfoDialog - 信息说明弹窗
 *
 * 设计规范:
 * - 居中弹出
 * - 半透明黑色背景
 * - 支持 ESC 键关闭
 * - 点击背景关闭
 */
export function InfoDialog({ isOpen, title, items, closeText, onClose }: InfoDialogProps) {
  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>

            {/* 内容列表 */}
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* 关闭按钮 */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:opacity-80"
              >
                {closeText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
