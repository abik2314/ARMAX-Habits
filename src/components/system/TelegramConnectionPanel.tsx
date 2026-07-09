import { AlertCircle, CheckCircle2, ExternalLink, Link2, RefreshCcw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLaunchEnvironment } from '../../hooks/useLaunchEnvironment'
import {
  createTelegramLinkRequest,
  createTelegramSession,
  createTelegramSessionFromInitData,
  getTelegramLinkBackendDiagnostics,
  getTelegramLinkStatus,
  syncPull,
} from '../../services/telegramLink'
import { getTelegramInitData } from '../../services/telegram'
import {
  getHabitStorageIdentity,
  getOrCreateDeviceId,
  storageKeys,
  storageService,
} from '../../services/storage'
import { useHabitStore } from '../../store/habitsStore'
import type { TelegramLinkStatus, TelegramSessionResponse } from '../../types/telegramLink'
import { normalizeSettings } from '../../utils/habits'
import { AnimatedButton } from '../ui/AnimatedButton'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'

interface SavedLinkRequest {
  requestId: string
  linkToken: string
  telegramUrl: string
  expiresAt: string
  pollingIntervalMs: number
}

type PanelState = 'idle' | 'creating' | 'pending' | 'syncing' | TelegramLinkStatus
type MiniAppRestoreState = 'idle' | 'syncing' | 'done' | 'failed'

function loadSavedRequest(): SavedLinkRequest | null {
  const raw = storageService.getItem(storageKeys.telegramLinkRequest)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedLinkRequest>

    if (parsed.requestId && parsed.linkToken && parsed.telegramUrl && parsed.expiresAt) {
      return {
        requestId: parsed.requestId,
        linkToken: parsed.linkToken,
        telegramUrl: parsed.telegramUrl,
        expiresAt: parsed.expiresAt,
        pollingIntervalMs: parsed.pollingIntervalMs ?? 2500,
      }
    }
  } catch {
    storageService.removeItem(storageKeys.telegramLinkRequest)
  }

  storageService.removeItem(storageKeys.telegramLinkRequest)
  return null
}

function saveRequest(request: SavedLinkRequest) {
  storageService.setItem(storageKeys.telegramLinkRequest, JSON.stringify(request))
}

function clearRequest() {
  storageService.removeItem(storageKeys.telegramLinkRequest)
}

function saveSession(session: TelegramSessionResponse) {
  storageService.setItem(storageKeys.telegramSession, session.sessionToken)
  storageService.setItem(storageKeys.telegramAccountUserId, session.account.userId)
}

function openTelegram(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')

  if (!opened) {
    window.location.assign(url)
  }
}

function statusMessage(status: TelegramLinkStatus) {
  if (status === 'declined') return 'Подключение отменено'
  if (status === 'expired') return 'Срок запроса истёк'
  if (status === 'completed' || status === 'approved') return 'Telegram подключён'
  if (status === 'failed') return 'Не удалось подключить Telegram'
  return ''
}

