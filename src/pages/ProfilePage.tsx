import { ArrowDown, ArrowUp, Camera, Database, Download, GripVertical, RotateCcw, ShieldCheck, Star, Trash2, Trophy, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BuiltInBackground, HabitModuleSettings, HabitSettings } from '../types/habit'
import { AchievementGrid } from '../components/achievements/AchievementGrid'
import { TelegramConnectionPanel } from '../components/system/TelegramConnectionPanel'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { AnimatedProgress } from '../components/ui/AnimatedProgress'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { GlassCard } from '../components/ui/GlassCard'
import { LiquidSwitch } from '../components/ui/LiquidSwitch'
import { SaveToast } from '../components/ui/SaveToast'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatCard } from '../components/ui/StatCard'
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher'
import { useTelegramUser } from '../hooks/useTelegramUser'
import { platformService } from '../services/platform'
import { hapticImpact, hapticSuccess } from '../services/telegram'
import { useHabitStore } from '../store/habitsStore'
import { cn } from '../utils/cn'
import { normalizeSettings } from '../utils/habits'
import { getDashboardStats } from '../utils/stats'

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

const moduleOptions: { key: keyof HabitModuleSettings; label: string; description: string }[] = [
  { key: 'workMode', label: 'Рабочий режим', description: 'Выход, смена, перерыв, часы и итог дня.' },
  { key: 'finance', label: 'Финансовый эффект', description: 'Экономия, доход и расходы по привычкам.' },
  { key: 'diary', label: 'Дневник', description: 'Заметки к дням и привычкам.' },
  { key: 'mood', label: 'Настроение', description: 'Связь состояния и выполнения.' },
  { key: 'noSmoking', label: 'Не курю', description: 'Дни без сигарет, польза и экономия.' },
  { key: 'achievements', label: 'Достижения', description: 'Награды за серии и дисциплину.' },
  { key: 'levels', label: 'Уровни', description: 'Опыт, ранги и прогресс уровня.' },
  { key: 'analytics', label: 'Аналитика', description: 'Подсказки только по реальным данным.' },
  { key: 'reminders', label: 'Напоминания', description: 'Настройки будущих PWA/Capacitor уведомлений.' },
  { key: 'aiCoach', label: 'ИИ-наставник', description: 'Заготовка под будущие персональные советы.' },
]

const backgroundOptions: { value: BuiltInBackground; label: string }[] = [
  { value: 'aurora', label: 'Аврора' },
  { value: 'forest', label: 'Лес' },
  { value: 'city', label: 'Город' },
  { value: 'focus', label: 'Фокус' },
  { value: 'none', label: 'Без фона' },
]

async function compressImage(file: File, maxSize = 512, quality = 0.82) {
  const imageUrl = URL.createObjectURL(file)
  const image = new Image()
  image.src = imageUrl

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Не удалось прочитать изображение'))
  })

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  context?.drawImage(image, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(imageUrl)

  return canvas.toDataURL('image/webp', quality)
}

