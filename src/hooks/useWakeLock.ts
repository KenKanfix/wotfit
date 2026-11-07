import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const wakeLock = (
      navigator as Navigator & { wakeLock?: WakeLockLike }
    ).wakeLock
    if (!wakeLock) return

    const state: { sentinel: WakeLockSentinelLike | null } = { sentinel: null }

    const acquire = async () => {
      try {
        state.sentinel = await wakeLock.request('screen')
      } catch {
        state.sentinel = null
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.sentinel) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (state.sentinel) void state.sentinel.release().catch(() => undefined)
      state.sentinel = null
    }
  }, [enabled])
}
