import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const supported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/**
 * Reports whether the service worker has cached the app. "Ready" stays true on later visits,
 * when the worker already controls the page, not only on the very first install.
 */
export function useOfflineReady() {
  const {
    offlineReady: [installedNow],
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
    },
  })
  const [controlled, setControlled] = useState(() => supported() && !!navigator.serviceWorker.controller)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    if (!supported()) return undefined
    const onChange = () => setControlled(!!navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return { supported: supported(), ready: installedNow || controlled, online }
}
