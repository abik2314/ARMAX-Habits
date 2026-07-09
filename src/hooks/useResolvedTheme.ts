import { useEffect, useState } from 'react'
import type { ThemeMode } from '../types/habit'
import { getTelegramPreferredTheme } from '../services/telegram'

function getSystemTheme() {
  const telegramTheme = getTelegramPreferredTheme()

  if (telegramTheme) {
    return telegramTheme
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }

  return 'dark'
}

export function useResolvedTheme(theme: ThemeMode) {
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => getSystemTheme())

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => setSystemTheme(getSystemTheme())

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return theme === 'system' ? systemTheme : theme
}
