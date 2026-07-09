import { getTelegramProfile } from './telegram'

export interface KeyValueStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type HabitStorageKind = 'telegram' | 'guest'
export type AccountUserId = `telegram:${string}` | `guest:${string}`

export interface HabitStorageIdentity {
  kind: HabitStorageKind
  id: AccountUserId
  userId: AccountUserId
  rawId: string
  storageKey: string
  legacyStorageKeys: string[]
}

const memoryStorage = new Map<string, string>()

export const legacyHabitStorageKey = 'armax-habits-storage'
const legacyDeviceIdKey = 'armax-habits-device-id'

export const storageKeys = {
  guestId: 'armax_habits_guest_id',
  data: (userId: AccountUserId) => `armax_habits_data_${userId}`,
  settings: (userId: AccountUserId) => `armax_habits_settings_${userId}`,
  achievements: (userId: AccountUserId) => `armax_habits_achievements_${userId}`,
  migration: (userId: AccountUserId) => `armax_habits_migration_${userId}`,
  postponedMigration: (userId: AccountUserId) => `armax_habits_migration_postponed_${userId}`,
  telegramLinkRequest: 'armax_habits_telegram_link_request',
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

function createUuid() {
  if (typeof window !== 'undefined' && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeGuestId(value: string) {
  if (value.startsWith('guest:')) {
    return value.slice('guest:'.length)
  }

  if (value.startsWith('device-')) {
    return value.slice('device-'.length)
  }

  return value
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

export function getOrCreateGuestId() {
  const existing = readRawStorage(storageKeys.guestId)

  if (existing) {
    return normalizeGuestId(existing)
  }

  const legacyDeviceId = readRawStorage(legacyDeviceIdKey)
  const next = legacyDeviceId ? normalizeGuestId(legacyDeviceId) : createUuid()

  writeRawStorage(storageKeys.guestId, next)
  return next
}

export function getOrCreateDeviceId() {
  const existing = readRawStorage(legacyDeviceIdKey)

  if (existing) {
    return existing
  }

  const next = `device-${getOrCreateGuestId()}`
  writeRawStorage(legacyDeviceIdKey, next)
  return next
}

export function toAccountUserId(kind: 'guest', rawId: string): `guest:${string}`
export function toAccountUserId(kind: 'telegram', rawId: string): `telegram:${string}`
export function toAccountUserId(kind: HabitStorageKind, rawId: string): AccountUserId {
  return kind === 'telegram' ? `telegram:${rawId}` : `guest:${normalizeGuestId(rawId)}`
}

export function getGuestStorageIdentity(): HabitStorageIdentity {
  const rawId = getOrCreateGuestId()
  const userId = toAccountUserId('guest', rawId)
  const deviceId = getOrCreateDeviceId()

  return {
    kind: 'guest',
    id: userId,
    userId,
    rawId,
    storageKey: storageKeys.data(userId),
    legacyStorageKeys: [`armax-habits:guest:${deviceId}`, `armax-habits:guest:${rawId}`],
  }
}

export function getHabitStorageIdentity(): HabitStorageIdentity {
  const telegramId = getTelegramProfile()?.id

  if (telegramId) {
    const rawId = String(telegramId)
    const userId = toAccountUserId('telegram', rawId)

    return {
      kind: 'telegram',
      id: userId,
      userId,
      rawId,
      storageKey: storageKeys.data(userId),
      legacyStorageKeys: [`armax-habits:user:${rawId}`],
    }
  }

  return getGuestStorageIdentity()
}

function findFirstStoredValue(keys: string[]) {
  for (const key of keys) {
    const value = readRawStorage(key)

    if (value) {
      return { key, value }
    }
  }

  return null
}

function getScopedHabitStorageValue() {
  const identity = getHabitStorageIdentity()
  const stored = findFirstStoredValue([identity.storageKey, ...identity.legacyStorageKeys])

  if (stored) {
    if (stored.key !== identity.storageKey) {
      writeRawStorage(identity.storageKey, stored.value)
    }

    return stored.value
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
  return Boolean(findFirstStoredValue([identity.storageKey, ...identity.legacyStorageKeys]))
}

export function shouldAskToBindLegacyData() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram' || !hasLegacyHabitData() || hasScopedHabitData(identity)) {
    return false
  }

  if (readRawStorage(storageKeys.migration(identity.userId)) === 'clean') {
    return false
  }

  if (
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem(storageKeys.postponedMigration(identity.userId)) === '1'
  ) {
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
  writeRawStorage(storageKeys.migration(identity.userId), 'bound')
  return true
}

export function startCleanTelegramProfile() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram') {
    return false
  }

  writeRawStorage(storageKeys.migration(identity.userId), 'clean')
  return true
}

export function postponeTelegramProfileBinding() {
  const identity = getHabitStorageIdentity()

  if (identity.kind !== 'telegram' || typeof window === 'undefined') {
    return false
  }

  window.sessionStorage.setItem(storageKeys.postponedMigration(identity.userId), '1')
  return true
}
