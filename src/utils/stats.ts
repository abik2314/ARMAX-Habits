import type {
  Achievement,
  DiaryEntry,
  Habit,
  HabitSettings,
  MoodEntry,
  MoodValue,
  WorkLog,
} from '../types/habit'
import { defaultSettings } from './habits'
import {
  addDays,
  compareDateKeys,
  dateKey,
  getDaysBetweenInclusive,
  getLastDays,
  getMonthRange,
  parseDateKey,
} from './date'

export interface DailyActivity {
  key: string
  completed: number
  total: number
  skipped: number
  ratio: number
  status: 'empty' | 'missed' | 'partial' | 'complete'
}

export interface HabitProgress {
  habitId: string
  completed: boolean
  streak: number
  bestStreak: number
  totalCompleted: number
  completionRate: number
  note: string
}

export interface FinanceStats {
  saved: number
  earned: number
  expense: number
  avoided: number
  totalEffect: number
}

export interface SmokingStats {
  days: number
  cigarettesAvoided: number
  moneySaved: number
  healthBenefit: string
  motivation: string
}

export interface WorkStats {
  workDays: number
  totalHours: number
  averageHours: number
  today?: WorkLog
}

export interface MoodPerformance {
  mood: MoodValue
  days: number
  averageProgress: number
}

export interface BaseStats {
  todayKey: string
  completedToday: number
  totalHabits: number
  dayProgress: number
  totalCompleted: number
  activeDays: number
  totalTrackedDays: number
  activeStreak: number
  bestStreak: number
  completionRate: number
  missedDays: number
  partialDays: number
  weekActivity: DailyActivity[]
  monthActivity: DailyActivity[]
  monthCompletionRate: number
  xp: number
  level: number
  rank: string
  nextLevelXp: number
  xpProgress: number
  finance: FinanceStats
  smoking: SmokingStats
  work: WorkStats
  moodPerformance: MoodPerformance[]
  insights: string[]
}

interface AchievementRule {
  id: Achievement['id']
  title: string
  description: string
  icon: Achievement['icon']
  accent: string
  target: number
  getProgress: (habits: Habit[], stats: BaseStats) => number
}

export interface DashboardStats extends BaseStats {
  achievements: Achievement[]
}

function habitStartKey(habit: Habit) {
  return habit.startDate ?? dateKey(new Date(habit.createdAt))
}

export function isHabitRelevantOn(habit: Habit, key: string) {
  return !habit.deletedAt && habit.isActive && compareDateKeys(habitStartKey(habit), key) <= 0
}

export function isHabitCompletedOn(habit: Habit, key: string) {
  return Boolean(habit.completions[key])
}

export function getHabitCompletionKeys(habit: Habit) {
  return Object.keys(habit.completions).sort(compareDateKeys)
}