export function TelegramConnectionPanel() {
  const environment = useLaunchEnvironment()
  const rawSettings = useHabitStore((state) => state.settings)
  const exportData = useHabitStore((state) => state.exportData)
  const importData = useHabitStore((state) => state.importData)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const [savedRequest, setSavedRequest] = useState<SavedLinkRequest | null>(() => loadSavedRequest())
  const [panelState, setPanelState] = useState<PanelState>(() => (loadSavedRequest() ? 'pending' : 'idle'))
  const [miniAppRestoreState, setMiniAppRestoreState] = useState<MiniAppRestoreState>('idle')
  const [message, setMessage] = useState('')
  const [lastBackendStatus, setLastBackendStatus] = useState('')
  const backendDiagnostics = useMemo(() => getTelegramLinkBackendDiagnostics(), [])
  const identity = getHabitStorageIdentity()
  const telegramLabel = settings.profile.profileUsername
    ? `@${settings.profile.profileUsername}`
    : settings.profile.profileName || settings.profile.telegramId || identity.rawId
  const isConnected = identity.kind === 'telegram' || Boolean(settings.profile.telegramId)

  const restoreSnapshot = useCallback(async (session: TelegramSessionResponse) => {
    saveSession(session)
    const pulled = await syncPull(session.sessionToken)
    importData(pulled.snapshot)
  }, [importData])

  useEffect(() => {
    if (!environment.isTelegram || miniAppRestoreState !== 'idle') {
      return
    }

    const initData = getTelegramInitData()

    if (!initData) {
      return
    }

    let isActive = true

    const restore = async () => {
      setMiniAppRestoreState('syncing')

      try {
        const session = await createTelegramSessionFromInitData(initData)

        if (!isActive) {
          return
        }

        await restoreSnapshot(session)
        setLastBackendStatus('create-session:initData ok')
        setMiniAppRestoreState('done')
        setMessage('Данные Telegram-профиля восстановлены')
      } catch (error) {
        if (isActive) {
          setMiniAppRestoreState('failed')
          setLastBackendStatus('create-session:initData failed')
          setMessage(error instanceof Error ? error.message : 'Не удалось восстановить Telegram-сессию')
        }
      }
    }

    void restore()

    return () => {
      isActive = false
    }
  }, [environment.isTelegram, miniAppRestoreState, restoreSnapshot])

  useEffect(() => {
    if (!savedRequest || panelState !== 'pending') {
      return
    }

    let isActive = true

    const finishLinking = async () => {
      setPanelState('syncing')
      const session = await createTelegramSession(savedRequest.linkToken)

      await restoreSnapshot(session)
      clearRequest()
      setSavedRequest(null)
      setPanelState('completed')
      setLastBackendStatus('create-session + sync-pull ok')
      setMessage('Telegram подключён. Данные синхронизированы с сервером.')
    }

    const poll = async () => {
      try {
        const response = await getTelegramLinkStatus(savedRequest.linkToken)
        setLastBackendStatus(`get-link-status: ${response.status}`)

        if (!isActive || response.status === 'pending') {
          return
        }

        if (response.status === 'completed' || response.status === 'approved') {
          await finishLinking()
          return
        }

        setPanelState(response.status)
        setMessage(response.message ?? statusMessage(response.status))
        clearRequest()
        setSavedRequest(null)
      } catch (error) {
        if (isActive) {
          setPanelState('failed')
          setLastBackendStatus('get-link-status failed')
          setMessage(error instanceof Error ? error.message : 'Не удалось проверить статус привязки')
        }
      }
    }

    void poll()
    const timer = window.setInterval(poll, savedRequest.pollingIntervalMs)

    return () => {
      isActive = false
      window.clearInterval(timer)
    }
  }, [panelState, restoreSnapshot, savedRequest])

  const startLinking = async () => {
    if (identity.kind !== 'guest') {
      setMessage('Текущий профиль уже открыт как Telegram-профиль.')
      return
    }

    setPanelState('creating')
    setMessage('')

    try {
      const response = await createTelegramLinkRequest({
        guestId: identity.userId,
        deviceId: getOrCreateDeviceId(),
        returnUrl: window.location.href,
        snapshot: exportData(),
      })
      const nextRequest = {
        requestId: response.requestId,
        linkToken: response.linkToken,
        telegramUrl: response.telegramUrl,
        expiresAt: response.expiresAt,
        pollingIntervalMs: response.pollingIntervalMs ?? 2500,
      }

      saveRequest(nextRequest)
        setSavedRequest(nextRequest)
        setPanelState('pending')
        setLastBackendStatus('create-link-request ok')
        setMessage('Ожидаем подтверждение в Telegram')
        openTelegram(nextRequest.telegramUrl)
      } catch (error) {
        setPanelState('failed')
        setLastBackendStatus('create-link-request failed')
        setMessage(error instanceof Error ? error.message : 'Не удалось создать запрос привязки')
      }
  }

  const cancelLinking = () => {
    clearRequest()
    setSavedRequest(null)
    setPanelState('declined')
    setMessage('Подключение Telegram отменено')
  }

  const devDiagnostics = import.meta.env.DEV ? (
    <div className="mt-3 rounded-[18px] border border-[var(--app-border)] bg-white/[0.035] p-3 text-[11px] leading-5 text-[var(--app-muted)]">
      <div>Supabase URL: {backendDiagnostics.supabaseUrlFound ? 'найден' : 'не найден'}</div>
      <div>Anon key: {backendDiagnostics.anonKeyFound ? 'найден' : 'не найден'}</div>
      <div>Functions endpoint: {backendDiagnostics.functionsEndpoint ?? 'не настроен'}</div>
      <div>Последний статус: {lastBackendStatus || panelState}</div>
    </div>
  ) : null

  if (environment.isTelegram) {
    const hasTelegramProfile = identity.kind === 'telegram'

    return (
      <GlassCard>
        <SectionHeader
          title={hasTelegramProfile ? 'Telegram' : 'Telegram профиль недоступен'}
          subtitle={
            hasTelegramProfile
              ? 'Приложение открыто внутри Telegram Mini App'
              : 'Telegram launch обнаружен, но профиль SDK недоступен. Приложение продолжает работу как гостевой профиль.'
          }
        />
        <div className="flex items-center gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          {miniAppRestoreState === 'syncing' ? (
            <RefreshCcw className="h-4 w-4 shrink-0 animate-spin text-[var(--app-cyan)]" />
          ) : hasTelegramProfile ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--app-green)]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-200" />
          )}
          <span>
            {miniAppRestoreState === 'syncing'
              ? 'Восстанавливаем данные Telegram-профиля'
              : `Данные сохраняются в профиле ${identity.userId}`}
          </span>
        </div>
        {message && miniAppRestoreState !== 'syncing' ? (
          <div className="mt-3 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            {message}
          </div>
        ) : null}
        {devDiagnostics}
      </GlassCard>
    )
  }

  if (isConnected) {
    return (
      <GlassCard>
        <SectionHeader title="Telegram подключён" subtitle="Этот профиль связан с Telegram и может синхронизироваться через Supabase" />
        <div className="flex items-center gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--app-green)]" />
          <span>{telegramLabel || 'Telegram-профиль'}</span>
        </div>
        {devDiagnostics}
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <SectionHeader
        title="Telegram"
        subtitle="Привязка создаётся на backend: одноразовый токен, подтверждение в Telegram и синхронизация через Supabase."
      />

      {panelState === 'pending' && savedRequest ? (
        <div className="grid gap-3">
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            Ожидаем подтверждение в Telegram. Запрос действует до{' '}
            {new Date(savedRequest.expiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AnimatedButton type="button" onClick={() => openTelegram(savedRequest.telegramUrl)} className="h-11 px-3 text-xs">
              <ExternalLink className="h-4 w-4" />
              Открыть Telegram
            </AnimatedButton>
            <AnimatedButton type="button" variant="danger" onClick={cancelLinking} className="h-11 px-3 text-xs">
              <X className="h-4 w-4" />
              Отменить
            </AnimatedButton>
          </div>
        </div>
      ) : panelState === 'syncing' ? (
        <div className="flex items-center gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          <RefreshCcw className="h-4 w-4 shrink-0 animate-spin text-[var(--app-cyan)]" />
          <span>Telegram подтверждён. Получаем сессию и синхронизируем данные.</span>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            Сейчас используется локальный профиль {identity.userId}. После привязки backend перенесёт данные в Telegram-профиль.
          </div>
          <AnimatedButton type="button" variant="primary" onClick={startLinking} disabled={panelState === 'creating'}>
            {panelState === 'creating' ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Подключить Telegram
          </AnimatedButton>
        </div>
      )}

      {panelState === 'completed' || panelState === 'approved' ? (
        <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message || 'Telegram успешно подключён'}</span>
        </div>
      ) : null}

      {panelState === 'declined' ? (
        <div className="mt-3 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          {message || 'Подключение отменено. Данные гостевого профиля остаются на месте.'}
        </div>
      ) : null}

      {panelState === 'expired' ? (
        <div className="mt-3 rounded-[18px] border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Срок запроса истёк. Создайте новый запрос на подключение.
        </div>
      ) : null}

      {panelState === 'failed' && message ? (
        <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}
      {devDiagnostics}
    </GlassCard>
  )
}
