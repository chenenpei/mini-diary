import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// 英文翻译
import enCommon from './locales/en/common.json'
import enData from './locales/en/data.json'
import enDate from './locales/en/date.json'
import enEditor from './locales/en/editor.json'
import enEntry from './locales/en/entry.json'
import enImage from './locales/en/image.json'
import enPrompts from './locales/en/prompts.json'
import enSearch from './locales/en/search.json'
import enSettings from './locales/en/settings.json'
import enTimeline from './locales/en/timeline.json'
// 中文翻译
import zhCommon from './locales/zh-CN/common.json'
import zhData from './locales/zh-CN/data.json'
import zhDate from './locales/zh-CN/date.json'
import zhEditor from './locales/zh-CN/editor.json'
import zhEntry from './locales/zh-CN/entry.json'
import zhImage from './locales/zh-CN/image.json'
import zhPrompts from './locales/zh-CN/prompts.json'
import zhSearch from './locales/zh-CN/search.json'
import zhSettings from './locales/zh-CN/settings.json'
import zhTimeline from './locales/zh-CN/timeline.json'

const LOCALE_STORAGE_KEY = 'mini-diary-locale'

export type Locale = 'zh-CN' | 'en'

export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'zh-CN' || stored === 'en') return stored
  return null
}

export function setStoredLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

const resources = {
  'zh-CN': {
    common: zhCommon,
    entry: zhEntry,
    editor: zhEditor,
    settings: zhSettings,
    search: zhSearch,
    data: zhData,
    date: zhDate,
    image: zhImage,
    timeline: zhTimeline,
    prompts: zhPrompts,
  },
  en: {
    common: enCommon,
    entry: enEntry,
    editor: enEditor,
    settings: enSettings,
    search: enSearch,
    data: enData,
    date: enDate,
    image: enImage,
    timeline: enTimeline,
    prompts: enPrompts,
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLocale() ?? 'zh-CN',
  fallbackLng: 'zh-CN',
  defaultNS: 'common',
  ns: [
    'common',
    'entry',
    'editor',
    'settings',
    'search',
    'data',
    'date',
    'image',
    'timeline',
    'prompts',
  ],
  interpolation: {
    escapeValue: false, // React 已处理 XSS
  },
})

export default i18n
