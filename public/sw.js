// MiniDiary Service Worker
const CACHE_NAME = 'mini-diary-v3'
const STATIC_CACHE_NAME = 'mini-diary-static-v3'

// 离线 fallback 页面（当首页缓存失败时显示）
const OFFLINE_FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MiniDiary - 离线</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      color: #333;
      margin: 0 0 1rem 0;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MiniDiary</h1>
    <p>请连接网络后重新打开应用</p>
    <p style="font-size: 0.875rem; margin-top: 2rem;">
      应用需要首次联网加载，之后即可离线使用
    </p>
  </div>
</body>
</html>
`

// 静态资源缓存列表（只包含真正的静态文件，不包含 SSR 路由）
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
]

// 安装事件 - 缓存静态资源和首页
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // 缓存静态资源（必须成功，否则安装失败）
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS)
      }),
      // 尝试缓存首页（失败不影响安装）
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch('/')
          if (response.ok) {
            await cache.put('/', response)
            console.log('[SW] Homepage cached during install')
          }
        } catch (error) {
          console.log('[SW] Failed to cache homepage during install, will retry on activate:', error)
        }
      }),
    ])
  )
  // 立即激活新的 Service Worker
  self.skipWaiting()
})

// 激活事件 - 清理旧缓存并预缓存首页
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      }),
      // 预缓存首页 HTML（确保离线时能打开 PWA）
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch('/')
          if (response.ok) {
            await cache.put('/', response)
            console.log('[SW] Homepage cached successfully')
          }
        } catch (error) {
          console.log('[SW] Failed to cache homepage, will cache on first visit:', error)
        }
      }),
    ])
  )
  // 立即控制所有客户端
  self.clients.claim()
})

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return
  }

  // 对于导航请求，使用网络优先策略
  // 使用 pathname 作为缓存键，避免查询参数导致缓存未命中
  if (request.mode === 'navigate') {
    const cacheKey = url.pathname

    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存成功的响应
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(cacheKey, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败时使用缓存：先尝试精确匹配，再回退到根路径
          return caches.match(cacheKey).then((cached) => {
            if (cached) return cached
            return caches.match('/').then((rootCached) => {
              // 如果根路径也没缓存，返回离线 fallback 页面
              if (rootCached) return rootCached
              return new Response(OFFLINE_FALLBACK_HTML, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              })
            })
          })
        })
    )
    return
  }

  // 对于静态资源，使用缓存优先策略
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // 在后台更新缓存（静默失败，不影响返回）
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(request, response)
                })
              }
            })
            .catch(() => {
              // 网络失败时静默忽略，使用缓存即可
            })
          return cached
        }

        // 没有缓存，从网络获取并缓存
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // 网络失败且无缓存，返回离线提示（对于关键资源这种情况很少见）
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          })
      })
    )
    return
  }

  // 其他请求：网络优先，失败时尝试缓存
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功响应以备离线使用
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // 网络失败时尝试从缓存获取
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
      })
  )
})
