import {
  expandViewport,
  hapticFeedbackImpactOccurred,
  hapticFeedbackNotificationOccurred,
  hapticFeedbackSelectionChanged,
  init,
  initDataUser,
  miniAppReady,
  mountMiniAppSync,
  restoreInitData,
  isThemeParamsDark,
  setMiniAppBackgroundColor,
  setMiniAppBottomBarColor,
  setMiniAppHeaderColor,
  type ImpactHapticFeedbackStyle,
  type NotificationHapticFeedbackType,
  type User,
} from '@telegram-apps/sdk'
import type { TelegramProfile } from '../types/telegram'

interface LegacyTelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id?: number
      first_name?: string
      last_name?: string
      username?: string
      photo_url?: string
      language_code?: string
      is_premium?: boolean
    }
  }
  HapticFeedback?: {
    impactOccurred?: (style: ImpactHapticFeedbackStyle) => void
    notificationOccurred?: (type: NotificationHapticFeedbackType) => void
    selectionChanged?: () => void
  }
  ready?: () => void
  expand?: () => void
  setBackgroundColor?: (color: string) => void
  setHeaderColor?: (color: string) => void
}

interface LegacyTelegramWindow extends Window {
  Telegram?: {
    WebApp?: LegacyTelegramWebApp
  }
}

let cleanupSdk: VoidFunction | undefined

function getLegacyWebApp() {
  return (window as LegacyTelegramWindow).Telegram?.WebApp
}

function toProfile(user: User | NonNullable<LegacyTelegramWebApp['initDataUnsafe']>['user']): TelegramProfile {
  return {
    id: user?.id,
    firstName: user?.first_name ?? 'Гость',
    lastName: user?.last_name,
    username: user?.username,
    photoUrl: user?.photo_url,
    languageCode: user?.language_code,
    isPremium: user?.is_premium,
  }
}

function safeCall(callback: () => void) {
  try {
    callback()
  } catch {
    return
  }
}

export function setupTelegramApp() {
  if (!cleanupSdk) {
    safeCall(() => {
      cleanupSdk = init({ acceptCustomStyles: false })
    })
  }

  safeCall(() => restoreInitData())
  safeCall(() => {
    if (mountMiniAppSync.isAvailable()) {
      mountMiniAppSync()
    }
  })
  safeCall(() => {
    if (setMiniAppBackgroundColor.isAvailable()) {
      setMiniAppBackgroundColor('#0B1020')
    }
  })
  safeCall(() => {
    if (setMiniAppHeaderColor.isAvailable() && setMiniAppHeaderColor.supports.rgb()) {
      setMiniAppHeaderColor('#0B1020')
    }
  })
  safeCall(() => {
    if (setMiniAppBottomBarColor.isAvailable()) {
      setMiniAppBottomBarColor('#151B2E')
    }
  })
  safeCall(() => {
    if (expandViewport.isAvailable()) {
      expandViewport()
    }
  })
  safeCall(() => {
    if (miniAppReady.isAvailable()) {
      miniAppReady()
    }
  })

  const legacy = getLegacyWebApp()
  safeCall(() => legacy?.setBackgroundColor?.('#0B1020'))
  safeCall(() => legacy?.setHeaderColor?.('#0B1020'))
  safeCall(() => legacy?.expand?.())
  safeCall(() => legacy?.ready?.())

  return cleanupSdk
}

export function getTelegramProfile(): TelegramProfile | null {
  safeCall(() => restoreInitData())

  try {
    const user = initDataUser()
    if (user) {
      return toProfile(user)
    }
  } catch {
    const legacyUser = getLegacyWebApp()?.initDataUnsafe?.user
    return legacyUser ? toProfile(legacyUser) : null
  }

  const legacyUser = getLegacyWebApp()?.initDataUnsafe?.user
  return legacyUser ? toProfile(legacyUser) : null
}

export function hapticImpact(style: ImpactHapticFeedbackStyle = 'light') {
  safeCall(() => {
    if (hapticFeedbackImpactOccurred.isAvailable()) {
      hapticFeedbackImpactOccurred(style)
      return
    }

    getLegacyWebApp()?.HapticFeedback?.impactOccurred?.(style)
  })
}

export function hapticSuccess() {
  safeCall(() => {
    if (hapticFeedbackNotificationOccurred.isAvailable()) {
      hapticFeedbackNotificationOccurred('success')
      return
    }

    getLegacyWebApp()?.HapticFeedback?.notificationOccurred?.('success')
  })
}

export function hapticSelection() {
  safeCall(() => {
    if (hapticFeedbackSelectionChanged.isAvailable()) {
      hapticFeedbackSelectionChanged()
      return
    }

    getLegacyWebApp()?.HapticFeedback?.selectionChanged?.()
  })
}

export function getTelegramPreferredTheme(): 'dark' | 'light' | null {
  try {
    const isDark = isThemeParamsDark()
    return isDark ? 'dark' : 'light'
  } catch {
    return null
  }
}
