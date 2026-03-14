/**
 * Shared motion constants
 *
 * Based on DESIGN.md easing specifications.
 * Used with motion/react (Framer Motion) throughout the app.
 */
export const easing = {
  /** 默认，平滑过渡 */
  smooth: [0.4, 0, 0.2, 1] as const,
  /** 弹性，有轻微回弹 */
  snappy: [0.34, 1.56, 0.64, 1] as const,
  /** 退出，加速离开 */
  exit: [0.4, 0, 1, 1] as const,
}
