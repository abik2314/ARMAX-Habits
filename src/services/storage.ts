import { getTelegramProfile } from './telegram'

export interface KeyValueStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const memoryStorage = new Map<string, string>()
export const legacyHabitStorageKey = 'armax-habits-storage'
const migrationPrefix = 'armax-habits:migration:'
const postponedPrefix = 'armax-habits:migration-postponed:'

export interface HabitStorageIdentity {
  kind: 'telegram' | 'guest'
  id: string
  storageKey: string
}

function readRawStorage(key: string) {
  try {
    return typeof window === 'undefined' ? memoryStorage.get(key) ?? null : window.localStorage.getItem(key)
  } catch {
    return memoryStorage.get(key) ?? null
  }
}

function writeRawStorage(key: string, value: string) {
  try {
    if (typeof window === 'undefined') {
      memoryStorage.set(key, value)
      return
    }

    window.localStorage.setItem(key, value)
  } catch {
    memoryStorage.set(key, value)
  }
}

function removeRawStorage(key: string) {
  try {
    if (typeof window === 'undefined') {
      memoryStorage.delete(key)
      return
    }

    window.localStorage.removeItem(key)
  } catch {
    memoryStorage.delete(key)
  }
}

export const storageService: KeyValueStorage = {
  getItem: (key) => {
    if (key === legacyHabitStorageKey) {
      return getScopedHabitStorageValue()
    }

    return readRawStorage(key)
  },
  setItem: (key, value) => {
    if (key === legacyHabitStorageKey) {
      writeRawStorage(getHabitStorageIdentity().storageKey, value)
      return
    }

    writeRawStorage(key, value)
  },
  removeItem: (key) => {
    if (key === legacyHabitStorageKey) {
      removeRawStorage(getHabitStorageIdentity().storageKey)
      return
    }

    removeRawStorage(key)
  },
}

export function getOrCreateDeviceId() {
  const key = 'armax-habits-device-id'
  const existing = storageService.getItem(key)

  if (existing) {
    return existing
  }

  const next =
    typeof window !== 'undefined' && window.crypto.randomUUID
      ? `device-${window.crypto.randomUUID()}`
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

  storageService.setItem(key, next)
  return next
}

export function getHabitStorageIdentity(): HabitStorageIdentity {
  const telegramId = getTelegramProfile()?.id

  if (telegramId) {
    return {
      kind: 'telegram',
      id: String(telegramId),
      storageKey: `armax-habits:user:${telegramId}`,
    }
  }

  const deviceId = getOrCreateDeviceId()

  return {
    kind: 'guest',
    id: deviceId,
    storageKey: `armax-habits:guest:${deviceId}`,
  }
}

function getScopedHabitStorageValue() {
  const identity = getHabitStorageIdentity()
  const scopedValue = readRawStorage(identity.storageKey)

  if (scopedValue) {
    return scopedValue
  }

  const legacyValue = readRawStorage(legacyHabitStorageKey)

  if (identity.kind === 'guest' && legacyValue) {
    writeRawStorage(identity.storageKey, legacyValue)
    return legacyValue
  }

  return null
}

export function hasLegacyHabitData() {
  return Boolean(readRawStorage(legacyHabitStorageKey))
}

export function hasScopedHabitData(identity = getHabitStorageIdentity()) {
  return Boolean(readRawStorage(identity.storageKey))
}

export function shouldAskToBindLegacyData() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram' || !hasLegacyHabitData() || hasScopedHabitData(identity)) {
    return false
  }

  if (readRawStorage(`${migrationPrefix}${identity.id}`) === 'clean') {
    return false
  }

  if (typeof window !== 'undefined' && window.sessionStorage.getItem(`${postponedPrefix}${identity.id}`) === '1') {
    return false
  }

  return true
}

export function bindLegacyDataToTelegramProfile() {
  const identity = getHabitStorageIdentity()
  const legacyValue = readRawStorage(legacyHabitStorageKey)

  if (identity.kind !== 'telegram' || !legacyValue) {
    return false
  }

  writeRawStorage(identity.storageKey, legacyValue)
  writeRawStorage(`${migrationPrefix}${identity.id}`, 'bound')
  return true
}

export function startCleanTelegramProfile() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram') {
    return false
  }

  writeRawStorage(`${migrationPrefix}${identity.id}`, 'clean')
  return true
}

export function postponeTelegramProfileBinding() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram' || typeof window === 'undefined') {
    return false
  }

  window.sessionStorage.setItem(`${postponedPrefix}${identity.id}`, '1')
  return true
}
