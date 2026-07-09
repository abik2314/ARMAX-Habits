import { getTelegramPreferredTheme, getTelegramProfile, hapticImpact } from './telegram'
import { getOrCreateDeviceId } from './storage'

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

export const platformService = {
  isTelegram: () =>
    typeof window !== 'undefined' &&
    (Boolean((window as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp) || Boolean(getTelegramProfile()?.id)),
  isPWA: () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as { standalone?: boolean }).standalone)),
  isCapacitor: () =>
    typeof window !== 'undefined' && Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.()),
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  hapticFeedback: (style: Parameters<typeof hapticImpact>[0] = 'light') => hapticImpact(style),
  getTelegramUser: () => getTelegramProfile(),
  getTelegramId: () => {
    const id = getTelegramProfile()?.id
    return id ? String(id) : undefined
  },
  getTelegramPhotoUrl: () => getTelegramProfile()?.photoUrl,
  getTelegramTheme: () => getTelegramPreferredTheme(),
  getTheme: () =>
    getTelegramPreferredTheme() ??
    (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  getDeviceId: () => getOrCreateDeviceId(),
}
