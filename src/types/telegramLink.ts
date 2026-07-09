import type { AccountUserId } from '../services/storage'
import type { TelegramProfile } from './telegram'

export type TelegramLinkStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'completed' | 'failed'

export interface TelegramLinkRequest {
  guestUserId: AccountUserId
  deviceId: string
  returnUrl: string
}

export interface TelegramLinkResponse {
  requestId: string
  status: TelegramLinkStatus
  telegramUrl: string
  expiresAt: string
  pollingIntervalMs?: number
}

export interface TelegramLinkStatusResponse {
  requestId: string
  status: TelegramLinkStatus
  expiresAt?: string
  telegramProfile?: TelegramProfile
  message?: string
}
