import type {
  DiaryEntry,
  Habit,
  HabitCategory,
  HabitCompletionMode,
  HabitDraft,
  HabitGoalType,
  HabitIconKey,
  HabitMoneyEffect,
  HabitModuleSettings,
  HabitPathSettings,
  HabitReminderSettings,
  HabitSettings,
  HabitSubtask,
  HabitSubtaskSettings,
  HabitType,
  MoodValue,
  Reminder,
  ReminderRepeatType,
  ReminderTargetType,
  SmokingSettings,
  WorkLog,
} from '../types/habit'
import { getHabitStorageIdentity, getOrCreateDeviceId } from '../services/storage'
import { dateKey } from './date'

export interface HabitOption<T extends string> {
  value: T
  label: string
}

export const colorOptions = [
  '#020617',
  '#FFFFFF',
  '#EF4444',
  '#4ADE80',
  '#3B82F6',
  '#FACC15',
  '#F97316',
  '#8B5CF6',
  '#F472B6',
  '#22D3EE',
  '#94A3B8',
]

export const iconOptions: HabitOption<HabitIconKey>[] = [
  { value: 'briefcase', label: 'Работа' },
  { value: 'home', label: 'Дом' },
  { value: 'users', label: 'Семья' },
  { value: 'cigarette-off', label: 'Не курил' },
  { value: 'dumbbell', label: 'Спорт' },
  { value: 'droplets', label: 'Вода' },
  { value: 'utensils', label: 'Еда' },
  { value: 'moon', label: 'Сон' },
  { value: 'wallet', label: 'Деньги' },
  { value: 'book-open', label: 'Учёба' },
  { value: 'graduation-cap', label: 'Обучение' },
  { value: 'sparkles', label: 'Намаз' },
  { value: 'car', label: 'Машина' },
  { value: 'bike', label: 'Велосипед' },
  { value: 'pill', label: 'Лекарства' },
  { value: 'heart-pulse', label: 'Здоровье' },
  { value: 'heart', label: 'Сердце' },
  { value: 'target', label: 'Цель' },
  { value: 'flame', label: 'Серия' },
  { value: 'star', label: 'Другое' },
]

export const extraIconOptions: HabitOption<HabitIconKey>[] = [
  { value: 'calendar-days', label: 'Календарь' },
  { value: 'smartphone', label: 'Телефон' },
  { value: 'shopping-bag', label: 'Покупки' },
  { value: 'brain', label: 'Фокус' },
  { value: 'coffee', label: 'Отдых' },
]

export const typeOptions: HabitOption<HabitType>[] = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'custom', label: 'Гибко' },
]

export const categoryOptions: HabitOption<HabitCategory>[] = [
  { value: 'health', label: 'Здоровье' },
  { value: 'work', label: 'Работа' },
  { value: 'finance', label: 'Финансы' },
  { value: 'self-development', label: 'Саморазвитие' },
  { value: 'spirituality', label: 'Духовность' },
  { value: 'family', label: 'Семья' },
  { value: 'rest', label: 'Отдых' },
  { value: 'other', label: 'Другое' },
]

export const goalOptions: HabitOption<HabitGoalType>[] = [
  { value: 'boolean', label: 'Да/нет' },
  { value: 'count', label: 'Количество' },
  { value: 'time', label: 'Время' },
  { value: 'money', label: 'Деньги' },
]

export const moodOptions: HabitOption<MoodValue>[] = [
  { value: 'great', label: 'Отлично' },
  { value: 'normal', label: 'Нормально' },
  { value: 'tired', label: 'Устал' },
  { value: 'hard', label: 'Тяжело' },
  { value: 'angry', label: 'Злой' },
]

export const moodTone: Record<MoodValue, string> = {
  great: '#4ADE80',
  normal: '#22D3EE',
  tired: '#FBBF24',
  hard: '#FB7185',
  angry: '#F472B6',
}

export const defaultSmokingSettings: SmokingSettings = {
  cigarettesPerDay: 15,
  packPrice: 1200,
  cigarettesPerPack: 20,
}

export const defaultModuleSettings = {
  workMode: true,
  finance: true,
  diary: true,
  mood: true,
  noSmoking: true,
  achievements: true,
  levels: true,
  analytics: true,
  reminders: true,
  aiCoach: false,
}

export const moduleOrder: (keyof HabitModuleSettings)[] = [
  'workMode',
  'finance',
  'diary',
  'mood',
  'noSmoking',
  'achievements',
  'levels',
  'analytics',
  'reminders',
  'aiCoach',
]

