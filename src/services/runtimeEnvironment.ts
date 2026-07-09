import type { LaunchEnvironment, SafeAreaInsets } from '../types/runtime'

interface TelegramWebAppLike {
  initData?: string
  initDataUnsafe?: {
    user?: unknown
  }
  safeAreaInset?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>
  contentSafeAreaInset?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebAppLike
  }
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
  userAgentData?: {
    platform?: string
  }
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

const emptyInsets: SafeAreaInsets = {
  top: '0px',
  right: '0px',
  bottom: '0px',
  left: '0px',
}

export function getTelegramWebApp() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as TelegramWindow).Telegram?.WebApp
}

function hasTelegramLaunchParams() {
  if (typeof window === 'undefined') {
    return false
  }

  const search = new URLSearchParams(window.location.search)
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const hashParams = new URLSearchParams(hash)

  return Boolean(
    search.has('tgWebAppData') ||
      search.has('tgWebAppVersion') ||
      hashParams.has('tgWebAppData') ||
      hashParams.has('tgWebAppVersion') ||
      window.location.hash.includes('tgWebAppData'),
  )
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = navigator as NavigatorWithStandalone

  return window.matchMedia('(display-mode: standalone)').matches || Boolean(navigatorWithStandalone.standalone)
}

function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const navigatorWithStandalone = navigator as NavigatorWithStandalone
  const platform = navigatorWithStandalone.userAgentData?.platform ?? navigator.platform
  const userAgent = navigator.userAgent
  const isTouchMac = platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return /iPad|iPhone|iPod/i.test(userAgent) || isTouchMac
}

function isIphoneDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /iPhone|iPod/i.test(navigator.userAgent)
}

function isCapacitorRuntime() {
  return typeof window !== 'undefined' && Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.())
}

function getTelegramSafeAreaInsets(): SafeAreaInsets {
  const webApp = getTelegramWebApp()
  const insets = webApp?.contentSafeAreaInset ?? webApp?.safeAreaInset

  if (!insets) {
    return emptyInsets
  }

  return {
    top: typeof insets.top === 'number' ? `${insets.top}px` : emptyInsets.top,
    right: typeof insets.right === 'number' ? `${insets.right}px` : emptyInsets.right,
    bottom: typeof insets.bottom === 'number' ? `${insets.bottom}px` : emptyInsets.bottom,
    left: typeof insets.left === 'number' ? `${insets.left}px` : emptyInsets.left,
  }
}

export function getLaunchEnvironment(): LaunchEnvironment {
  const webApp = getTelegramWebApp()
  const hasTelegramSdk = Boolean(webApp)
  const hasTelegramInitData = Boolean(webApp?.initData || webApp?.initDataUnsafe?.user || hasTelegramLaunchParams())
  const isTelegram = hasTelegramSdk || hasTelegramInitData
  const isStandalone = isStandaloneDisplay()
  const isPwa = !isTelegram && isStandalone
  const isIos = isIosDevice()

  return {
    mode: isTelegram ? 'telegram' : isPwa ? 'pwa' : 'browser',
    isTelegram,
    isBrowser: !isTelegram && !isPwa,
    isPwa,
    isStandalone,
    isIos,
    isIphone: isIphoneDevice(),
    isCapacitor: isCapacitorRuntime(),
    hasTelegramSdk,
    hasTelegramInitData,
    supportsSafeArea: isTelegram || isIos || isStandalone,
    safeAreaInsets: getTelegramSafeAreaInsets(),
  }
}

export function applyLaunchEnvironmentToDocument(environment = getLaunchEnvironment()) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.launchMode = environment.mode
  root.classList.toggle('is-telegram', environment.isTelegram)
  root.classList.toggle('is-pwa', environment.isPwa)
  root.classList.toggle('is-ios', environment.isIos)
  root.style.setProperty('--telegram-safe-area-top', environment.safeAreaInsets.top)
  root.style.setProperty('--telegram-safe-area-right', environment.safeAreaInsets.right)
  root.style.setProperty('--telegram-safe-area-bottom', environment.safeAreaInsets.bottom)
  root.style.setProperty('--telegram-safe-area-left', environment.safeAreaInsets.left)
}
