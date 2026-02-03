/**
 * 写作提示 (Writing Prompts)
 *
 * 根据时段和"关注当下"维度组织提示词。
 * 提示内容通过 i18n 管理，此模块只定义 key 和随机选取逻辑。
 * 翻译文件: src/i18n/locales/{locale}/prompts.json
 */

/**
 * 时段定义
 */
export type TimeSlot =
  | 'earlyMorning' // 6:00-9:00 清晨
  | 'morning' // 9:00-12:00 上午
  | 'noon' // 12:00-14:00 午间
  | 'afternoon' // 14:00-18:00 下午
  | 'evening' // 18:00-21:00 傍晚
  | 'night' // 21:00-6:00 深夜

/**
 * 根据小时获取当前时段
 */
export function getTimeSlot(hour: number = new Date().getHours()): TimeSlot {
  if (hour >= 6 && hour < 9) return 'earlyMorning'
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 21) return 'evening'
  return 'night'
}

/**
 * 时段特有提示 keys
 */
export const TIME_SLOT_PROMPTS: Record<TimeSlot, readonly string[]> = {
  earlyMorning: [
    'earlyMorning1', // 今天最想完成什么？
    'earlyMorning2', // 昨晚睡得怎么样？
    'earlyMorning3', // 今天有什么期待的事？
    'earlyMorning4', // 早餐吃了什么？
    'earlyMorning5', // 今天的计划是什么？
  ],
  morning: [
    'morning1', // 现在手头在忙什么？
    'morning2', // 上午过得顺利吗？
    'morning3', // 有什么进展想记录？
    'morning4', // 工作/学习状态如何？
    'morning5', // 遇到什么有趣的事？
  ],
  noon: [
    'noon1', // 午餐吃了什么？味道如何？
    'noon2', // 上午最大的收获是？
    'noon3', // 中午打算怎么休息？
    'noon4', // 有没有想放空一下？
    'noon5', // 下午有什么安排？
  ],
  afternoon: [
    'afternoon1', // 下午的状态怎么样？
    'afternoon2', // 有什么事情卡住了？
    'afternoon3', // 今天学到了什么？
    'afternoon4', // 有想吐槽的事吗？
    'afternoon5', // 快下班了，感觉如何？
  ],
  evening: [
    'evening1', // 今天过得怎么样？
    'evening2', // 晚餐吃了什么？
    'evening3', // 下班后在做什么？
    'evening4', // 今天最开心的瞬间？
    'evening5', // 有什么想放松一下？
  ],
  night: [
    'night1', // 今天有什么遗憾的事？
    'night2', // 睡前在想什么？
    'night3', // 明天最想做什么？
    'night4', // 今天值得记住的细节？
    'night5', // 现在是什么心情？
  ],
} as const

/**
 * 关注当下提示 keys（通用，任何时段都可能出现）
 */
export const MINDFUL_PROMPTS = [
  'mindful1', // 此刻脑子里在想什么？
  'mindful2', // 现在是什么心情？
  'mindful3', // 身体现在感觉如何？
  'mindful4', // 周围的光线和颜色是什么样的？
  'mindful5', // 能听到什么声音？或者很安静？
  'mindful6', // 手正在触碰什么？触感如何？
  'mindful7', // 皮肤感受到的温度是？
  'mindful8', // 现在最想做什么？
] as const

export type PromptKey =
  | (typeof TIME_SLOT_PROMPTS)[TimeSlot][number]
  | (typeof MINDFUL_PROMPTS)[number]

/**
 * 随机获取一个提示 key
 *
 * 抽取逻辑：70% 时段特有 + 30% 关注当下
 *
 * @param hour - 可选，指定小时（0-23），默认使用当前时间
 */
export function getRandomPrompt(hour?: number): string {
  const timeSlot = getTimeSlot(hour)
  const timeSlotPrompts = TIME_SLOT_PROMPTS[timeSlot]

  // 70% 时段特有，30% 关注当下
  const useTimeSlot = Math.random() < 0.7

  if (useTimeSlot) {
    const index = Math.floor(Math.random() * timeSlotPrompts.length)
    // 双重 fallback 满足 TypeScript 严格模式（实际不会触发）
    return timeSlotPrompts[index] ?? timeSlotPrompts[0] ?? 'mindful1'
  }

  const index = Math.floor(Math.random() * MINDFUL_PROMPTS.length)
  return MINDFUL_PROMPTS[index] ?? MINDFUL_PROMPTS[0] ?? 'mindful1'
}
