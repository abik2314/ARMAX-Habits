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
  'Supabase backend для привязки Telegram не настроен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY и задеплойте Edge Functions.'

interface SupabaseFrontendEnv {
  supabaseUrl: string
  anonKey: string
}

export interface TelegramBackendDiagnostics {
  isConfigured: boolean
  supabaseUrlFound: boolean
  anonKeyFound: boolean
  functionsEndpoint?: string
  message?: string
}

function readSupabaseFrontendEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  }
}

function normalizeSupabaseUrl(supabaseUrl: string) {
  return supabaseUrl
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/functions\/v1$/i, '')
}

export function getTelegramLinkBackendDiagnostics(): TelegramBackendDiagnostics {
  const { supabaseUrl, anonKey } = readSupabaseFrontendEnv()
  const supabaseUrlFound = Boolean(supabaseUrl)
  const anonKeyFound = Boolean(anonKey)
  const isConfigured = supabaseUrlFound && anonKeyFound

  return {
    isConfigured,
    supabaseUrlFound,
    anonKeyFound,
    functionsEndpoint: supabaseUrlFound ? `${normalizeSupabaseUrl(supabaseUrl)}/functions/v1` : undefined,
    message: isConfigured ? undefined : missingBackendMessage,
  }
}

function requireSupabaseFrontendEnv(): SupabaseFrontendEnv {
  const env = readSupabaseFrontendEnv()

  if (!env.supabaseUrl || !env.anonKey) {
    throw new Error(missingBackendMessage)
  }

  return env
}

function endpoint(functionName: string) {
  const { supabaseUrl } = requireSupabaseFrontendEnv()

  return `${normalizeSupabaseUrl(supabaseUrl)}/functions/v1/${functionName}`
}

function getPublicHeaders(extraHeaders?: HeadersInit) {
  const { anonKey } = requireSupabaseFrontendEnv()
  const headers = new Headers(extraHeaders)

  headers.set('Content-Type', 'application/json')
  headers.set('apikey', anonKey)
  headers.set('Authorization', `Bearer ${anonKey}`)

  return headers
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
      throw new Error('Не удалось подключиться к Supabase backend. Проверьте URL проекта, CORS и деплой Edge Functions.')
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
    body: JSON.stringify({
      guestId: request.guestId,
      deviceId: request.deviceId,
      returnUrl: request.returnUrl,
      snapshot: request.snapshot,
    }),
  })

  return {
    ...response,
    pollingIntervalMs: response.pollingIntervalMs ?? defaultPollingIntervalMs,
  }
}

export function getTelegramLinkStatus(linkToken: string) {
  return requestJson<TelegramLinkStatusResponse>('get-link-status', {
    method: 'POST',
    body: JSON.stringify({ linkToken }),
  })
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
