import { useEffect, useMemo, useState } from 'react'
import { useHabitStore } from '../../store/habitsStore'
import { platformService } from '../../services/platform'
import {
  bindLegacyDataToTelegramProfile,
  getHabitStorageIdentity,
  postponeTelegramProfileBinding,
  shouldAskToBindLegacyData,
  startCleanTelegramProfile,
} from '../../services/storage'
import { normalizeSettings } from '../../utils/habits'
import { AnimatedButton } from '../ui/AnimatedButton'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'

export function UserBindingGate() {
  const rawSettings = useHabitStore((state) => state.settings)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const updateSettings = useHabitStore((state) => state.updateSettings)
  const [isBindOpen, setBindOpen] = useState(false)

  useEffect(() => {
    setBindOpen(shouldAskToBindLegacyData())
  }, [])

  useEffect(() => {
    const telegramUser = platformService.getTelegramUser()
    const identity = getHabitStorageIdentity()

    if (!telegramUser?.id || identity.kind !== 'telegram') {
      return
    }

    const telegramName = `${telegramUser.firstName}${telegramUser.lastName ? ` ${telegramUser.lastName}` : ''}`.trim()
    const currentProfile = settings.profile
    const shouldUseTelegramName =
      currentProfile.profileNameSource !== 'manual' &&
      (!currentProfile.profileName || currentProfile.telegramId !== identity.rawId)
    const shouldUseTelegramAvatar =
      currentProfile.profileAvatarSource !== 'manual' &&
      (!currentProfile.profileAvatarData || currentProfile.telegramId !== identity.rawId)
    const nextProfile = {
      ...currentProfile,
      telegramId: identity.rawId,
      deviceId: platformService.getDeviceId(),
      languageCode: telegramUser.languageCode,
      profileUsername: telegramUser.username ?? currentProfile.profileUsername,
      profileName: shouldUseTelegramName ? telegramName : currentProfile.profileName,
      displayName: shouldUseTelegramName ? telegramName : currentProfile.displayName,
      useTelegramName: shouldUseTelegramName ? true : currentProfile.useTelegramName,
      profileAvatarUrl: shouldUseTelegramAvatar ? telegramUser.photoUrl ?? '' : currentProfile.profileAvatarUrl,
      avatarUrl: shouldUseTelegramAvatar ? telegramUser.photoUrl ?? '' : currentProfile.avatarUrl,
      avatarMode: shouldUseTelegramAvatar && telegramUser.photoUrl ? 'telegram' : currentProfile.avatarMode,
      profileNameSource: shouldUseTelegramName ? 'telegram' : currentProfile.profileNameSource,
      profileAvatarSource: shouldUseTelegramAvatar && telegramUser.photoUrl ? 'telegram' : currentProfile.profileAvatarSource,
      updatedAt: currentProfile.updatedAt,
    } satisfies typeof currentProfile

    if (JSON.stringify(nextProfile) !== JSON.stringify(currentProfile)) {
      updateSettings(
        normalizeSettings({
          ...settings,
          profile: {
            ...nextProfile,
            updatedAt: new Date().toISOString(),
          },
        }),
      )
    }
  }, [settings, updateSettings])

  const rehydrateStore = async () => {
    await useHabitStore.persist.rehydrate()
  }

  const bindData = async () => {
    bindLegacyDataToTelegramProfile()
    await rehydrateStore()
    setBindOpen(false)
  }

  const startClean = async () => {
    startCleanTelegramProfile()
    await rehydrateStore()
    setBindOpen(false)
  }

  const postpone = () => {
    postponeTelegramProfileBinding()
    setBindOpen(false)
  }

  if (!isBindOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-[420px]">
        <SectionHeader
          title="Найдены локальные данные"
          subtitle="Можно перенести старые привычки, профиль, звёзды и достижения в локальный Telegram-профиль на этом устройстве. Это не заменяет серверную привязку аккаунта."
        />
        <div className="grid gap-2">
          <AnimatedButton type="button" variant="primary" onClick={bindData}>
            Перенести локально
          </AnimatedButton>
          <AnimatedButton type="button" onClick={startClean}>
            Начать чистый профиль
          </AnimatedButton>
          <AnimatedButton type="button" onClick={postpone}>
            Позже
          </AnimatedButton>
        </div>
      </GlassCard>
    </div>
  )
}
