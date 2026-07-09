export type HabitType = 'daily' | 'weekly' | 'custom'

export type HabitCategory =
  | 'health'
  | 'work'
  | 'finance'
  | 'self-development'
  | 'spirituality'
  | 'family'
  | 'rest'
  | 'other'

export type HabitGoalType = 'boolean' | 'count' | 'time' | 'money'

export type HabitIconKey =
  | 'briefcase'
  | 'cigarette-off'
  | 'dumbbell'
  | 'droplets'
  | 'book-open'
  | 'sparkles'
  | 'heart-pulse'
  | 'brain'
  | 'moon'
  | 'flame'
  | 'target'
  | 'star'
  | 'wallet'
  | 'users'
  | 'coffee'
  | 'home'
  | 'utensils'
  | 'graduation-cap'
  | 'car'
  | 'bike'
  | 'pill'
  | 'heart'
  | 'calendar-days'
  | 'smartphone'
  | 'shopping-bag'

export type ThemeMode = 'dark' | 'light' | 'system'

export type MoodValue = 'great' | 'normal' | 'tired' | 'hard' | 'angry'

export type MoneyEffectType = 'saving' | 'income' | 'expense' | 'saved' | 'earned' | 'avoided'

export type MoneyEffectPeriod = 'completion' | 'day' | 'week' | 'month'

export type HabitSubtaskType = 'checkbox' | 'count' | 'time' | 'value' | 'money' | 'text'

export type HabitCompletionMode = 'auto' | 'manual'

export type SyncStatus = 'local' | 'pending' | 'synced' | 'failed'

export type BuiltInBackground = 'aurora' | 'forest' | 'city' | 'focus' | 'none'

export type ReminderRepeatType = 'daily' | 'weekly' | 'once'

export type ReminderTargetType = 'habit' | 'subtask'

export type AchievementRarity =
  | 'copper'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'mythic'
  | 'legendary'
  | 'epic'
  | 'eternal'

export interface Reminder {
  id: string
  enabled: boolean
  time: string
  daysOfWeek: number[]
  message: string
  targetType: ReminderTargetType
  targetId: string
  repeatType: ReminderRepeatType
  createdAt: string
  updatedAt: string
}

export interface HabitGoal {
  type: HabitGoalType
  target: number
  unit: string
}

export interface HabitMoneyEffect {
  type: MoneyEffectType
  amountPerCompletion: number
  currency: 'KZT' | 'USD' | 'RUB'
  period?: MoneyEffectPeriod
  description?: string
}

export interface HabitCompletion {
  date: string
  completedAt: string
  value: number
  note?: string
}

export interface HabitSubtask {
  id: string
  title: string
  type: HabitSubtaskType
  required: boolean
  order: number
  goal: HabitGoal
  value: string
  reminder: Reminder
  createdAt: string
  updatedAt: string
}

export interface HabitSubtaskCompletion {
  subtaskId: string
  date: string
  completedAt: string
  value: number | string | boolean
}

export interface HabitSubtaskSettings {
  enabled: boolean
  completionMode: HabitCompletionMode
  showProgress: boolean
  showPercent: boolean
}

export interface HabitReminderSettings {
  enabled: boolean
  time: string
  text: string
  items: Reminder[]
}

export interface HabitPathSettings {
  enabled: boolean
  milestones: number[]
  customGoal?: number
  currentMilestone: number
  completedMilestones: number[]
  starsEarned: number
}

export interface Habit {
  id: string
  userId?: string
  deviceId: string
  title: string
  description: string
  icon: HabitIconKey
  color: string
  iconColor?: string
  cardColor?: string
  category: HabitCategory
  type: HabitType
  goal: HabitGoal
  startDate: string
  isActive: boolean
  moneyEffect?: HabitMoneyEffect
  subTasks: HabitSubtask[]
  subTaskSettings: HabitSubtaskSettings
  subTaskCompletions: Record<string, Record<string, HabitSubtaskCompletion>>
  reminder: HabitReminderSettings
  path: HabitPathSettings
  createdAt: string
  updatedAt: string
  deletedAt?: string
  syncStatus: SyncStatus
  version: number
  completions: Record<string, HabitCompletion>
}

