'use client'

import { createFileRoute, Outlet, useRouterState, useMatches } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Timeline } from '@/components/timeline'

export const Route = createFileRoute('/_timeline')({
  component: TimelineLayout,
})

// iOS 风格的缓动曲线
const easeOut = [0.32, 0.72, 0, 1] as const

function TimelineLayout() {
  // 从 URL 获取 search params（用于搜索结果跳转）
  const search = useRouterState({
    select: (state) => state.location.search as { date?: string; scrollTo?: string },
  })

  // 检查用户是否偏好减少动画
  const prefersReducedMotion = useReducedMotion()

  // 获取当前匹配的路由，用于判断是否显示覆盖层
  const matches = useMatches()
  const isOverlayRoute = matches.some(
    (match) => match.routeId.includes('/entry/new') || match.routeId.includes('/entry/$id')
  )

  return (
    <>
      {/* 编辑器打开时禁用时间线交互，防止焦点跳出覆盖层 */}
      <div inert={isOverlayRoute ? true : undefined}>
        <Timeline initialDate={search.date} scrollToId={search.scrollTo} />
      </div>
      <AnimatePresence>
        {isOverlayRoute && (
          <motion.div
            key="editor-overlay"
            initial={prefersReducedMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: prefersReducedMotion ? 0 : '100%' }}
            transition={{ type: 'tween', duration: prefersReducedMotion ? 0 : 0.3, ease: easeOut }}
            className="fixed inset-0 z-50"
          >
            <Outlet />
          </motion.div>
        )}
      </AnimatePresence>
      {!isOverlayRoute && <Outlet />}
    </>
  )
}