export function ProfilePage() {
  const habits = useHabitStore((state) => state.habits)
  const moodEntries = useHabitStore((state) => state.moodEntries)
  const rawSettings = useHabitStore((state) => state.settings)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const workLogs = useHabitStore((state) => state.workLogs)
  const resetData = useHabitStore((state) => state.resetData)
  const clearTodayMarks = useHabitStore((state) => state.clearTodayMarks)
  const resetHabitProgress = useHabitStore((state) => state.resetHabitProgress)
  const fullResetApp = useHabitStore((state) => state.fullResetApp)
  const updateSettings = useHabitStore((state) => state.updateSettings)
  const exportStoreData = useHabitStore((state) => state.exportData)
  const importData = useHabitStore((state) => state.importData)
  const getSyncStatus = useHabitStore((state) => state.getSyncStatus)
  const starBalance = useHabitStore((state) => state.starBalance)
  const starHistory = useHabitStore((state) => state.starHistory)
  const awards = useHabitStore((state) => state.awards)
  const { data: user } = useTelegramUser()
  const [settingsDraft, setSettingsDraft] = useState<HabitSettings>(() => normalizeSettings(settings))
  const [resetMode, setResetMode] = useState<'today' | 'progress' | 'regular' | null>(null)
  const [resetHabitId, setResetHabitId] = useState('')
  const [isFullResetOpen, setFullResetOpen] = useState(false)
  const [fullResetWord, setFullResetWord] = useState('')
  const [isPhotoOpen, setPhotoOpen] = useState(false)
  const [photoDraft, setPhotoDraft] = useState(settings.profile.avatarData)
  const [photoMode, setPhotoMode] = useState(settings.profile.avatarMode)
  const [isTelegramRefreshOpen, setTelegramRefreshOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const stats = useMemo(
    () => getDashboardStats(habits, undefined, moodEntries, settings, workLogs),
    [habits, moodEntries, settings, workLogs],
  )
  const telegramName = user ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : ''
  const displayName =
    settings.profile.profileName ||
    (settings.profile.useTelegramName && telegramName ? telegramName : settings.profile.displayName.trim()) ||
    telegramName ||
    'Гость'
  const initials = displayName.slice(0, 1).toUpperCase()
  const avatarSrc =
    settings.profile.profileAvatarData || settings.profile.avatarData
      ? settings.profile.profileAvatarData || settings.profile.avatarData
      : settings.profile.avatarMode === 'telegram'
        ? settings.profile.profileAvatarUrl || settings.profile.avatarUrl || user?.photoUrl
        : ''
  const orderedModules = settingsDraft.moduleOrder
    .map((key) => moduleOptions.find((option) => option.key === key))
    .filter((option): option is (typeof moduleOptions)[number] => Boolean(option))
  const platformStatus = platformService.isCapacitor()
    ? 'Открыто как iOS приложение'
    : platformService.isTelegram()
      ? 'Открыто в Telegram'
      : platformService.isPWA()
        ? 'Установлено как приложение'
        : 'Открыто в браузере'
  const installStatus = platformService.isPWA() || platformService.isCapacitor()
    ? 'Установлено как приложение'
    : 'Можно установить на экран Домой'

  useEffect(() => {
    setSettingsDraft(normalizeSettings(settings))
    setPhotoDraft(settings.profile.avatarData)
    setPhotoMode(settings.profile.avatarMode)
  }, [settings])

  const showSaved = () => {
    setToastMessage('Сохранено')
    window.setTimeout(() => setToastMessage(''), 1600)
  }

  const updateDraft = (patch: Partial<HabitSettings>) => {
    setSettingsDraft((current) => normalizeSettings({ ...current, ...patch }))
  }

  const saveSettings = () => {
    updateSettings(settingsDraft)
    hapticSuccess()
    showSaved()
  }

  const applyTelegramProfile = (force = false) => {
    const telegramUser = platformService.getTelegramUser()

    if (!telegramUser?.id) {
      setToastMessage('Telegram профиль недоступен')
      window.setTimeout(() => setToastMessage(''), 1600)
      return
    }

    const hasManualProfile =
      settings.profile.profileNameSource === 'manual' || settings.profile.profileAvatarSource === 'manual'

    if (hasManualProfile && !force) {
      setTelegramRefreshOpen(true)
      return
    }

    const telegramProfileName = `${telegramUser.firstName}${telegramUser.lastName ? ` ${telegramUser.lastName}` : ''}`.trim()
    updateSettings(
      normalizeSettings({
        ...settings,
        profile: {
          ...settings.profile,
          telegramId: String(telegramUser.id),
          deviceId: platformService.getDeviceId(),
          languageCode: telegramUser.languageCode,
          profileName: telegramProfileName,
          profileUsername: telegramUser.username ?? '',
          profileAvatarUrl: telegramUser.photoUrl ?? '',
          profileAvatarData: '',
          displayName: telegramProfileName,
          useTelegramName: true,
          avatarUrl: telegramUser.photoUrl ?? '',
          avatarData: '',
          avatarMode: telegramUser.photoUrl ? 'telegram' : 'letter',
          profileNameSource: 'telegram',
          profileAvatarSource: telegramUser.photoUrl ? 'telegram' : 'generated',
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    setTelegramRefreshOpen(false)
    setToastMessage('Профиль обновлён из Telegram')
    window.setTimeout(() => setToastMessage(''), 1600)
  }

  const moveModule = (key: keyof HabitModuleSettings, direction: -1 | 1) => {
    const currentOrder = settingsDraft.moduleOrder
    const index = currentOrder.indexOf(key)
    const target = index + direction

    if (index < 0 || target < 0 || target >= currentOrder.length) {
      return
    }

    const nextOrder = [...currentOrder]
    const current = nextOrder[index]
    nextOrder[index] = nextOrder[target]
    nextOrder[target] = current
    updateDraft({ moduleOrder: nextOrder })
  }

  const savePhoto = () => {
    updateSettings(
      normalizeSettings({
        ...settings,
        profile: {
          ...settings.profile,
          avatarMode: photoMode,
          avatarData: photoMode === 'custom' ? photoDraft : '',
          profileAvatarData: photoMode === 'custom' ? photoDraft : '',
          avatarUrl: photoMode === 'telegram' ? user?.photoUrl ?? settings.profile.avatarUrl : '',
          profileAvatarUrl: photoMode === 'telegram' ? user?.photoUrl ?? settings.profile.profileAvatarUrl : '',
          profileAvatarSource: photoMode === 'custom' ? 'manual' : photoMode === 'telegram' ? 'telegram' : 'generated',
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    setPhotoOpen(false)
    setToastMessage('Фото профиля сохранено')
    window.setTimeout(() => setToastMessage(''), 1600)
  }

  const useTelegramPhoto = () => {
    setPhotoMode('telegram')
    setPhotoDraft(user?.photoUrl ?? '')
  }

  const handleProfilePhotoUpload = async (file: File | undefined) => {
    if (!file) {
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      window.alert('Можно загрузить PNG, JPEG или WEBP')
      return
    }

    setPhotoMode('custom')
    setPhotoDraft(await compressImage(file))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(exportStoreData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `armax-habits-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    hapticImpact('light')
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const ok = importData(await file.text())
    if (ok) {
      hapticSuccess()
      showSaved()
    } else {
      window.alert('Не удалось импортировать JSON')
    }
  }

  const confirmReset = () => {
    if (resetMode === 'today') {
      clearTodayMarks()
    }

    if (resetMode === 'progress' && resetHabitId) {
      resetHabitProgress(resetHabitId)
    }

    if (resetMode === 'regular') {
      resetData()
    }

    setResetMode(null)
    hapticImpact('heavy')
    showSaved()
  }

  const confirmFullReset = () => {
    if (!fullResetApp(fullResetWord)) {
      window.alert('Введите слово УДАЛИТЬ')
      return
    }

    setFullResetOpen(false)
    setFullResetWord('')
    hapticImpact('heavy')
    showSaved()
  }

  const handleBackgroundUpload = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateDraft({
        background: {
          ...settingsDraft.background,
          customImage: String(reader.result ?? ''),
          builtIn: 'none',
        },
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--app-muted)]">Профиль</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-[var(--app-text)]">
          ARMAX Habits
        </h1>
      </header>

      <GlassCard strong active>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[22px] border border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-green),var(--app-cyan))] text-2xl font-bold text-[#04100A]">
            {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-[var(--app-text)]">{displayName}</h2>
            <p className="truncate text-sm text-[var(--app-muted)]">
              {user?.username ? `@${user.username}` : 'Мини-приложение Telegram'}
            </p>
            <button
              type="button"
              onClick={() => {
                setPhotoDraft(settings.profile.avatarData)
                setPhotoMode(settings.profile.avatarMode)
                setPhotoOpen(true)
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-[var(--app-muted)]"
            >
              <Camera className="h-3.5 w-3.5" />
              Изменить фото
            </button>
            {settings.modules.levels ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-white/[0.05] px-3 py-1 text-xs text-[var(--app-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--app-green)]" />
                {stats.rank} · уровень {stats.level}
              </div>
            ) : null}
          </div>
        </div>
        {settings.modules.levels ? (
          <>
            <AnimatedProgress value={stats.xpProgress} className="mt-4" />
            <div className="mt-2 text-xs text-[var(--app-muted)]">{stats.xp} опыта</div>
          </>
        ) : null}
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Database} label="дней в трекере" value={`${stats.totalTrackedDays}`} accent="#22D3EE" />
        <StatCard icon={ShieldCheck} label="выполнений" value={`${stats.totalCompleted}`} accent="#4ADE80" />
      </div>

      <GlassCard>
        <SectionHeader title="Кошелёк звёзд" subtitle="звёзды не сгорают и удаляются только при полном сбросе" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold text-[var(--app-text)]">{formatNumber(starBalance)}⭐</div>
            <div className="mt-1 text-xs text-[var(--app-muted)]">внутренняя валюта пути привычек</div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-[20px] border border-amber-300/40 bg-amber-300/12 text-amber-200">
            <Star className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {starHistory.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] px-3 py-2 text-xs text-[var(--app-muted)]">
              +{item.amount}⭐ · {item.habitName ?? 'Привычка'} · {new Date(item.date).toLocaleDateString('ru-RU')}
            </div>
          ))}
          {starHistory.length === 0 ? (
            <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] px-3 py-2 text-xs text-[var(--app-muted)]">
              Заверши первый этап пути, и здесь появится история начислений.
            </div>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Статус" subtitle="готово к будущей синхронизации" />
        <div className="grid gap-2">
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm font-semibold text-[var(--app-text)]">
            {getSyncStatus()}
          </div>
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            {platformStatus} · {installStatus}
          </div>
        </div>
      </GlassCard>

      <TelegramConnectionPanel />

      <GlassCard>
        <SectionHeader title="Настройки" subtitle="профиль, тема, фон и модули" />
        <div className="grid gap-4">
          <div className="rounded-[20px] border border-[var(--app-border)] bg-white/[0.035] p-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Имя</span>
              <input
                value={settingsDraft.profile.profileName || settingsDraft.profile.displayName}
                onChange={(event) =>
                  updateDraft({
                    profile: {
                      ...settingsDraft.profile,
                      profileName: event.target.value,
                      displayName: event.target.value,
                      useTelegramName: false,
                      profileNameSource: 'manual',
                      updatedAt: new Date().toISOString(),
                    },
                  })
                }
                placeholder={telegramName || 'Имя пользователя'}
                className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-4 text-sm"
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AnimatedButton
                type="button"
                onClick={() =>
                  updateDraft({
                    profile: {
                      ...settingsDraft.profile,
                      profileName: telegramName,
                      displayName: telegramName,
                      useTelegramName: true,
                      profileNameSource: 'telegram',
                      updatedAt: new Date().toISOString(),
                    },
                  })
                }
                disabled={!telegramName}
                className="h-10 rounded-[16px] px-3 text-xs"
              >
                Имя Telegram
              </AnimatedButton>
              <AnimatedButton type="button" onClick={saveSettings} variant="primary" className="h-10 rounded-[16px] px-3 text-xs">
                Сохранить
              </AnimatedButton>
            </div>
            <AnimatedButton
              type="button"
              onClick={() => applyTelegramProfile()}
              disabled={!user?.id}
              className="mt-2 h-10 w-full rounded-[16px] px-3 text-xs"
            >
              {user?.id ? 'Обновить из Telegram' : 'Telegram профиль недоступен'}
            </AnimatedButton>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--app-muted)]">Тема</div>
            <ThemeSwitcher value={settingsDraft.theme} onChange={(theme) => updateDraft({ theme })} />
          </div>

          <div className="rounded-[20px] border border-[var(--app-border)] bg-white/[0.035] p-3">
            <div className="mb-3 text-sm font-semibold text-[var(--app-text)]">Мотивационный фон</div>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      background: {
                        ...settingsDraft.background,
                        builtIn: option.value,
                        customImage: option.value === 'none' ? settingsDraft.background.customImage : '',
                      },
                    })
                  }
                  className={cn(
                    'h-10 rounded-[16px] border px-2 text-xs font-semibold',
                    settingsDraft.background.builtIn === option.value
                      ? 'border-[var(--app-green)] bg-[var(--app-green)]/15 text-[var(--app-text)]'
                      : 'border-[var(--app-border)] text-[var(--app-muted)]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="liquid-button mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[18px] px-3 text-sm font-semibold">
              <Upload className="h-4 w-4" />
              Загрузить фон
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleBackgroundUpload(event.target.files?.[0])}
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-[11px] text-[var(--app-muted)]">Затемнение</span>
                <input
                  type="range"
                  min={0}
                  max={85}
                  value={settingsDraft.background.dim}
                  onChange={(event) =>
                    updateDraft({
                      background: {
                        ...settingsDraft.background,
                        dim: Number(event.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
              </label>
              <label>
                <span className="mb-1 block text-[11px] text-[var(--app-muted)]">Размытие</span>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={settingsDraft.background.blur}
                  onChange={(event) =>
                    updateDraft({
                      background: {
                        ...settingsDraft.background,
                        blur: Number(event.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            {orderedModules.map((option, index) => (
              <div key={option.key} className="rounded-[20px] border border-[var(--app-border)] bg-white/[0.035] p-2">
                <div className="mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => moveModule(option.key, -1)}
                      disabled={index === 0}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-muted)] disabled:opacity-35"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Выше
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(option.key, 1)}
                      disabled={index === orderedModules.length - 1}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-muted)] disabled:opacity-35"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Ниже
                    </button>
                  </div>
                </div>
                <LiquidSwitch
                  checked={settingsDraft.modules[option.key]}
                  label={option.label}
                  description={option.description}
                  onChange={(checked) =>
                    updateDraft({
                      modules: {
                        ...settingsDraft.modules,
                        [option.key]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>

          <LiquidSwitch
            checked={settingsDraft.dev.allowDailyReportAnytime}
            label="Разрешить итог дня в любое время"
            description="Dev-настройка для проверки отчёта. По умолчанию выключена."
            onChange={(checked) =>
              updateDraft({
                dev: {
                  ...settingsDraft.dev,
                  allowDailyReportAnytime: checked,
                },
              })
            }
          />

          <AnimatedButton type="button" onClick={saveSettings} variant="primary">
            Сохранить настройки
          </AnimatedButton>
        </div>
      </GlassCard>

      {settingsDraft.modules.noSmoking ? (
        <GlassCard>
          <SectionHeader title="Настройки не курю" subtitle="для расчёта пользы и экономии" />
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="mb-1 block text-[11px] text-[var(--app-muted)]">сиг/день</span>
              <input
                type="number"
                min={0}
                value={settingsDraft.smoking.cigarettesPerDay}
                onChange={(event) =>
                  updateDraft({
                    smoking: {
                      ...settingsDraft.smoking,
                      cigarettesPerDay: Number(event.target.value) || 0,
                    },
                  })
                }
                className="h-11 w-full rounded-[16px] border border-[var(--app-border)] bg-white/[0.05] px-3 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[11px] text-[var(--app-muted)]">пачка ₸</span>
              <input
                type="number"
                min={0}
                value={settingsDraft.smoking.packPrice}
                onChange={(event) =>
                  updateDraft({
                    smoking: {
                      ...settingsDraft.smoking,
                      packPrice: Number(event.target.value) || 0,
                    },
                  })
                }
                className="h-11 w-full rounded-[16px] border border-[var(--app-border)] bg-white/[0.05] px-3 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[11px] text-[var(--app-muted)]">в пачке</span>
              <input
                type="number"
                min={1}
                value={settingsDraft.smoking.cigarettesPerPack}
                onChange={(event) =>
                  updateDraft({
                    smoking: {
                      ...settingsDraft.smoking,
                      cigarettesPerPack: Number(event.target.value) || 1,
                    },
                  })
                }
                className="h-11 w-full rounded-[16px] border border-[var(--app-border)] bg-white/[0.05] px-3 text-sm"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-[var(--app-muted)]">
            Сейчас: {stats.smoking.cigarettesAvoided} сигарет не выкурено, {formatNumber(stats.smoking.moneySaved)} ₸ сохранено.
          </p>
          <AnimatedButton type="button" onClick={saveSettings} className="mt-3 h-10 rounded-[16px] px-4">
            Сохранить
          </AnimatedButton>
        </GlassCard>
      ) : null}

      <GlassCard>
        <SectionHeader title="Данные" subtitle="локальное хранение и будущая синхронизация" />
        <div className="grid grid-cols-2 gap-2">
          <AnimatedButton haptic type="button" onClick={exportData} variant="primary" className="h-12 px-2">
            <Download className="h-4 w-4" />
            Экспорт
          </AnimatedButton>
          <label className="liquid-button relative inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[18px] px-2 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            Импорт
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(event) => handleImport(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2">
          <AnimatedButton haptic type="button" onClick={() => setResetMode('today')} className="h-11 px-2">
            <Trash2 className="h-4 w-4" />
            Очистить сегодня
          </AnimatedButton>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              value={resetHabitId}
              onChange={(event) => setResetHabitId(event.target.value)}
              className="h-11 rounded-[16px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-xs"
            >
              <option value="">Выбери привычку</option>
              {habits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.title}
                </option>
              ))}
            </select>
            <AnimatedButton
              haptic
              type="button"
              onClick={() => setResetMode('progress')}
              disabled={!resetHabitId}
              className="h-11 px-3 text-xs"
            >
              Сбросить
            </AnimatedButton>
          </div>
          <AnimatedButton haptic type="button" onClick={() => setResetMode('regular')} variant="danger" className="h-11 px-2">
            <RotateCcw className="h-4 w-4" />
            Сбросить прогресс
          </AnimatedButton>
          <AnimatedButton haptic type="button" onClick={() => setFullResetOpen(true)} variant="danger" className="h-11 px-2">
            <RotateCcw className="h-4 w-4" />
            Полный сброс приложения
          </AnimatedButton>
        </div>
      </GlassCard>

      {settings.modules.achievements ? (
        <GlassCard>
          <SectionHeader title="Музей достижений" subtitle="награды пути, редкость и дата получения" />
          <div className="grid gap-2">
            {awards.length > 0 ? (
              awards.map((award) => (
                <div
                  key={award.id}
                  className="rounded-[20px] border border-[var(--app-border)] bg-white/[0.045] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-amber-300/40 bg-amber-300/12 text-amber-200">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--app-text)]">{award.title}</div>
                      <div className="mt-1 text-xs text-[var(--app-muted)]">
                        {award.habitName ?? 'Общее'} · {award.rarity} · {award.unlockedAt ? new Date(award.unlockedAt).toLocaleDateString('ru-RU') : 'закрыто'}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-amber-200">+{award.starsRewarded}⭐</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3 text-sm text-[var(--app-muted)]">
                Полученные награды появятся после завершения этапов пути привычек.
              </div>
            )}
          </div>
        </GlassCard>
      ) : null}

      {settings.modules.achievements ? (
        <section>
          <SectionHeader title="Достижения" subtitle="серии, дисциплина и режимы" />
          <AchievementGrid achievements={stats.achievements} />
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(resetMode)}
        title={
          resetMode === 'today'
            ? 'Очистить отметки за сегодня?'
            : resetMode === 'progress'
              ? 'Сбросить прогресс привычки?'
              : 'Сбросить прогресс?'
        }
        description={
          resetMode === 'today'
            ? 'Будут удалены сегодняшние отметки привычек, подзадач, настроение, рабочие отметки и итог дня. Профиль, звёзды и награды останутся.'
            : resetMode === 'progress'
              ? 'Будут удалены отметки и текущий этап выбранной привычки. Уже заработанные звёзды и награды останутся.'
              : 'Будут очищены отметки, календарь, дневник, текущие серии и активность. Профиль, тема, настройки, звёзды и награды останутся.'
        }
        confirmLabel="Сбросить"
        onCancel={() => setResetMode(null)}
        onConfirm={confirmReset}
      />
      <ConfirmDialog
        isOpen={isTelegramRefreshOpen}
        title="Обновить из Telegram?"
        description="Имя или фото были изменены вручную. При обновлении Telegram имя, username и фото заменят текущие данные профиля."
        confirmLabel="Обновить"
        onCancel={() => setTelegramRefreshOpen(false)}
        onConfirm={() => applyTelegramProfile(true)}
      />
      {isPhotoOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <GlassCard strong className="w-full max-w-[420px]">
            <SectionHeader title="Фото профиля" subtitle="выбери источник и нажми Сохранить" />
            <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-green),var(--app-cyan))] text-3xl font-bold text-[#04100A]">
              {photoDraft ? <img src={photoDraft} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="mt-4 grid gap-2">
              <label className="liquid-button inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[18px] px-3 text-sm font-semibold">
                <Upload className="h-4 w-4" />
                Загрузить фото
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => handleProfilePhotoUpload(event.target.files?.[0])}
                />
              </label>
              <AnimatedButton type="button" onClick={useTelegramPhoto} disabled={!user?.photoUrl} className="h-11">
                Использовать Telegram фото
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => {
                  setPhotoMode('letter')
                  setPhotoDraft('')
                }}
                className="h-11"
              >
                Использовать первую букву
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => {
                  setPhotoMode('letter')
                  setPhotoDraft('')
                }}
                variant="danger"
                className="h-11"
              >
                Удалить фото
              </AnimatedButton>
              <div className="grid grid-cols-2 gap-2">
                <AnimatedButton type="button" onClick={() => setPhotoOpen(false)} className="h-11">
                  Отмена
                </AnimatedButton>
                <AnimatedButton type="button" onClick={savePhoto} variant="primary" className="h-11">
                  Сохранить
                </AnimatedButton>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : null}
      {isFullResetOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <GlassCard strong className="w-full max-w-[420px]">
            <SectionHeader title="Полный сброс приложения" subtitle="это удалит профиль, тему, настройки, звёзды, награды и все привычки" />
            <p className="text-sm text-[var(--app-muted)]">
              Для подтверждения введи слово <span className="font-semibold text-[var(--app-text)]">УДАЛИТЬ</span>.
            </p>
            <input
              value={fullResetWord}
              onChange={(event) => setFullResetWord(event.target.value)}
              className="mt-3 h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-4 text-sm"
              placeholder="УДАЛИТЬ"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <AnimatedButton type="button" onClick={() => setFullResetOpen(false)} className="h-11">
                Отмена
              </AnimatedButton>
              <AnimatedButton type="button" onClick={confirmFullReset} variant="danger" className="h-11">
                Полный сброс
              </AnimatedButton>
            </div>
          </GlassCard>
        </div>
      ) : null}
      <SaveToast message={toastMessage} />
    </div>
  )
}
