import { sha256Hex } from '../_shared/crypto.ts'
import { errorResponse, HttpError, jsonResponse, optionsResponse } from '../_shared/http.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramMessage {
  message_id: number
  chat: { id: number }
  text?: string
  from?: TelegramUser
}

interface TelegramCallbackQuery {
  id: string
  data?: string
  from: TelegramUser
  message?: TelegramMessage
}

interface TelegramUpdate {
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

function getBotToken() {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()

  if (!token) {
    throw new HttpError(503, 'Telegram bot token is not configured')
  }

  return token
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${getBotToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Telegram API ${method} failed: ${text}`)
  }
}

function tokenFromStart(text: string) {
  const match = text.match(/^\/start(?:@\w+)?\s+link_([A-Za-z0-9_-]+)$/)
  return match?.[1] ?? ''
}

async function handleStart(message: TelegramMessage) {
  const token = tokenFromStart(message.text ?? '')

  if (!token) {
    await telegram('sendMessage', {
      chat_id: message.chat.id,
      text: 'Откройте привязку из ARMAX Habits: кнопка создаст одноразовую ссылку для Telegram.',
    })
    return
  }

  await telegram('sendMessage', {
    chat_id: message.chat.id,
    text: 'ARMAX Habits запрашивает привязку этого профиля к вашему Telegram-аккаунту.',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Подключить', callback_data: `link:approve:${token}` },
          { text: 'Отказаться', callback_data: `link:decline:${token}` },
        ],
      ],
    },
  })
}

async function declineLink(callback: TelegramCallbackQuery, token: string) {
  const supabase = getSupabaseAdmin()
  const tokenHash = await sha256Hex(token)
  const { error } = await supabase
    .from('link_requests')
    .update({ status: 'declined', completed_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')

  if (error) {
    throw error
  }

  await telegram('answerCallbackQuery', {
    callback_query_id: callback.id,
    text: 'Подключение отменено',
  })

  if (callback.message) {
    await telegram('editMessageText', {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      text: 'Подключение Telegram отменено. Данные гостевого профиля остались без изменений.',
    })
  }
}

async function approveLink(callback: TelegramCallbackQuery, token: string) {
  const supabase = getSupabaseAdmin()
  const result = await supabase.rpc('complete_telegram_link_request', {
    p_token_hash: await sha256Hex(token),
    p_telegram_id: callback.from.id,
    p_first_name: callback.from.first_name ?? null,
    p_last_name: callback.from.last_name ?? null,
    p_username: callback.from.username ?? null,
    p_photo_url: null,
    p_language_code: callback.from.language_code ?? null,
  })

  if (result.error) {
    throw result.error
  }

  const payload = result.data as { ok?: boolean; status?: string; message?: string } | null
  const ok = Boolean(payload?.ok)
  const status = payload?.status ?? 'failed'

  await telegram('answerCallbackQuery', {
    callback_query_id: callback.id,
    text: ok ? 'Telegram подключён' : payload?.message ?? 'Не удалось подключить Telegram',
  })

  if (callback.message) {
    const text = ok
      ? 'Telegram подключён. Вернитесь в ARMAX Habits: приложение восстановит данные из общего профиля.'
      : status === 'expired'
        ? 'Срок запроса истёк. Создайте новый запрос в ARMAX Habits.'
        : payload?.message ?? 'Не удалось подключить Telegram. Попробуйте создать новый запрос.'

    await telegram('editMessageText', {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      text,
    })
  }
}

async function handleCallback(callback: TelegramCallbackQuery) {
  const [kind, action, token] = (callback.data ?? '').split(':')

  if (kind !== 'link' || !token || (action !== 'approve' && action !== 'decline')) {
    throw new HttpError(400, 'Unsupported callback')
  }

  if (action === 'decline') {
    await declineLink(callback, token)
    return
  }

  await approveLink(callback, token)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed')
    }

    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')?.trim()

    if (expectedSecret && request.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
      throw new HttpError(401, 'Invalid Telegram webhook secret')
    }

    const update = (await request.json()) as TelegramUpdate

    if (update.message) {
      await handleStart(update.message)
    } else if (update.callback_query) {
      await handleCallback(update.callback_query)
    }

    return jsonResponse(request, { ok: true })
  } catch (error) {
    return errorResponse(request, error)
  }
})
