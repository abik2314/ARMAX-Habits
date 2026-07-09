const updateEventName = 'armax:pwa-update-available'

let waitingWorker: ServiceWorker | null = null
let isReloadingForUpdate = false

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          waitingWorker = registration.waiting
          window.dispatchEvent(new CustomEvent(updateEventName))
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing

          if (!worker) {
            return
          }

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = worker
              window.dispatchEvent(new CustomEvent(updateEventName))
            }
          })
        })
      })
      .catch(() => undefined)
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForUpdate) {
      return
    }

    isReloadingForUpdate = true
    window.location.reload()
  })
}

export function onPwaUpdateAvailable(callback: () => void) {
  window.addEventListener(updateEventName, callback)
  return () => window.removeEventListener(updateEventName, callback)
}

export function applyServiceWorkerUpdate() {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
}
