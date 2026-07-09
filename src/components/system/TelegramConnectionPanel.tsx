import { AlertCircle, CheckCircle2, ExternalLink, Link2, RefreshCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLaunchEnvironment } from '../../hooks/useLaunchEnvironment'
import {
  cancelTelegramLinkRequest,
  createTelegramLinkRequest,
  getTelegramLinkStatus,
} from '../../services/telegramLink'
import {
  getHabitStorageIdentity,
  getOrCreateDeviceId,
  storageKeys,
  storageService,
} from '../../services/storage'
import { useHabitStore } from '../../store/habitsStore'
import type { TelegramLinkStatus } from '../../types/telegramLink'
import { normalizeSettings } from '../../utils/habits'
import { AnimatedButton } from '../ui/AnimatedButton'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'

interface SavedLinkRequest {
  requestId: string
  telegramUrl: string
  expiresAt: string
  pollingIntervalMs: number
}

type PanelState = 'idle' | 'creating' | 'pending' | TelegramLinkStatus

function loadSavedRequest(): SavedLinkRequest | null {
  const raw = storageService.getItem(storageKeys.telegramLinkRequest)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedLinkRequest>

    if (parsed.requestId && parsed.telegramUrl && parsed.expiresAt) {
      return {
        requestId: parsed.requestId,
        telegramUrl: parsed.telegramUrl,
        expiresAt: parsed.expiresAt,
        pollingIntervalMs: parsed.pollingIntervalMs ?? 2500,
      }
    }
  } catch {
    storageService.removeItem(storageKeys.telegramLinkRequest)
  }

  return null
}

function saveRequest(request: SavedLinkRequest) {
  storageService.setItem(storageKeys.telegramLinkRequest, JSON.stringify(request))
}

function clearRequest() {
  storageService.removeItem(storageKeys.telegramLinkRequest)
}

function openTelegram(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')

  if (!opened) {
    window.location.assign(url)
  }
}

export function TelegramConnectionPanel() {
  const environment = useLaunchEnvironment()
  const rawSettings = useHabitStore((state) => state.settings)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const [savedRequest, setSavedRequest] = useState<SavedLinkRequest | null>(() => loadSavedRequest())
  const [panelState, setPanelState] = useState<PanelState>(() => (loadSavedRequest() ? 'pending' : 'idle'))
  const [message, setMessage] = useState('')
  const identity = getHabitStorageIdentity()
  const telegramLabel = settings.profile.profileUsername
    ? `@${settings.profile.profileUsername}`
    : settings.profile.profileName || settings.profile.telegramId || ''
  const isConnected = Boolean(settings.profile.telegramId)

  useEffect(() => {
    if (!savedRequest || panelState !== 'pending') {
      return
    }

    let isActive = true
    const poll = async () => {
      try {
        const response = await getTelegramLinkStatus(savedRequest.requestId)

        if (!isActive || response.status === 'pending') {
          return
        }

        setPanelState(response.status)
        setMessage(response.message ?? '')

        if (response.status === 'completed' || response.status === 'approved') {
          clearRequest()
          setSavedRequest(null)
        }

        if (response.status === 'declined' || response.status === 'expired' || response.status === 'failed') {
          clearRequest()
          setSavedRequest(null)
        }
      } catch (error) {
        if (isActive) {
          setPanelState('failed')
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
  }, [panelState, savedRequest])

  const startLinking = async () => {
    if (identity.kind !== 'guest') {
      setMessage('Текущий профиль уже открыт как Telegram-профиль.')
      return
    }

    setPanelState('creating')
    setMessage('')

    try {
      const response = await createTelegramLinkRequest({
        guestUserId: identity.userId,
        deviceId: getOrCreateDeviceId(),
        returnUrl: window.location.href,
      })
      const nextRequest = {
        requestId: response.requestId,
        telegramUrl: response.telegramUrl,
        expiresAt: response.expiresAt,
        pollingIntervalMs: response.pollingIntervalMs ?? 2500,
      }

      saveRequest(nextRequest)
      setSavedRequest(nextRequest)
      setPanelState('pending')
      openTelegram(nextRequest.telegramUrl)
    } catch (error) {
      setPanelState('failed')
      setMessage(error instanceof Error ? error.message : 'Не удалось создать запрос привязки')
    }
  }

  const cancelLinking = async () => {
    if (!savedRequest) {
      setPanelState('idle')
      return
    }

    try {
      await cancelTelegramLinkRequest(savedRequest.requestId)
      setPanelState('declined')
      setMessage('Подключение Telegram отменено')
    } catch (error) {
      setPanelState('failed')
      setMessage(error instanceof Error ? error.message : 'Не удалось отменить запрос')
    } finally {
      clearRequest()
      setSavedRequest(null)
    }
  }

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
          {hasTelegramProfile ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--app-green)]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-200" />
          )}
          <span>Данные сохраняются в профиле {identity.userId}</span>
        </div>
      </GlassCard>
    )
  }

  if (isConnected) {
    return (
      <GlassCard>
        <SectionHeader title="Telegram подключён" subtitle="Этот профиль уже связан с Telegram на этом устройстве" />
        <div className="flex items-center gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--app-green)]" />
          <span>{telegramLabel || 'Telegram-профиль'}</span>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <SectionHeader
        title="Telegram"
        subtitle="Подключение станет доступно после настройки защищённого сервера. Данные не будут объединены без подтверждения в Telegram."
      />

      {panelState === 'pending' && savedRequest ? (
        <div className="grid gap-3">
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            Подтвердите подключение в Telegram. Запрос действует до{' '}
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
      ) : (
        <div className="grid gap-3">
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            Сейчас используется локальный профиль {identity.userId}. После серверной привязки браузер, PWA и Telegram смогут работать с одним аккаунтом.
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
          <span>Telegram успешно подключён. Обновите профиль, если сессия уже выдана backend.</span>
        </div>
      ) : null}

      {panelState === 'declined' ? (
        <div className="mt-3 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
          Вы отказались от подключения Telegram. Данные гостевого профиля остаются на месте.
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
    </GlassCard>
  )
}