export const habitPathMilestones = [3, 7, 21, 30, 60, 120, 180, 365, 730, 1000]

export const subtaskTemplates = [
  { id: 'namaz', title: 'Намаз', items: ['Фаджр', 'Зухр', 'Аср', 'Магриб', 'Иша'] },
  { id: 'training', title: 'Тренировка', items: ['Разминка', 'Основная часть', 'Растяжка'] },
  { id: 'work-day', title: 'Рабочий день', items: ['Вышел', 'Начал смену', 'Перерыв', 'Закончил', 'Итог дня'] },
  { id: 'morning', title: 'Утренняя рутина', items: ['Вода', 'Гигиена', 'План дня'] },
  { id: 'medicine', title: 'Лекарства', items: ['Утренний приём', 'Дневной приём', 'Вечерний приём'] },
]

export const defaultSettings: HabitSettings = {
  theme: 'system',
  smoking: defaultSmokingSettings,
  profile: {
    displayName: '',
    useTelegramName: true,
    avatarMode: 'telegram',
    avatarUrl: '',
    avatarData: '',
    profileName: '',
    profileUsername: '',
    profileAvatarUrl: '',
    profileAvatarData: '',
    telegramId: undefined,
    deviceId: getOrCreateDeviceId(),
    languageCode: undefined,
    profileNameSource: 'telegram',
    profileAvatarSource: 'telegram',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  background: {
    builtIn: 'aurora',
    customImage: '',
    dim: 42,
    blur: 0,
  },
  modules: defaultModuleSettings,
  moduleOrder,
  dev: {
    allowDailyReportAnytime: false,
  },
}

export function createId(prefix = 'habit') {
  if (typeof window !== 'undefined' && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getDefaultSubtaskSettings(): HabitSubtaskSettings {
  return {
    enabled: false,
    completionMode: 'auto',
    showProgress: true,
    showPercent: true,
  }
}

export function createReminder(
  targetType: ReminderTargetType,
  targetId: string,
  patch: Partial<Reminder> = {},
): Reminder {
  const now = new Date().toISOString()

  return {
    id: patch.id ?? createId('reminder'),
    enabled: patch.enabled ?? false,
    time: patch.time || '09:00',
    daysOfWeek: Array.isArray(patch.daysOfWeek) ? patch.daysOfWeek : [],
    message: patch.message || 'Время для привычки',
    targetType: patch.targetType ?? targetType,
    targetId: patch.targetId ?? targetId,
    repeatType: patch.repeatType ?? 'daily',
    createdAt: patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
  }
}

export function getDefaultReminder(targetType: ReminderTargetType = 'habit', targetId = 'habit'): HabitReminderSettings {
  const reminder = createReminder(targetType, targetId)

  return {
    enabled: false,
    time: '09:00',
    text: reminder.message,
    items: [],
  }
}

export function getDefaultPathSettings(patch: Partial<HabitPathSettings> = {}): HabitPathSettings {
  return {
    enabled: patch.enabled ?? true,
    milestones: patch.milestones?.length ? patch.milestones : habitPathMilestones,
    customGoal: patch.customGoal,
    currentMilestone: patch.currentMilestone ?? habitPathMilestones[0],
    completedMilestones: Array.isArray(patch.completedMilestones) ? patch.completedMilestones : [],
    starsEarned: patch.starsEarned ?? 0,
  }
}

export function createSubtask(
  title = 'Новая подзадача',
  order = 0,
  patch: Partial<HabitSubtask> = {},
): HabitSubtask {
  const now = new Date().toISOString()
  const id = patch.id ?? createId('subtask')

  return {
    id,
    title: patch.title?.trim() || title,
    type: patch.type ?? 'checkbox',
    required: patch.required ?? true,
    order: patch.order ?? order,
    goal: patch.goal ?? { type: 'boolean', target: 1, unit: 'раз' },
    value: patch.value ?? '',
    reminder: createReminder('subtask', id, patch.reminder),
    createdAt: patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
  }
}

export function createSubtaskTemplate(templateId: string, startOrder = 0) {
  const template = subtaskTemplates.find((item) => item.id === templateId)

  return template ? template.items.map((name, index) => createSubtask(name, startOrder + index)) : []
}

export function getSubtaskTemplate(title: string) {
  const lower = title.toLowerCase()

  if (lower.includes('намаз')) {
    return createSubtaskTemplate('namaz')
  }

  if (lower.includes('трениров') || lower.includes('спорт')) {
    return createSubtaskTemplate('training')
  }

  if (lower.includes('работ')) {
    return createSubtaskTemplate('work-day')
  }

  if (lower.includes('утрен')) {
    return createSubtaskTemplate('morning')
  }

  if (lower.includes('лекар') || lower.includes('витамин')) {
    return createSubtaskTemplate('medicine')
  }

  return []
}

export function getDefaultDraft(): HabitDraft {
  return {
    title: '',
    description: '',
    icon: 'star',
    color: '',
    iconColor: '',
    cardColor: '',
    category: 'other',
    type: 'daily',
    goal: {
      type: 'boolean',
      target: 1,
      unit: 'раз',
    },
    startDate: dateKey(),
    isActive: true,
    moneyEffect: undefined,
    subTasks: [],
    subTaskSettings: getDefaultSubtaskSettings(),
    reminder: getDefaultReminder(),
    path: getDefaultPathSettings({ enabled: true }),
  }
}

type StarterHabitSeed = Omit<
  HabitDraft,
  'iconColor' | 'cardColor' | 'subTasks' | 'subTaskSettings' | 'reminder' | 'path'
>

const starterHabitSeeds: StarterHabitSeed[] = [
  {
    title: 'Вышел на работу',
    description: 'Рабочий режим, дисциплина и стабильность.',
    icon: 'briefcase',
    color: '#4ADE80',
    category: 'work',
    type: 'daily',
    goal: { type: 'time', target: 8, unit: 'часов' },
    startDate: dateKey(),
    isActive: true,
    moneyEffect: {
      type: 'income',
      amountPerCompletion: 18000,
      currency: 'KZT',
      period: 'completion',
      description: 'Эти деньги ты зарабатываешь благодаря рабочему дню.',
    },
  },
  {
    title: 'Не курил',
    description: 'День без сигарет и лишних трат.',
    icon: 'cigarette-off',
    color: '#8B5CF6',
    category: 'health',
    type: 'daily',
    goal: { type: 'boolean', target: 1, unit: 'день' },
    startDate: dateKey(),
    isActive: true,
    moneyEffect: {
      type: 'saving',
      amountPerCompletion: 900,
      currency: 'KZT',
      period: 'day',
      description: 'Эти деньги ты экономишь благодаря дню без сигарет.',
    },
  },
  {
    title: 'Выпил воду',
    description: 'Поддерживать энергию и ясную голову.',
    icon: 'droplets',
    color: '#22D3EE',
    category: 'health',
    type: 'daily',
    goal: { type: 'count', target: 8, unit: 'стаканов' },
    startDate: dateKey(),
    isActive: true,
  },
  {
    title: 'Спорт',
    description: 'Тренировка, прогулка или активное восстановление.',
    icon: 'dumbbell',
    color: '#FBBF24',
    category: 'health',
    type: 'weekly',
    goal: { type: 'time', target: 45, unit: 'мин' },
    startDate: dateKey(),
    isActive: true,
  },
  {
    title: 'Учёба',
    description: 'Минимум один шаг в саморазвитии.',
    icon: 'book-open',
    color: '#60A5FA',
    category: 'self-development',
    type: 'custom',
    goal: { type: 'time', target: 30, unit: 'мин' },
    startDate: dateKey(),
    isActive: true,
  },
  {
    title: 'Намаз',
    description: 'Духовная опора дня.',
    icon: 'sparkles',
    color: '#A3E635',
    category: 'spirituality',
    type: 'daily',
    goal: { type: 'count', target: 5, unit: 'раз' },
    startDate: dateKey(),
    isActive: true,
  },
]

const starterHabits: HabitDraft[] = starterHabitSeeds.map((habit) => ({
  ...habit,
  iconColor: habit.color,
  cardColor: habit.color,
  subTasks: getSubtaskTemplate(habit.title),
  subTaskSettings: {
    ...getDefaultSubtaskSettings(),
    enabled: habit.title === 'Намаз',
  },
  reminder: {
    ...getDefaultReminder(),
    text: `${habit.title}: время отметки`,
    items: [],
  },
  path: getDefaultPathSettings({ enabled: true }),
}))

export function createHabit(draft: HabitDraft, id = createId()) {
  const now = new Date().toISOString()
  const identity = getHabitStorageIdentity()
  const reminder = {
    ...draft.reminder,
    items: draft.reminder.items.map((item) =>
      createReminder('habit', id, {
        ...item,
        targetId: id,
      }),
    ),
  }

  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    id,
    userId: identity.kind === 'telegram' ? identity.id : undefined,
    deviceId: getOrCreateDeviceId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: undefined,
    syncStatus: 'pending',
    version: 1,
    subTasks: draft.subTasks.map((subTask, index) => createSubtask(subTask.title, index, subTask)),
    subTaskSettings: draft.subTaskSettings,
    subTaskCompletions: {},
    reminder,
    path: getDefaultPathSettings(draft.path),
    completions: {},
  } satisfies Habit
}

export function createDefaultHabits() {
  return starterHabits.map((habit, index) => createHabit(habit, `starter-${index + 1}`))
}

export function getTypeLabel(type: HabitType) {
  return typeOptions.find((option) => option.value === type)?.label ?? 'Гибко'
}

export function getCategoryLabel(category: HabitCategory) {
  return categoryOptions.find((option) => option.value === category)?.label ?? 'Другое'
}

export function getGoalTypeLabel(type: HabitGoalType) {
  return goalOptions.find((option) => option.value === type)?.label ?? 'Да/нет'
}

export function getHabitIconColor(habit: Pick<Habit, 'iconColor' | 'color'>) {
  return habit.iconColor || habit.color || 'var(--app-green)'
}

export function getHabitCardColor(habit: Pick<Habit, 'cardColor' | 'color'>) {
  return habit.cardColor || habit.color || 'var(--app-green)'
}

function normalizeMoneyEffect(effect: HabitMoneyEffect | undefined): HabitMoneyEffect | undefined {
  if (!effect || !Number.isFinite(effect.amountPerCompletion)) {
    return undefined
  }

  const type =
    effect.type === 'earned'
      ? 'income'
      : effect.type === 'saved' || effect.type === 'avoided'
        ? 'saving'
        : effect.type

  return {
    type,
    amountPerCompletion: Math.max(0, effect.amountPerCompletion),
    currency: effect.currency ?? 'KZT',
    period: effect.period ?? 'completion',
    description: effect.description ?? '',
  }
}

function normalizeSubtasks(value: unknown): HabitSubtask[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => createSubtask('Подзадача', index, item as Partial<HabitSubtask>))
    .sort((a, b) => a.order - b.order)
}

function normalizeSubtaskSettings(value: unknown): HabitSubtaskSettings {
  const settings = value as Partial<HabitSubtaskSettings> | undefined
  const mode: HabitCompletionMode = settings?.completionMode === 'manual' ? 'manual' : 'auto'

  return {
    enabled: Boolean(settings?.enabled),
    completionMode: mode,
    showProgress: settings?.showProgress ?? true,
    showPercent: settings?.showPercent ?? true,
  }
}

function isReminderRepeatType(value: unknown): value is ReminderRepeatType {
  return value === 'daily' || value === 'weekly' || value === 'once'
}

function normalizeReminderItem(value: unknown, targetType: ReminderTargetType, targetId: string): Reminder {
  const reminder = value as Partial<Reminder> | undefined

  return createReminder(targetType, targetId, {
    ...reminder,
    enabled: Boolean(reminder?.enabled),
    time: typeof reminder?.time === 'string' && reminder.time ? reminder.time : '09:00',
    message:
      typeof reminder?.message === 'string' && reminder.message
        ? reminder.message
        : typeof (reminder as { text?: unknown } | undefined)?.text === 'string'
          ? String((reminder as { text?: unknown }).text)
          : 'Время для привычки',
    repeatType: isReminderRepeatType(reminder?.repeatType) ? reminder.repeatType : 'daily',
    daysOfWeek: Array.isArray(reminder?.daysOfWeek)
      ? reminder.daysOfWeek.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 7)
      : [],
  })
}

