import type { AccountUserId } from '../services/storage'
import type { ExportedHabitData } from './habit'
import type { TelegramProfile } from './telegram'

export type TelegramLinkStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'completed' | 'failed'

export interface TelegramLinkRequest {
  guestId: AccountUserId
  guestUserId?: AccountUserId
  deviceId: string
  returnUrl: string
  snapshot?: ExportedHabitData
}

export interface TelegramLinkResponse {
  requestId: string
  linkToken: string
  status: TelegramLinkStatus
  telegramUrl: string
  expiresAt: string
  pollingIntervalMs?: number
}

export interface TelegramLinkStatusResponse {
  requestId: string
  status: TelegramLinkStatus
  expiresAt?: string
  accountUserId?: AccountUserId
  telegramProfile?: TelegramProfile
  message?: string
}

export interface TelegramSessionAccount {
  id: string
  userId: AccountUserId
  telegramId: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  photoUrl?: string | null
  languageCode?: string | null
}

export interface TelegramSessionResponse {
  sessionToken: string
  expiresAt: string
  account: TelegramSessionAccount
}

export interface SyncPullResponse {
  account: TelegramSessionAccount
  snapshot: ExportedHabitData
}

export interface SyncPushResponse {
  ok: boolean
  accountUserId: AccountUserId
}
