'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface PageLayoutProps extends ComponentPropsWithoutRef<'main'> {
  /** Page content */
  children: ReactNode
  /** Enable page enter/exit animation */
  animate?: boolean
}

// Animation easing functions from DESIGN.md
const easing = {
  smooth: [0.4, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
}

/**
 * PageLayout - 页面布局容器
 *
 * 设计规范:
 * - Mobile First
 * - 内容区 max-w-[600px] 居中
 * - 背景色: Surface (light) / Background (dark)
 * - 页面内边距: 20px (mobile) / 24px (tablet) / 32px (desktop)
 */
export function PageLayout({ children, animate = true, className, ...props }: PageLayoutProps) {
  const content = (
    <main
      className={cn(
        'flex-1 bg-surface dark:bg-background px-5 pb-24 pt-5 sm:px-6 lg:px-8',
        'mx-auto max-w-[600px]',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )

  if (!animate) {
    return <div className="flex-1 bg-surface dark:bg-background">{content}</div>
  }

  return (
    <motion.div
      className='flex-1 bg-surface dark:bg-background'
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: easing.smooth }}
    >
      {content}
    </motion.div>
  )
}

interface PageTransitionProps {
  children: ReactNode
  /** Unique key for AnimatePresence */
  pageKey: string
}

/**
 * PageTransition - 页面过渡动画包装器
 * 用于包裹路由出口，实现页面切换动画
 */
export function PageTransition({ children, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: easing.smooth }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