export interface HabitDraft {
  title: string
  description: string
  icon: HabitIconKey
  color: string
  iconColor?: string
  cardColor?: string
  category: HabitCategory
  type: HabitType
  goal: HabitGoal
  startDate: string
  isActive: boolean
  moneyEffect?: HabitMoneyEffect
  subTasks: HabitSubtask[]
  subTaskSettings: HabitSubtaskSettings
  reminder: HabitReminderSettings
  path: HabitPathSettings
}

export interface MoodEntry {
  date: string
  mood: MoodValue
  updatedAt: string
}

export interface DiaryEntry {
  date: string
  note: string
  habitNotes: Record<string, string>
  updatedAt: string
}

export interface WorkLog {
  date: string
  arrivedAt?: string
  shiftStartedAt?: string
  breakAt?: string
  homeAt?: string
  summaryAt?: string
  hours: number
  note: string
  updatedAt: string
}

export interface SmokingSettings {
  cigarettesPerDay: number
  packPrice: number
  cigarettesPerPack: number
}

export interface HabitModuleSettings {
  workMode: boolean
  finance: boolean
  diary: boolean
  mood: boolean
  noSmoking: boolean
  achievements: boolean
  levels: boolean
  analytics: boolean
  reminders: boolean
  aiCoach: boolean
}

export interface ProfileSettings {
  displayName: string
  useTelegramName: boolean
  avatarMode: 'telegram' | 'custom' | 'letter'
  avatarUrl: string
  avatarData: string
  profileName: string
  profileUsername: string
  profileAvatarUrl: string
  profileAvatarData: string
  telegramId?: string
  deviceId: string
  languageCode?: string
  profileNameSource: 'telegram' | 'manual'
  profileAvatarSource: 'telegram' | 'manual' | 'generated'
  createdAt: string
  updatedAt: string
}

export interface BackgroundSettings {
  builtIn: BuiltInBackground
  customImage: string
  dim: number
  blur: number
}

export interface HabitSettings {
  theme: ThemeMode
  smoking: SmokingSettings
  profile: ProfileSettings
  background: BackgroundSettings
  modules: HabitModuleSettings
  moduleOrder: (keyof HabitModuleSettings)[]
  dev: {
    allowDailyReportAnytime: boolean
  }
}

export interface UserProfile {
  level: number
  xp: number
  rank: string
  nextLevelXp: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: 'flame' | 'trophy' | 'shield' | 'cigarette-off' | 'briefcase' | 'medal' | 'star'
  accent: string
  progress: number
  target: number
  isUnlocked: boolean
}

export interface StarTransaction {
  id: string
  date: string
  habitId?: string
  habitName?: string
  milestone: number
  amount: number
  reason: string
}

export interface Award {
  id: string
  title: string
  description: string
  habitId?: string
  habitName?: string
  starsRewarded: number
  stageDays?: number
  rarity: AchievementRarity
  unlockedAt?: string
  icon: Achievement['icon']
  type: 'path' | 'stars' | 'habit' | 'streak'
  isUnlocked: boolean
}

export interface DailyReport {
  date: string
  summary: {
    completedHabits: number
    totalHabits: number
    progress: number
    financeEffect: number
    streak: number
  }
  work: string[]
  habits: {
    completed: string[]
    partial: string[]
    missed: string[]
  }
  subtasks: Record<string, { title: string; completed: boolean }[]>
  finance: {
    earned: number
    saved: number
    expense: number
    total: number
  }
  smoking: string
  conclusion: string[]
  createdAt: string
}

export interface ExportedHabitData {
  app: 'ARMAX Habits'
  version: number
  exportedAt: string
  habits: Habit[]
  moodEntries: Record<string, MoodEntry>
  diaryEntries: Record<string, DiaryEntry>
  workLogs: Record<string, WorkLog>
  settings: HabitSettings
  celebratedAchievements: string[]
  starBalance?: number
  starHistory?: StarTransaction[]
  awards?: Award[]
  dailyReports?: Record<string, DailyReport>
  syncQueue?: SyncQueueItem[]
}

export interface SyncQueueItem {
  id: string
  entity: 'habit' | 'completion' | 'settings' | 'diary' | 'mood' | 'work-log' | 'report' | 'stars' | 'award'
  entityId: string
  action: 'create' | 'update' | 'delete'
  payload: unknown
  status: SyncStatus
  attempts: number
  createdAt: string
  updatedAt: string
  lastError?: string
}
