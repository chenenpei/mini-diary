'use client'

import { useState, useEffect } from 'react'

/**
 * useKeyboardHeight - 监听虚拟键盘高度变化
 *
 * 使用 visualViewport API 检测键盘高度，用于底部工具栏定位
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    // 服务端渲染检查
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    if (!viewport) return

    let ticking = false

    const handleViewportChange = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        // 计算键盘高度 = 窗口高度 - 可视区域高度
        const heightDiff = window.innerHeight - viewport.height
        // 使用小阈值过滤（避免误判滚动条等）
        const newHeight = heightDiff > 50 ? heightDiff : 0
        setKeyboardHeight(newHeight)
        ticking = false
      })
    }

    viewport.addEventListener('resize', handleViewportChange)
    viewport.addEventListener('scroll', handleViewportChange)

    // 初始化
    handleViewportChange()

    return () => {
      viewport.removeEventListener('resize', handleViewportChange)
      viewport.removeEventListener('scroll', handleViewportChange)
    }
  }, [])

  return keyboardHeight
}
