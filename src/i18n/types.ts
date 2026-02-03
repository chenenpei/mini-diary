import 'i18next'
import type zhCommon from './locales/zh-CN/common.json'
import type zhData from './locales/zh-CN/data.json'
import type zhDate from './locales/zh-CN/date.json'
import type zhEditor from './locales/zh-CN/editor.json'
import type zhEntry from './locales/zh-CN/entry.json'
import type zhImage from './locales/zh-CN/image.json'
import type zhPrompts from './locales/zh-CN/prompts.json'
import type zhSearch from './locales/zh-CN/search.json'
import type zhSettings from './locales/zh-CN/settings.json'
import type zhTimeline from './locales/zh-CN/timeline.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof zhCommon
      entry: typeof zhEntry
      editor: typeof zhEditor
      settings: typeof zhSettings
      search: typeof zhSearch
      data: typeof zhData
      date: typeof zhDate
      image: typeof zhImage
      timeline: typeof zhTimeline
      prompts: typeof zhPrompts
    }
  }
}
