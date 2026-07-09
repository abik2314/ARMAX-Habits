export type LaunchMode = 'telegram' | 'browser' | 'pwa'

export interface SafeAreaInsets {
  top: string
  right: string
  bottom: string
  left: string
}

export interface LaunchEnvironment {
  mode: LaunchMode
  isTelegram: boolean
  isBrowser: boolean
  isPwa: boolean
  isStandalone: boolean
  isIos: boolean
  isIphone: boolean
  isCapacitor: boolean
  hasTelegramSdk: boolean
  hasTelegramInitData: boolean
  supportsSafeArea: boolean
  safeAreaInsets: SafeAreaInsets
}