export function getHabitStreak(habit: Habit, fromKey: string = dateKey()) {
  let cursor = fromKey
  let streak = 0

  while (isHabitCompletedOn(habit, cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function getBestHabitStreak(habit: Habit) {
  const keys = getHabitCompletionKeys(habit)
  let best = 0
  let current = 0
  let previous: string | undefined

  for (const key of keys) {
    const isConsecutive =
      previous && parseDateKey(key).getTime() - parseDateKey(previous).getTime() === 24 * 60 * 60 * 1000

    current = isConsecutive ? current + 1 : 1
    best = Math.max(best, current)
    previous = key
  }

  return best
}

export function getHabitProgress(
  habit: Habit,
  key: string = dateKey(),
  diary?: DiaryEntry,
): HabitProgress {
  const start = habitStartKey(habit)
  const until = compareDateKeys(key, start) >= 0 ? key : start
  const possibleDays = getDaysBetweenInclusive(start, until).length
  const totalCompleted = getHabitCompletionKeys(habit).length

  return {
    habitId: habit.id,
    completed: isHabitCompletedOn(habit, key),
    streak: getHabitStreak(habit, key),
    bestStreak: getBestHabitStreak(habit),
    totalCompleted,
    completionRate: possibleDays > 0 ? Math.round((totalCompleted / possibleDays) * 100) : 0,
    note: diary?.habitNotes[habit.id] ?? habit.completions[key]?.note ?? '',
  }
}

export function getRelevantHabits(habits: Habit[], key: string) {
  return habits.filter((habit) => isHabitRelevantOn(habit, key))
}

export function getHabitDayRatio(habit: Habit, key: string) {
  if (isHabitCompletedOn(habit, key)) {
    return 1
  }

  if (!habit.subTaskSettings.enabled || habit.subTasks.length === 0) {
    return 0
  }

  const relevantSubtasks = habit.subTasks.filter((subTask) => subTask.required)
  const trackedSubtasks = relevantSubtasks.length > 0 ? relevantSubtasks : habit.subTasks
  const completions = habit.subTaskCompletions[key] ?? {}
  const completed = trackedSubtasks.filter((subTask) => completions[subTask.id]).length

  return trackedSubtasks.length > 0 ? completed / trackedSubtasks.length : 0
}

export function getDailyActivity(habits: Habit[], key: string): DailyActivity {
  const availableHabits = getRelevantHabits(habits, key)
  const total = availableHabits.length
  const completed = availableHabits.filter((habit) => getHabitDayRatio(habit, key) >= 1).length
  const ratioSum = availableHabits.reduce((sum, habit) => sum + getHabitDayRatio(habit, key), 0)
  const ratio = total > 0 ? Math.round((ratioSum / total) * 100) : 0
  const status =
    total === 0 ? 'empty' : ratio === 0 ? 'missed' : ratio >= 100 ? 'complete' : 'partial'

  return {
    key,
    completed,
    total,
    skipped: Math.max(0, total - completed),
    ratio,
    status,
  }
}

function getEarliestHabitKey(habits: Habit[]) {
  if (habits.length === 0) {
    return dateKey()
  }

  return habits.map(habitStartKey).sort(compareDateKeys)[0]
}

function getUniqueCompletionDays(habits: Habit[]) {
  const days = new Set<string>()

  for (const habit of habits) {
    for (const key of getHabitCompletionKeys(habit)) {
      days.add(key)
    }
  }

  return Array.from(days).sort(compareDateKeys)
}

function getActiveDayStreak(habits: Habit[], fromKey: string) {
  let cursor = fromKey
  let streak = 0

  while (getDailyActivity(habits, cursor).completed > 0) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function getBestActiveStreak(habits: Habit[]) {
  const days = getUniqueCompletionDays(habits)
  let best = 0
  let current = 0
  let previous: string | undefined

  for (const key of days) {
    const isConsecutive =
      previous && parseDateKey(key).getTime() - parseDateKey(previous).getTime() === 24 * 60 * 60 * 1000

    current = isConsecutive ? current + 1 : 1
    best = Math.max(best, current)
    previous = key
  }

  return best
}

function getCompletionRate(habits: Habit[], startKey: string, endKey: string) {
  const days = getDaysBetweenInclusive(startKey, endKey)
  let possible = 0
  let completed = 0

  for (const key of days) {
    for (const habit of habits) {
      if (isHabitRelevantOn(habit, key)) {
        possible += 1
        completed += getHabitDayRatio(habit, key)
      }
    }
  }

  return possible > 0 ? Math.round((completed / possible) * 100) : 0
}

export function getMonthActivity(habits: Habit[], monthDate: Date) {
  const range = getMonthRange(monthDate)
  return getDaysBetweenInclusive(range.start, range.end).map((key) => getDailyActivity(habits, key))
}

function findHabitByMeaning(habits: Habit[], values: string[]) {
  return habits.find((habit) => {
    const title = habit.title.toLowerCase()
    return values.some((value) => title.includes(value) || habit.icon === value || habit.category === value)
  })
}

function calculateFinance(habits: Habit[]): FinanceStats {
  const finance = { saved: 0, earned: 0, expense: 0, avoided: 0, totalEffect: 0 }

  for (const habit of habits) {
    if (!habit.moneyEffect) {
      continue
    }

    const count = getHabitCompletionKeys(habit).length
    const amount = count * habit.moneyEffect.amountPerCompletion
    if (habit.moneyEffect.type === 'income' || habit.moneyEffect.type === 'earned') {
      finance.earned += amount
    } else if (habit.moneyEffect.type === 'expense') {
      finance.expense += amount
    } else {
      finance.saved += amount
    }
  }

  finance.totalEffect = finance.saved + finance.earned + finance.avoided - finance.expense
  return finance
}

function calculateSmokingStats(habits: Habit[], settings: HabitSettings): SmokingStats {
  const habit = findHabitByMeaning(habits, ['кур', 'cigarette-off'])
  const days = habit ? getHabitStreak(habit) : 0
  const cigarettesAvoided = days * settings.smoking.cigarettesPerDay
  const moneySaved = Math.round(
    (cigarettesAvoided / settings.smoking.cigarettesPerPack) * settings.smoking.packPrice,
  )
  const healthBenefit =
    days >= 30
      ? 'Организм уже заметно восстанавливает выносливость.'
      : days >= 7
        ? 'Дыхание становится легче, энергия стабильнее.'
        : days >= 1
          ? 'Пульс и давление начинают приходить в норму.'
          : 'Первый чистый день запускает цепочку восстановления.'

  return {
    days,
    cigarettesAvoided,
    moneySaved,
    healthBenefit,
    motivation: days > 0 ? 'Ты уже доказал, что можешь держать контроль.' : 'Начни с одного дня. Он важнее идеального плана.',
  }
}

function calculateWorkStats(workLogs: Record<string, WorkLog>, today: string): WorkStats {
  const logs = Object.values(workLogs)
  const workDays = logs.filter((log) => log.arrivedAt || log.hours > 0).length
  const totalHours = Number(logs.reduce((sum, log) => sum + (log.hours || 0), 0).toFixed(1))
  const averageHours = workDays > 0 ? Number((totalHours / workDays).toFixed(1)) : 0

  return {
    workDays,
    totalHours,
    averageHours,
    today: workLogs[today],
  }
}

function calculateXp(habits: Habit[], activeStreak: number, monthActivity: DailyActivity[]) {
  const totalCompleted = habits.reduce((sum, habit) => sum + getHabitCompletionKeys(habit).length, 0)
  const perfectDays = monthActivity.filter((item) => item.status === 'complete').length

  return totalCompleted * 15 + perfectDays * 10 + activeStreak * 5
}

function getLevelProfile(xp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 45)) + 1)
  const currentLevelXp = (level - 1) * (level - 1) * 45
  const nextLevelXp = level * level * 45
  const xpProgress = Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
  const rank =
    xp >= 2400
      ? 'Легенда'
      : xp >= 1400
        ? 'Мастер'
        : xp >= 760
          ? 'Железный'
          : xp >= 360
            ? 'Дисциплина'
            : xp >= 120
              ? 'Стабильный'
              : 'Новичок'

  return {
    level,
    nextLevelXp,
    xpProgress,
    rank,
  }
}

function getMoodPerformance(
  habits: Habit[],
  moodEntries: Record<string, MoodEntry>,
): MoodPerformance[] {
  const grouped = new Map<MoodValue, { days: number; total: number }>()

  for (const entry of Object.values(moodEntries)) {
    const activity = getDailyActivity(habits, entry.date)
    const current = grouped.get(entry.mood) ?? { days: 0, total: 0 }
    grouped.set(entry.mood, {
      days: current.days + 1,
      total: current.total + activity.ratio,
    })
  }

  return Array.from(grouped.entries()).map(([mood, value]) => ({
    mood,
    days: value.days,
    averageProgress: Math.round(value.total / value.days),
  }))
}

function getInsights(stats: Omit<BaseStats, 'insights'>, habits: Habit[]) {
  if (stats.totalCompleted === 0) {
    return []
  }

  const insights: string[] = []
  const worstWeekday = stats.weekActivity.reduce((worst, item) => (item.ratio < worst.ratio ? item : worst), stats.weekActivity[0])
  const sportHabit = findHabitByMeaning(habits, ['спорт', 'dumbbell'])
  const recordGap = Math.max(1, stats.bestStreak + 1 - stats.activeStreak)
  const bestMood = stats.moodPerformance.sort((a, b) => b.averageProgress - a.averageProgress)[0]

  if (worstWeekday) {
    insights.push(`Самый слабый день недели сейчас: ${new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(parseDateKey(worstWeekday.key))}.`)
  }

  if (sportHabit && getHabitProgress(sportHabit).completionRate < stats.completionRate) {
    insights.push('Спорт проседает чаще остальных: поставь его раньше в расписании.')
  } else {
    insights.push('Ты лучше выполняешь привычки, когда закрываешь первую отметку до обеда.')
  }

  insights.push(`До нового рекорда осталось ${recordGap} дн.`)

  if (bestMood) {
    insights.push(`Лучший прогресс связан с настроением: ${bestMood.averageProgress}% выполнения.`)
  }

  return insights.slice(0, 4)
}

export function getBaseStats(
  habits: Habit[],
  today: string = dateKey(),
  moodEntries: Record<string, MoodEntry> = {},
  settings: HabitSettings = defaultSettings,
  workLogs: Record<string, WorkLog> = {},
): BaseStats {
  const day = getDailyActivity(habits, today)
  const earliest = getEarliestHabitKey(habits)
  const trackedDays = getDaysBetweenInclusive(earliest, today)
  const weekActivity = getLastDays(7, today).map((key) => getDailyActivity(habits, key))
  const monthActivity = getMonthActivity(habits, parseDateKey(today))
  const relevantMonth = monthActivity.filter((item) => compareDateKeys(item.key, today) <= 0)
  const totalCompleted = habits.reduce((sum, habit) => sum + getHabitCompletionKeys(habit).length, 0)
  const activeStreak = getActiveDayStreak(habits, today)
  const bestStreak = getBestActiveStreak(habits)
  const xp = calculateXp(habits, activeStreak, relevantMonth)
  const profile = getLevelProfile(xp)
  const baseWithoutInsights = {
    todayKey: today,
    completedToday: day.completed,
    totalHabits: day.total,
    dayProgress: day.ratio,
    totalCompleted,
    activeDays: getUniqueCompletionDays(habits).length,
    totalTrackedDays: trackedDays.length,
    activeStreak,
    bestStreak,
    completionRate: getCompletionRate(habits, earliest, today),
    missedDays: trackedDays.filter(
      (key) => compareDateKeys(key, today) < 0 && getDailyActivity(habits, key).status === 'missed',
    ).length,
    partialDays: trackedDays.filter((key) => getDailyActivity(habits, key).status === 'partial').length,
    weekActivity,
    monthActivity,
    monthCompletionRate:
      relevantMonth.length > 0
        ? Math.round(relevantMonth.reduce((sum, item) => sum + item.ratio, 0) / relevantMonth.length)
        : 0,
    xp,
    level: profile.level,
    rank: profile.rank,
    nextLevelXp: profile.nextLevelXp,
    xpProgress: profile.xpProgress,
    finance: calculateFinance(habits),
    smoking: calculateSmokingStats(habits, settings),
    work: calculateWorkStats(workLogs, today),
    moodPerformance: getMoodPerformance(habits, moodEntries),
  }

  return {
    ...baseWithoutInsights,
    insights: getInsights(baseWithoutInsights, habits),
  }
}

const achievementRules: AchievementRule[] = [
  {
    id: 'first-day',
    title: 'Первый день',
    description: 'Первая отметка в ARMAX Habits.',
    icon: 'star',
    accent: '#4ADE80',
    target: 1,
    getProgress: (_habits, stats) => stats.totalCompleted,
  },
  {
    id: 'streak-3',
    title: '3 дня подряд',
    description: 'Первые стабильные дни без провалов.',
    icon: 'flame',
    accent: '#4ADE80',
    target: 3,
    getProgress: (_habits, stats) => Math.max(stats.activeStreak, Math.min(stats.bestStreak, 3)),
  },
  {
    id: 'streak-7',
    title: '7 дней подряд',
    description: 'Неделя дисциплины закрыта.',
    icon: 'medal',
    accent: '#22D3EE',
    target: 7,
    getProgress: (_habits, stats) => Math.max(stats.activeStreak, Math.min(stats.bestStreak, 7)),
  },
  {
    id: 'streak-30',
    title: '30 дней подряд',
    description: 'Привычка стала частью ритма.',
    icon: 'trophy',
    accent: '#8B5CF6',
    target: 30,
    getProgress: (_habits, stats) => Math.max(stats.activeStreak, Math.min(stats.bestStreak, 30)),
  },
  {
    id: 'streak-100',
    title: '100 дней подряд',
    description: 'Большая серия, которой можно гордиться.',
    icon: 'shield',
    accent: '#FBBF24',
    target: 100,
    getProgress: (_habits, stats) => Math.max(stats.activeStreak, Math.min(stats.bestStreak, 100)),
  },
  {
    id: 'streak-365',
    title: '365 дней подряд',
    description: 'Год без потери ритма.',
    icon: 'trophy',
    accent: '#F472B6',
    target: 365,
    getProgress: (_habits, stats) => Math.max(stats.activeStreak, Math.min(stats.bestStreak, 365)),
  },
  {
    id: 'completion-1000',
    title: '1000 выполнений',
    description: 'Тысяча маленьких побед.',
    icon: 'medal',
    accent: '#22D3EE',
    target: 1000,
    getProgress: (_habits, stats) => stats.totalCompleted,
  },
  {
    id: 'perfect-month',
    title: 'Ни одного пропуска месяц',
    description: 'Идеальный месяц без пустых дней.',
    icon: 'shield',
    accent: '#FBBF24',
    target: 30,
    getProgress: (_habits, stats) => stats.monthActivity.filter((item) => item.status === 'complete').length,
  },
  {
    id: 'iron-discipline',
    title: 'Железная дисциплина',
    description: '90% общего выполнения.',
    icon: 'shield',
    accent: '#A3E635',
    target: 90,
    getProgress: (_habits, stats) => stats.completionRate,
  },
  {
    id: 'no-smoking',
    title: 'Бросаю курить',
    description: '7 дней без сигарет.',
    icon: 'cigarette-off',
    accent: '#8B5CF6',
    target: 7,
    getProgress: (habits) => {
      const habit = findHabitByMeaning(habits, ['кур', 'cigarette-off'])
      return habit ? Math.max(getHabitStreak(habit), Math.min(getBestHabitStreak(habit), 7)) : 0
    },
  },
  {
    id: 'work-mode',
    title: 'Рабочий режим',
    description: '10 рабочих отметок.',
    icon: 'briefcase',
    accent: '#4ADE80',
    target: 10,
    getProgress: (habits) => {
      const habit = findHabitByMeaning(habits, ['работ', 'briefcase', 'work'])
      return habit ? getHabitCompletionKeys(habit).length : 0
    },
  },
]

export function getAchievementResults(
  habits: Habit[],
  stats: BaseStats = getBaseStats(habits),
): Achievement[] {
  return achievementRules.map((rule) => {
    const progress = Math.min(rule.getProgress(habits, stats), rule.target)

    return {
      id: rule.id,
      title: rule.title,
      description: rule.description,
      icon: rule.icon,
      accent: rule.accent,
      progress,
      target: rule.target,
      isUnlocked: progress >= rule.target,
    }
  })
}

export function getDashboardStats(
  habits: Habit[],
  today: string = dateKey(),
  moodEntries: Record<string, MoodEntry> = {},
  settings?: HabitSettings,
  workLogs: Record<string, WorkLog> = {},
): DashboardStats {
  const base = getBaseStats(habits, today, moodEntries, settings, workLogs)

  return {
    ...base,
    achievements: getAchievementResults(habits, base),
  }
}
