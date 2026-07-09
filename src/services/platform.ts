import { getTelegramPreferredTheme, getTelegramProfile, hapticImpact } from './telegram'
import { getOrCreateDeviceId } from './storage'
import { getLaunchEnvironment } from './runtimeEnvironment'

export const platformService = {
  getEnvironment: () => getLaunchEnvironment(),
  isTelegram: () => getLaunchEnvironment().isTelegram,
  isPWA: () => getLaunchEnvironment().isPwa,
  isIOS: () => getLaunchEnvironment().isIos,
  isCapacitor: () => getLaunchEnvironment().isCapacitor,
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
