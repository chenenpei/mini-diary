'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Search, X, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchEntries } from '@/hooks/useEntries'
import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

// 搜索历史存储的 key
const SEARCH_HISTORY_KEY = 'mini-diary-search-history'
const MAX_HISTORY_ITEMS = 5

// 获取搜索历史
function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// 保存搜索历史
function saveSearchHistory(history: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Ignore storage errors
  }
}

// 添加搜索历史
function addToSearchHistory(query: string): void {
  if (!query.trim()) return
  const history = getSearchHistory()
  // 移除重复项
  const filtered = history.filter((item) => item !== query)
  // 添加到开头
  const newHistory = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS)
  saveSearchHistory(newHistory)
}

// 防抖 hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// 高亮关键词组件
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) {
    return <span>{text}</span>
  }

  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

  // Generate stable keys using cumulative position
  const elementsWithKeys = parts.reduce<{ elements: React.ReactNode[]; pos: number }>(
    (acc, part) => {
      const key = `${acc.pos}-${part.slice(0, 10)}`
      const element =
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={key} className="bg-foreground/20 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={key}>{part}</span>
        )
      return {
        elements: [...acc.elements, element],
        pos: acc.pos + part.length,
      }
    },
    { elements: [], pos: 0 }
  )

  return <span>{elementsWithKeys.elements}</span>
}

// 搜索结果项组件
function SearchResultItem({
  entry,
  keyword,
  onClick,
  locale,
}: {
  entry: DiaryEntry
  keyword: string
  onClick: () => void
  locale: string
}) {
  // 获取摘要，显示关键词周围的内容
  const excerpt = useMemo(() => {
    const content = entry.content
    const maxLength = 100

    if (!keyword.trim()) {
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
    }

    const lowerContent = content.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()
    const index = lowerContent.indexOf(lowerKeyword)

    if (index === -1) {
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
    }

    // 显示关键词前后的内容
    const start = Math.max(0, index - 30)
    const end = Math.min(content.length, index + keyword.length + 70)
    let excerpt = content.slice(start, end)

    if (start > 0) excerpt = `...${excerpt}`
    if (end < content.length) excerpt = `${excerpt}...`

    return excerpt
  }, [entry.content, keyword])

  // 格式化日期
  const formattedDate = useMemo(() => {
    const date = new Date(entry.date)
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }, [entry.date, locale])

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 border-b border-border hover:bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="text-xs text-muted-foreground mb-1">{formattedDate}</div>
      <div className="text-sm text-foreground line-clamp-2">
        <HighlightText text={excerpt} keyword={keyword} />
      </div>
    </button>
  )
}

// 搜索历史项组件
function SearchHistoryItem({
  query,
  onClick,
  onRemove,
  removeLabel,
}: {
  query: string
  onClick: () => void
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-surface transition-colors">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 text-left text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {query}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={removeLabel}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function SearchPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('search')
  const { t: tCommon } = useTranslation('common')
  const { i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const debouncedQuery = useDebounce(query, 300)

  // 加载搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory())
  }, [])

  // 使用防抖后的查询进行搜索
  const { data: results, isLoading, isFetching } = useSearchEntries(debouncedQuery)

  const handleBack = useCallback(() => {
    navigate({ to: '/', search: { date: undefined, scrollTo: undefined } })
  }, [navigate])

  const handleClear = useCallback(() => {
    setQuery('')
  }, [])

  const handleResultClick = useCallback(
    (entry: DiaryEntry) => {
      // 保存搜索历史
      if (debouncedQuery.trim()) {
        addToSearchHistory(debouncedQuery.trim())
        setSearchHistory(getSearchHistory())
      }
      // 跳转到首页时间线，传递日期和条目 ID
      navigate({ to: '/', search: { date: entry.date, scrollTo: entry.id } })
    },
    [navigate, debouncedQuery]
  )

  const handleHistoryClick = useCallback((historyQuery: string) => {
    setQuery(historyQuery)
  }, [])

  const handleHistoryRemove = useCallback((queryToRemove: string) => {
    const newHistory = searchHistory.filter((item) => item !== queryToRemove)
    saveSearchHistory(newHistory)
    setSearchHistory(newHistory)
  }, [searchHistory])

  // 判断是否正在搜索
  const isSearching = isLoading || isFetching
  const showResults = debouncedQuery.trim().length > 0
  const hasResults = results && results.length > 0
  const hasHistory = searchHistory.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 搜索栏 */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-4 py-2">
        {/* 返回按钮 */}
        <button
          type="button"
          onClick={handleBack}
          className="touch-target flex shrink-0 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
          aria-label={tCommon('back')}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        {/* 搜索输入框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            // biome-ignore lint/a11y/noAutofocus: Search page needs auto-focus for better UX
            autoFocus
            className={cn(
              'w-full rounded-sm border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none',
              'transition-colors'
            )}
          />
          {/* 清除/加载指示器 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={tCommon('clear')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1">
        {showResults ? (
          // 搜索结果
          hasResults ? (
            <div>
              {results.map((entry) => (
                <SearchResultItem
                  key={entry.id}
                  entry={entry}
                  keyword={debouncedQuery}
                  onClick={() => handleResultClick(entry)}
                  locale={i18n.language}
                />
              ))}
            </div>
          ) : !isSearching ? (
            // 无结果
            <div className="flex flex-col items-center justify-center px-4 py-16">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {t('noResults', { keyword: debouncedQuery })}
              </p>
            </div>
          ) : null
        ) : (
          // 初始状态：显示搜索历史
          <div>
            {hasHistory ? (
              <>
                <div className="px-4 py-2 text-xs text-muted-foreground">{t('history')}</div>
                {searchHistory.map((historyQuery) => (
                  <SearchHistoryItem
                    key={historyQuery}
                    query={historyQuery}
                    onClick={() => handleHistoryClick(historyQuery)}
                    onRemove={() => handleHistoryRemove(historyQuery)}
                    removeLabel={tCommon('remove')}
                  />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-16">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">{t('hint')}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
