/**
 * 注册 Service Worker
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      // 检查更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本已安装，可以提示用户刷新
              console.log('[SW] New content available, please refresh.')
            }
          })
        }
      })

      console.log('[SW] Service Worker registered successfully')
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error)
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    void register()
  } else {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        void register()
      },
      { once: true },
    )
  }
}
