import { useEffect } from 'react'
import { setupTelegramApp } from '../services/telegram'

export function useTelegramApp() {
  useEffect(() => {
    setupTelegramApp()
  }, [])
}
