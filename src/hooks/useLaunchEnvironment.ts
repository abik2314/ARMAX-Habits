import { useEffect, useState } from 'react'
import type { LaunchEnvironment } from '../types/runtime'
import { applyLaunchEnvironmentToDocument, getLaunchEnvironment } from '../services/runtimeEnvironment'

export function useLaunchEnvironment(): LaunchEnvironment {
  const [environment, setEnvironment] = useState<LaunchEnvironment>(() => getLaunchEnvironment())

  useEffect(() => {
    const update = () => {
      const next = getLaunchEnvironment()
      applyLaunchEnvironmentToDocument(next)
      setEnvironment(next)
    }
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')

    update()
    standaloneQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      standaloneQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return environment
}