function normalizeReminder(value: unknown, targetId = 'habit'): HabitReminderSettings {
  const reminder = value as Partial<HabitReminderSettings> | undefined
  const legacyTime = typeof reminder?.time === 'string' && reminder.time ? reminder.time : '09:00'
  const legacyText = typeof reminder?.text === 'string' && reminder.text ? reminder.text : 'Время для привычки'
  const items = Array.isArray(reminder?.items)
    ? reminder.items.map((item) => normalizeReminderItem(item, 'habit', targetId))
    : reminder?.enabled
      ? [createReminder('habit', targetId, { enabled: true, time: legacyTime, message: legacyText })]
      : []

  return {
    enabled: Boolean(reminder?.enabled),
    time: legacyTime,
    text: legacyText,
    items,
  }
}

function normalizePath(value: unknown): HabitPathSettings {
  const path = value as Partial<HabitPathSettings> | undefined
  const milestones = Array.isArray(path?.milestones)
    ? path.milestones.filter((milestone): milestone is number => Number.isInteger(milestone) && milestone > 0)
    : habitPathMilestones

  return getDefaultPathSettings({
    enabled: path?.enabled ?? true,
    milestones: milestones.length ? milestones : habitPathMilestones,
    customGoal: Number.isFinite(path?.customGoal) && path!.customGoal! > 0 ? path!.customGoal : undefined,
    currentMilestone: Number.isFinite(path?.currentMilestone) ? path!.currentMilestone : milestones[0],
    completedMilestones: Array.isArray(path?.completedMilestones)
      ? path.completedMilestones.filter((milestone): milestone is number => Number.isInteger(milestone) && milestone > 0)
      : [],
    starsEarned: Number.isFinite(path?.starsEarned) ? path!.starsEarned : 0,
  })
}

