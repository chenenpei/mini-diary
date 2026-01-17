import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { ToastProvider } from '@/components/ui'
import { registerServiceWorker } from '@/lib/registerSW'
import '@/i18n'
import i18n from '@/i18n'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
      },
      {
        name: 'theme-color',
        content: '#ffffff',
      },
      {
        title: 'MiniDiary',
      },
      {
        name: 'description',
        content: '极简主义日记应用',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'MiniDiary',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
  // 注册 Service Worker
  useEffect(() => {
    registerServiceWorker()
  }, [])

  // 获取当前语言
  const currentLang = i18n.language || 'zh-CN'

  return (
    <html lang={currentLang}>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <Outlet />
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}
