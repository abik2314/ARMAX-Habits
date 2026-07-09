import type { TelegramLinkRequest, TelegramLinkResponse, TelegramLinkStatusResponse } from '../types/telegramLink'

const defaultPollingIntervalMs = 2500

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_ARMAX_API_BASE_URL?.trim()

  return configured ? configured.replace(/\/$/, '') : ''
}

function endpoint(path: string) {
  return `${getApiBaseUrl()}${path}`
}

function isJsonResponse(response: Response) {
  return response.headers.get('content-type')?.includes('application/json')
}

async function readApiError(response: Response) {
  if (isJsonResponse(response)) {
    const payload = (await response.json()) as { message?: string; error?: string }
    return payload.message ?? payload.error ?? `HTTP ${response.status}`
  }

  return response.status === 404
    ? 'Сервер привязки Telegram не настроен. Нужны защищённые API и база данных.'
    : `HTTP ${response.status}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as T
}

export async function createTelegramLinkRequest(request: TelegramLinkRequest) {
  const response = await requestJson<TelegramLinkResponse>('/api/telegram/link/start', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  return {
    ...response,
    pollingIntervalMs: response.pollingIntervalMs ?? defaultPollingIntervalMs,
  }
}

export function getTelegramLinkStatus(requestId: string) {
  return requestJson<TelegramLinkStatusResponse>(
    `/api/telegram/link/status?requestId=${encodeURIComponent(requestId)}`,
  )
}

export function cancelTelegramLinkRequest(requestId: string) {
  return requestJson<TelegramLinkStatusResponse>('/api/telegram/link/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}
