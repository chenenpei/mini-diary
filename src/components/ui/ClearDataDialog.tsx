'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClearDataDialogProps {
  isOpen: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

// 动画缓动函数
const easing = {
  smooth: [0.4, 0, 0.2, 1] as const,
}

/**
 * ClearDataDialog - 清空数据确认对话框
 *
 * 三步确认流程:
 * 1. 显示警告信息
 * 2. 输入确认文字
 * 3. 最终确认按钮
 */
export function ClearDataDialog({ isOpen, onConfirm, onCancel }: ClearDataDialogProps) {
  const { t } = useTranslation('data')
  const { t: tCommon } = useTranslation('common')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Confirmation text varies by language (Chinese: "确认删除", English: "DELETE ALL")
  const confirmText = t('confirmDeleteText')

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setInputValue('')
      setIsLoading(false)
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

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

  const handleNextStep = useCallback(() => {
    setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
  }, [])

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const isInputValid = inputValue === confirmText

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
            className="absolute inset-0 bg-black/80"
            onClick={() => !isLoading && onCancel()}
            aria-hidden="true"
          />

          {/* 对话框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
            className="relative w-full max-w-sm rounded-lg bg-card p-6 shadow-lg"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
          >
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              aria-label={tCommon('close')}
            >
              <X className="h-5 w-5" />
            </button>

            {/* 警告图标 */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>

            {/* 标题 */}
            <h2
              id="clear-dialog-title"
              className="mb-2 text-center text-lg font-medium text-foreground"
            >
              {t('clearAllTitle')}
            </h2>

            {/* 内容区域 */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <p className="text-center text-sm text-muted-foreground">
                    {t('clearWarning')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="flex-1 rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                    >
                      {tCommon('continue')}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <p className="text-center text-sm text-muted-foreground">
                    {t('confirmInputHint', { confirmText }).split('<1>')[0]}
                    <span className="font-medium text-foreground">{confirmText}</span>
                    {t('confirmInputHint', { confirmText }).split('</1>')[1] || ''}
                  </p>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={confirmText}
                    className={cn(
                      'w-full rounded-sm border bg-surface px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-1',
                      isInputValid
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-border focus:ring-foreground'
                    )}
                    autoComplete="off"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="flex-1 rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!isInputValid}
                      className="flex-1 rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {tCommon('continue')}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <p className="text-center text-sm text-muted-foreground">
                    {t('finalConfirmation')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isLoading}
                      className="flex-1 rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {tCommon('deleting')}
                        </>
                      ) : (
                        tCommon('confirmDelete')
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
