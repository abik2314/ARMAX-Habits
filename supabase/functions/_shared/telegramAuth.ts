import { HttpError } from './http.ts'

interface TelegramInitDataUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqualHex(left: string, right: string) {
  if (left.length !== right.length) {
    return false
  }

  let result = 0

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return result === 0
}

async function hmacSha256(key: ArrayBuffer | string, value: string) {
  const encoder = new TextEncoder()
  const rawKey = typeof key === 'string' ? encoder.encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))
}

export async function verifyTelegramInitData(initData: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()

  if (!botToken) {
    throw new HttpError(503, 'Telegram bot token is not configured')
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash') ?? ''

  if (!hash) {
    throw new HttpError(401, 'Telegram initData hash is missing')
  }

  params.delete('hash')
  params.delete('signature')

  const authDate = Number(params.get('auth_date') ?? 0)
  const maxAgeSeconds = Number(Deno.env.get('TELEGRAM_INIT_DATA_MAX_AGE_SECONDS') ?? 86400)

  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new HttpError(401, 'Telegram initData expired')
  }

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secretKey = await hmacSha256('WebAppData', botToken)
  const calculatedHash = toHex(await hmacSha256(secretKey, dataCheckString))

  if (!timingSafeEqualHex(calculatedHash, hash)) {
    throw new HttpError(401, 'Telegram initData signature is invalid')
  }

  const userPayload = params.get('user')

  if (!userPayload) {
    throw new HttpError(401, 'Telegram initData user is missing')
  }

  const user = JSON.parse(userPayload) as TelegramInitDataUser

  if (!user.id) {
    throw new HttpError(401, 'Telegram user id is missing')
  }

  return user
}
