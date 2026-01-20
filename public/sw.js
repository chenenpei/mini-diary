// MiniDiary Service Worker
const CACHE_NAME = 'mini-diary-v2'
const STATIC_CACHE_NAME = 'mini-diary-static-v2'

// 静态资源缓存列表（只包含真正的静态文件，不包含 SSR 路由）
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
]

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // 立即激活新的 Service Worker
  self.skipWaiting()
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
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
            return cached || caches.match('/')
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
