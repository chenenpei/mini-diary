import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRandomPrompt } from '@/lib/prompts'

/**
 * 获取随机写作提示
 *
 * 在组件挂载时根据当前时段随机选取一条提示，组件生命周期内保持不变。
 * 提示内容根据当前语言设置自动切换。
 *
 * 抽取逻辑：70% 时段特有提示 + 30% 关注当下提示
 *
 * @returns 翻译后的提示文本
 */
export function useRandomPrompt(): string {
  const { t } = useTranslation('prompts')

  // 只在挂载时随机选取，不随重渲染变化
  const promptKey = useMemo(() => getRandomPrompt(), [])

  // 动态 key 需要绕过 i18next 的严格类型检查
  // getRandomPrompt 保证返回的 key 在 prompts.json 中存在
  return (t as (key: string) => string)(promptKey)
}
