import { useQuery } from '@tanstack/react-query'

interface StorageEstimate {
  usage: number
  quota: number
}

/**
 * 获取存储空间估算
 */
async function getStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 }
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    }
  } catch {
    return { usage: 0, quota: 0 }
  }
}

/**
 * 存储空间监控 hook
 */
export function useStorageEstimate() {
  return useQuery({
    queryKey: ['storage', 'estimate'],
    queryFn: getStorageEstimate,
    // 每分钟刷新一次
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}
