import type {
  SyncPullResponse,
  SyncPushResponse,
  TelegramLinkRequest,
  TelegramLinkResponse,
  TelegramLinkStatusResponse,
  TelegramSessionResponse,
} from '../types/telegramLink'

const defaultPollingIntervalMs = 2500
const missingBackendMessage =
  'Supabase backend для привязки Telegram не настроен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, затем задеплойте Edge Functions.'

function getSupabaseFunctionsBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()

  if (!supabaseUrl) {
    throw new Error(missingBackendMessage)
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
}

function getPublicHeaders(extraHeaders?: HeadersInit) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  const headers = new Headers(extraHeaders)

  headers.set('Content-Type', 'application/json')

  if (anonKey) {
    headers.set('apikey', anonKey)
    headers.set('Authorization', `Bearer ${anonKey}`)
  }

  return headers
}

function endpoint(functionName: string) {
  return `${getSupabaseFunctionsBaseUrl()}/${functionName}`
}

function isJsonResponse(response: Response) {
  return response.headers.get('content-type')?.includes('application/json')
}

async function readApiError(response: Response) {
  if (isJsonResponse(response)) {
    const payload = (await response.json()) as { message?: string; error?: string }
    return payload.message ?? payload.error ?? `HTTP ${response.status}`
  }

  return response.status === 404 ? 'Supabase Edge Function не найдена или ещё не задеплоена.' : `HTTP ${response.status}`
}

async function requestJson<T>(functionName: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(endpoint(functionName), {
      credentials: 'include',
      headers: getPublicHeaders(init?.headers),
      ...init,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Не удалось подключиться к Supabase backend. Проверьте URL проекта и деплой Edge Functions.')
    }

    throw error
  }

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as T
}

export async function createTelegramLinkRequest(request: TelegramLinkRequest) {
  const response = await requestJson<TelegramLinkResponse>('create-link-request', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  return {
    ...response,
    pollingIntervalMs: response.pollingIntervalMs ?? defaultPollingIntervalMs,
  }
}

export function getTelegramLinkStatus(linkToken: string) {
  return requestJson<TelegramLinkStatusResponse>(
    `get-link-status?linkToken=${encodeURIComponent(linkToken)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

export function createTelegramSession(linkToken: string) {
  return requestJson<TelegramSessionResponse>('create-session', {
    method: 'POST',
    body: JSON.stringify({ linkToken }),
  })
}

export function createTelegramSessionFromInitData(initData: string) {
  return requestJson<TelegramSessionResponse>('create-session', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  })
}

export function syncPull(sessionToken: string) {
  return requestJson<SyncPullResponse>('sync-pull', {
    method: 'POST',
    headers: {
      'x-armax-session': sessionToken,
    },
    body: JSON.stringify({}),
  })
}

export function syncPush(request: TelegramLinkRequest, sessionToken?: string) {
  return requestJson<SyncPushResponse>('sync-push', {
    method: 'POST',
    headers: sessionToken
      ? {
          'x-armax-session': sessionToken,
        }
      : undefined,
    body: JSON.stringify(request),
  })
}