export function normalizeHabit(rawHabit: Partial<Habit>, index = 0): Habit {
  const fallback = createDefaultHabits()[index % createDefaultHabits().length]
  const goal = rawHabit.goal ?? fallback.goal
  const now = new Date().toISOString()
  const validIcons = new Set(iconOptions.map((option) => option.value))
  const validCategories = new Set(categoryOptions.map((option) => option.value))
  const validTypes = new Set(typeOptions.map((option) => option.value))
  const validGoalTypes = new Set(goalOptions.map((option) => option.value))
  const subTasks = normalizeSubtasks(rawHabit.subTasks)
  const safeCompletions = Object.fromEntries(
    Object.entries(rawHabit.completions ?? {}).filter(
      ([key, completion]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(key) &&
        completion &&
        typeof completion.date === 'string' &&
        typeof completion.completedAt === 'string',
    ),
  )

  return {
    id: rawHabit.id ?? createId('migrated'),
    userId: rawHabit.userId,
    deviceId: rawHabit.deviceId ?? getOrCreateDeviceId(),
    title: rawHabit.title?.trim() || fallback.title,
    description: rawHabit.description ?? fallback.description,
    icon: rawHabit.icon && validIcons.has(rawHabit.icon) ? rawHabit.icon : fallback.icon,
    color: rawHabit.color ?? fallback.color,
    iconColor: rawHabit.iconColor ?? rawHabit.color ?? fallback.iconColor,
    cardColor: rawHabit.cardColor ?? rawHabit.color ?? fallback.cardColor,
    category: rawHabit.category && validCategories.has(rawHabit.category) ? rawHabit.category : fallback.category,
    type: rawHabit.type && validTypes.has(rawHabit.type) ? rawHabit.type : fallback.type,
    goal: {
      type: goal.type && validGoalTypes.has(goal.type) ? goal.type : 'boolean',
      target: Number.isFinite(goal.target) && goal.target > 0 ? goal.target : 1,
      unit: goal.unit || 'раз',
    },
    startDate: rawHabit.startDate ?? rawHabit.createdAt?.slice(0, 10) ?? dateKey(),
    isActive: rawHabit.isActive ?? true,
    moneyEffect: normalizeMoneyEffect(rawHabit.moneyEffect),
    subTasks,
    subTaskSettings: normalizeSubtaskSettings(rawHabit.subTaskSettings ?? { enabled: subTasks.length > 0 }),
    subTaskCompletions: rawHabit.subTaskCompletions ?? {},
    reminder: normalizeReminder(rawHabit.reminder, rawHabit.id ?? fallback.id),
    path: normalizePath(rawHabit.path),
    createdAt: rawHabit.createdAt ?? now,
    updatedAt: rawHabit.updatedAt ?? now,
    deletedAt: rawHabit.deletedAt,
    syncStatus: rawHabit.syncStatus ?? 'local',
    version: rawHabit.version ?? 1,
    completions: safeCompletions,
  }
}

export function normalizeHabits(habits: unknown): Habit[] {
  if (!Array.isArray(habits)) {
    return createDefaultHabits()
  }

  return habits.map((habit, index) => normalizeHabit(habit as Partial<Habit>, index))
}

export function normalizeSettings(settings: unknown): HabitSettings {
  const value = settings as Partial<HabitSettings> | undefined
  const smoking = value?.smoking
  const modules = value?.modules
  const background = value?.background
  const profile = value?.profile
  const moduleKeys = new Set(moduleOrder)
  const safeModuleOrder = Array.isArray(value?.moduleOrder)
    ? [
        ...value.moduleOrder.filter((key): key is keyof HabitModuleSettings => moduleKeys.has(key as keyof HabitModuleSettings)),
        ...moduleOrder.filter((key) => !value.moduleOrder?.includes(key)),
      ]
    : moduleOrder

  return {
    theme: value?.theme === 'dark' || value?.theme === 'light' || value?.theme === 'system' ? value.theme : 'system',
    smoking: {
      cigarettesPerDay:
        Number.isFinite(smoking?.cigarettesPerDay) && smoking!.cigarettesPerDay >= 0
          ? smoking!.cigarettesPerDay
          : defaultSmokingSettings.cigarettesPerDay,
      packPrice:
        Number.isFinite(smoking?.packPrice) && smoking!.packPrice >= 0
          ? smoking!.packPrice
          : defaultSmokingSettings.packPrice,
      cigarettesPerPack:
        Number.isFinite(smoking?.cigarettesPerPack) && smoking!.cigarettesPerPack > 0
          ? smoking!.cigarettesPerPack
          : defaultSmokingSettings.cigarettesPerPack,
    },
    profile: {
      displayName: profile?.displayName ?? '',
      useTelegramName: profile?.useTelegramName ?? true,
      avatarMode:
        profile?.avatarMode === 'custom' || profile?.avatarMode === 'letter' || profile?.avatarMode === 'telegram'
          ? profile.avatarMode
          : 'telegram',
      avatarUrl: profile?.avatarUrl ?? '',
      avatarData: profile?.avatarData ?? '',
      profileName: profile?.profileName ?? profile?.displayName ?? '',
      profileUsername: profile?.profileUsername ?? '',
      profileAvatarUrl: profile?.profileAvatarUrl ?? profile?.avatarUrl ?? '',
      profileAvatarData: profile?.profileAvatarData ?? profile?.avatarData ?? '',
      telegramId: profile?.telegramId,
      deviceId: profile?.deviceId ?? getOrCreateDeviceId(),
      languageCode: profile?.languageCode,
      profileNameSource: profile?.profileNameSource === 'manual' ? 'manual' : 'telegram',
      profileAvatarSource:
        profile?.profileAvatarSource === 'manual' || profile?.profileAvatarSource === 'generated'
          ? profile.profileAvatarSource
          : 'telegram',
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: profile?.updatedAt ?? new Date().toISOString(),
    },
    background: {
      builtIn:
        background?.builtIn === 'forest' ||
        background?.builtIn === 'city' ||
        background?.builtIn === 'focus' ||
        background?.builtIn === 'none'
          ? background.builtIn
          : 'aurora',
      customImage: background?.customImage ?? '',
      dim: Number.isFinite(background?.dim) ? Math.min(85, Math.max(0, background!.dim)) : 42,
      blur: Number.isFinite(background?.blur) ? Math.min(24, Math.max(0, background!.blur)) : 0,
    },
    modules: {
      workMode: modules?.workMode ?? defaultModuleSettings.workMode,
      finance: modules?.finance ?? defaultModuleSettings.finance,
      diary: modules?.diary ?? defaultModuleSettings.diary,
      mood: modules?.mood ?? defaultModuleSettings.mood,
      noSmoking: modules?.noSmoking ?? defaultModuleSettings.noSmoking,
      achievements: modules?.achievements ?? defaultModuleSettings.achievements,
      levels: modules?.levels ?? defaultModuleSettings.levels,
      analytics: modules?.analytics ?? defaultModuleSettings.analytics,
      reminders: modules?.reminders ?? defaultModuleSettings.reminders,
      aiCoach: modules?.aiCoach ?? defaultModuleSettings.aiCoach,
    },
    moduleOrder: safeModuleOrder,
    dev: {
      allowDailyReportAnytime: value?.dev?.allowDailyReportAnytime ?? false,
    },
  }
}

export function createDiaryEntry(date: string, note = '', habitNotes: Record<string, string> = {}): DiaryEntry {
  return {
    date,
    note,
    habitNotes,
    updatedAt: new Date().toISOString(),
  }
}

export function createWorkLog(date: string, patch: Partial<WorkLog> = {}): WorkLog {
  return {
    date,
    arrivedAt: patch.arrivedAt,
    shiftStartedAt: patch.shiftStartedAt,
    breakAt: patch.breakAt,
    homeAt: patch.homeAt,
    summaryAt: patch.summaryAt,
    hours: patch.hours ?? 0,
    note: patch.note ?? '',
    updatedAt: new Date().toISOString(),
  }
}
