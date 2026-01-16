'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Dialog title */
  title: string
  /** Dialog message */
  message: string
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Whether the action is destructive (red confirm button) */
  destructive?: boolean
  /** Confirm handler */
  onConfirm: () => void
  /** Cancel/close handler */
  onCancel: () => void
  /** Loading state for confirm button */
  isLoading?: boolean
}

/**
 * ConfirmDialog - 确认弹窗组件
 *
 * 设计规范:
 * - 居中弹出
 * - 半透明黑色背景
 * - 支持键盘导航 (ESC 关闭)
 * - 点击背景关闭
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  destructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Prevent body scroll when open
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
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>

            {/* Message */}
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:opacity-80 disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                  destructive
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:opacity-80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 active:opacity-80'
                )}
              >
                {isLoading ? '处理中...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to manage confirm dialog state
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    destructive?: boolean
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const open = useCallback(
    (options: {
      title: string
      message: string
      confirmText?: string
      destructive?: boolean
      onConfirm: () => void
    }) => {
      setState({
        isOpen: true,
        ...options,
      })
    },
    []
  )

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    ...state,
    open,
    close,
  }
}
