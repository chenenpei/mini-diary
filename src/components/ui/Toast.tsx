'use client'

import { useEffect, useCallback, useState, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Toast Provider
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// 动画缓动函数
const easing = {
  smooth: [0.4, 0, 0.2, 1] as const,
}

// Toast 图标
const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />
    default:
      return <Info className="h-5 w-5 text-blue-500" />
  }
}

/**
 * Single Toast Item
 */
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onRemove, toast.duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [toast.duration, onRemove])

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25, ease: easing.smooth }}
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 shadow-md',
        'min-w-[280px] max-w-[400px]'
      )}
      role="alert"
    >
      <ToastIcon type={toast.type} />
      <span className="flex-1 text-sm text-foreground">{toast.message}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

/**
 * Toast Container
 */
function ToastContainer() {
  const context = useContext(ToastContext)
  if (!context) return null

  const { toasts, removeToast } = context

  return (
    <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2">
      <div className="flex flex-col items-center gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
