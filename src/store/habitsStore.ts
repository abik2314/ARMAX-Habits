import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Award,
  DailyReport,
  DiaryEntry,
  ExportedHabitData,
  Habit,
  HabitDraft,
  HabitSettings,
  MoodEntry,
  MoodValue,
  SmokingSettings,
  StarTransaction,
  SyncQueueItem,
  ThemeMode,
  WorkLog,
} from '../types/habit'
import { storageService } from '../services/storage'
import { dateKey } from '../utils/date'
import {
  createDefaultHabits,
  createDiaryEntry,
  createHabit,
  createWorkLog,
  defaultSettings,
  getDefaultPathSettings,
  normalizeHabits,
  normalizeSettings,
} from '../utils/habits'
import {
  getAchievementResults,
  getBaseStats,
  getDailyActivity,
  getHabitStreak,
  getMonthActivity,
  getRelevantHabits,
  isHabitCompletedOn,
} from '../utils/stats'

interface HabitStore {
  habits: Habit[]
  moodEntries: Record<string, MoodEntry>
  diaryEntries: Record<string, DiaryEntry>
  workLogs: Record<string, WorkLog>
  settings: HabitSettings
  celebratedAchievements: string[]
  syncQueue: SyncQueueItem[]
  starBalance: number
  starHistory: StarTransaction[]
  awards: Award[]
  dailyReports: Record<string, DailyReport>
  lastCelebration?: string
  addHabit: (draft: HabitDraft) => Habit
  updateHabit: (habitId: string, draft: HabitDraft) => void
  deleteHabit: (habitId: string) => void
  toggleHabitForDate: (habitId: string, key?: string, value?: number) => string[]
  toggleHabit: (habitId: string, key?: string) => string[]
  toggleSubtaskForDate: (habitId: string, subtaskId: string, key?: string, value?: number | string | boolean) => string[]
  setMoodForDate: (key: string, mood: MoodValue) => void
  setDiaryForDate: (key: string, note: string) => void
  setHabitNoteForDate: (key: string, habitId: string, note: string) => void
  setWorkLogForDate: (key: string, patch: Partial<WorkLog>) => void
  updateSmokingSettings: (settings: Partial<SmokingSettings>) => void
  updateSettings: (settings: HabitSettings) => void
  setTheme: (theme: ThemeMode) => void
  unlockAchievement: (achievementId: string) => void
  dismissCelebration: () => void
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'attempts' | 'createdAt' | 'updatedAt'>) => void
  markSynced: (itemId: string) => void
  markFailed: (itemId: string, error?: string) => void
  retryPending: () => void
  getSyncStatus: () => 'Офлайн' | 'Синхронизация' | 'Всё сохранено' | 'Ошибка синхронизации'
  calculateStreak: () => number
  calculateBestStreak: () => number
  calculateDailyProgress: (key?: string) => number
  calculateMonthlyStats: (monthDate?: Date) => ReturnType<typeof getMonthActivity>
  generateDailyReport: (key?: string) => DailyReport
  saveDailyReport: (key?: string, report?: DailyReport) => void
  clearTodayMarks: (key?: string) => void
  resetHabitProgress: (habitId: string) => void
  fullResetApp: (confirmWord: string) => boolean
  exportData: () => ExportedHabitData
  importData: (payload: string | Partial<ExportedHabitData>) => boolean
  resetData: () => void
}

const initialState = {
  habits: createDefaultHabits(),
  moodEntries: {},
  diaryEntries: {},
  workLogs: {},
  settings: defaultSettings,
  celebratedAchievements: [],
  syncQueue: [],
  starBalance: 0,
  starHistory: [],
  awards: ensureHabitStageAwards([], createDefaultHabits()),
  dailyReports: {},
  lastCelebration: undefined,
}

const storageKey = 'armax-habits-storage'

function createInitialState() {
  return {
    habits: createDefaultHabits(),
    moodEntries: {},
    diaryEntries: {},
    workLogs: {},
    settings: normalizeSettings(defaultSettings),
    celebratedAchievements: [],
    syncQueue: [],
    starBalance: 0,
    starHistory: [],
    awards: ensureHabitStageAwards([], createDefaultHabits()),
    dailyReports: {},
    lastCelebration: undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRecord<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? (value as Record<string, T>) : {}
}

function normalizePersistedData(state: Partial<HabitStore> | undefined) {
  const normalizedHabits = normalizeHabits(state?.habits)

  return {
    habits: normalizedHabits,
    moodEntries: normalizeRecord<MoodEntry>(state?.moodEntries),
    diaryEntries: normalizeRecord<DiaryEntry>(state?.diaryEntries),
    workLogs: normalizeRecord<WorkLog>(state?.workLogs),
    settings: normalizeSettings(state?.settings),
    celebratedAchievements: Array.isArray(state?.celebratedAchievements)
      ? state.celebratedAchievements
      : [],
    starBalance: typeof state?.starBalance === 'number' ? state.starBalance : 0,
    starHistory: Array.isArray(state?.starHistory) ? state.starHistory : [],
    awards: ensureHabitStageAwards(
      Array.isArray(state?.awards) ? state.awards : [],
      normalizedHabits,
    ),
    dailyReports: normalizeRecord<DailyReport>(state?.dailyReports),
    syncQueue: Array.isArray(state?.syncQueue) ? state.syncQueue : [],
    lastCelebration: undefined,
  }
}

function isValidImportPayload(data: Record<string, unknown>) {
  return data.app === 'ARMAX Habits' && Array.isArray(data.habits)
}

function getUnlockedAchievementIds(state: Pick<HabitStore, 'habits' | 'moodEntries' | 'settings' | 'workLogs'>) {
  const stats = getBaseStats(state.habits, dateKey(), state.moodEntries, state.settings, state.workLogs)

  return getAchievementResults(state.habits, stats)
    .filter((achievement) => achievement.isUnlocked)
    .map((achievement) => achievement.id)
}

function getNewAchievements(before: string[], after: string[], celebrated: string[]) {
  return after.filter((id) => !before.includes(id) && !celebrated.includes(id))
}

function createSyncQueueItem(
  item: Omit<SyncQueueItem, 'id' | 'attempts' | 'createdAt' | 'updatedAt'>,
): SyncQueueItem {
  const now = new Date().toISOString()

  return {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }
}

function getRequiredSubtaskProgress(habit: Habit, key: string) {
  const required = habit.subTasks.filter((subTask) => subTask.required)
  const completions = habit.subTaskCompletions[key] ?? {}
  const completed = required.filter((subTask) => completions[subTask.id]).length

  return {
    required,
    completed,
    canComplete: required.length === 0 || completed === required.length,
  }
}

function getNextMilestone(habit: Habit) {
  const milestones = habit.path.milestones.length ? habit.path.milestones : getDefaultPathSettings().milestones
  return milestones.find((milestone) => !habit.path.completedMilestones.includes(milestone)) ?? milestones[milestones.length - 1]
}

function getAwardRarity(milestone: number): Award['rarity'] {
  if (milestone >= 1000) return 'eternal'
  if (milestone >= 730) return 'epic'
  if (milestone >= 365) return 'legendary'
  if (milestone >= 180) return 'mythic'
  if (milestone >= 120) return 'diamond'
  if (milestone >= 60) return 'platinum'
  if (milestone >= 30) return 'gold'
  if (milestone >= 21) return 'silver'
  if (milestone >= 7) return 'bronze'
  return 'copper'
}

function createPathAward(habit: Habit, milestone: number, unlockedAt?: string): Award {
  return {
    id: `path-${habit.id}-${milestone}`,
    title: `${habit.title} — ${milestone} дней подряд`,
    description: `${milestone} дней без перерыва по привычке «${habit.title}».`,
    habitId: habit.id,
    habitName: habit.title,
    starsRewarded: milestone,
    stageDays: milestone,
    rarity: getAwardRarity(milestone),
    unlockedAt,
    icon: milestone >= 30 ? 'trophy' : 'star',
    type: 'path',
    isUnlocked: Boolean(unlockedAt),
  }
}

function ensureHabitStageAwards(awards: Award[], habits: Habit[]) {
  const habitMap = new Map(habits.map((habit) => [habit.id, habit]))
  const nextAwards = awards
    .filter((award) => {
      if (award.type !== 'path' || !award.habitId) {
        return true
      }

      const habit = habitMap.get(award.habitId)
      return award.isUnlocked || Boolean(habit?.path.enabled)
    })
    .map((award) => {
      if (award.type !== 'path' || !award.habitId) {
        return award
      }

      const habit = habitMap.get(award.habitId)
      if (!habit) {
        return award
      }

      const stageDays = award.stageDays ?? award.starsRewarded
      return {
        ...award,
        title: `${habit.title} — ${stageDays} дней подряд`,
        description: `${stageDays} дней без перерыва по привычке «${habit.title}».`,
        habitName: habit.title,
        stageDays,
      }
    })
  const known = new Set(nextAwards.map((award) => award.id))

  for (const habit of habits) {
    if (habit.deletedAt || !habit.path.enabled) {
      continue
    }

    const milestones = habit.path.milestones.length ? habit.path.milestones : getDefaultPathSettings().milestones
    for (const milestone of milestones) {
      const award = createPathAward(habit, milestone)
      if (!known.has(award.id)) {
        nextAwards.push(award)
        known.add(award.id)
      }
    }
  }

  return nextAwards
}

function applyPathRewards(
  habits: Habit[],
  starBalance: number,
  starHistory: StarTransaction[],
  awards: Award[],
  key: string,
) {
  const now = new Date().toISOString()
  let nextStarBalance = starBalance
  let nextStarHistory = starHistory
  let nextAwards = awards
  let lastAwardId: string | undefined

  const nextHabits = habits.map((habit) => {
    if (!habit.path.enabled) {
      return habit
    }

    const streak = getHabitStreak(habit, key)
    const milestones = habit.path.milestones.length ? habit.path.milestones : getDefaultPathSettings().milestones
    const newlyCompleted = milestones.filter(
      (milestone) => streak >= milestone && !habit.path.completedMilestones.includes(milestone),
    )

    if (newlyCompleted.length === 0) {
      return {
        ...habit,
        path: {
          ...habit.path,
          currentMilestone: getNextMilestone(habit),
        },
      }
    }

    const completedMilestones = Array.from(new Set([...habit.path.completedMilestones, ...newlyCompleted])).sort(
      (a, b) => a - b,
    )
    const earned = newlyCompleted.reduce((sum, milestone) => sum + milestone, 0)

    for (const milestone of newlyCompleted) {
      const transactionId = `stars-${habit.id}-${milestone}`
      if (!nextStarHistory.some((item) => item.id === transactionId)) {
        nextStarHistory = [
          {
            id: transactionId,
            date: now,
            habitId: habit.id,
            habitName: habit.title,
            milestone,
            amount: milestone,
            reason: `${milestone} дней пути привычки`,
          },
          ...nextStarHistory,
        ]
        nextStarBalance += milestone
      }

      const award = createPathAward(habit, milestone, now)
      const awardIndex = nextAwards.findIndex((item) => item.id === award.id)
      if (awardIndex >= 0) {
        if (!nextAwards[awardIndex].isUnlocked) {
          nextAwards = nextAwards.map((item) => (item.id === award.id ? award : item))
          lastAwardId = award.id
        }
      } else {
        nextAwards = [award, ...nextAwards]
        lastAwardId = award.id
      }
    }

    const updatedHabit = {
      ...habit,
      path: {
        ...habit.path,
        completedMilestones,
        starsEarned: habit.path.starsEarned + earned,
      },
    }

    return {
      ...updatedHabit,
      path: {
        ...updatedHabit.path,
        currentMilestone: getNextMilestone(updatedHabit),
      },
    }
  })

  return {
    habits: nextHabits,
    starBalance: nextStarBalance,
    starHistory: nextStarHistory,
    awards: ensureHabitStageAwards(nextAwards, nextHabits),
    lastAwardId,
  }
}

function calculateDayFinance(habits: Habit[], key: string) {
  const finance = { earned: 0, saved: 0, expense: 0, total: 0 }

  for (const habit of habits) {
    if (!habit.moneyEffect || !isHabitCompletedOn(habit, key)) {
      continue
    }

    const amount = habit.moneyEffect.amountPerCompletion

    if (habit.moneyEffect.type === 'income' || habit.moneyEffect.type === 'earned') {
      finance.earned += amount
    } else if (habit.moneyEffect.type === 'expense') {
      finance.expense += amount
    } else {
      finance.saved += amount
    }
  }

  finance.total = finance.earned + finance.saved - finance.expense
  return finance
}

function buildDailyReport(state: HabitStore, key: string): DailyReport {
  const activity = getDailyActivity(state.habits, key)
  const stats = getBaseStats(state.habits, key, state.moodEntries, state.settings, state.workLogs)
  const relevantHabits = getRelevantHabits(state.habits, key)
  const completed: string[] = []
  const partial: string[] = []
  const missed: string[] = []
  const subtasks: DailyReport['subtasks'] = {}

  for (const habit of relevantHabits) {
    const isDone = isHabitCompletedOn(habit, key)
    const daySubtasks = habit.subTaskCompletions[key] ?? {}
    const doneSubtasks = habit.subTasks.filter((subTask) => daySubtasks[subTask.id]).length

    if (habit.subTaskSettings.enabled && habit.subTasks.length > 0) {
      subtasks[habit.title] = habit.subTasks.map((subTask) => ({
        title: subTask.title,
        completed: Boolean(daySubtasks[subTask.id]),
      }))
    }

    if (isDone) {
      completed.push(habit.title)
    } else if (doneSubtasks > 0) {
      partial.push(habit.title)
    } else {
      missed.push(habit.title)
    }
  }

  const work = state.workLogs[key]
  const workSummary = [
    state.settings.modules.workMode
      ? `Вышел: ${work?.arrivedAt ? 'отмечено' : 'не отмечено'}`
      : 'Рабочий режим выключен',
    state.settings.modules.workMode ? `Начал смену: ${work?.shiftStartedAt ? 'отмечено' : 'не отмечено'}` : '',
    state.settings.modules.workMode ? `Перерыв: ${work?.breakAt ? 'отмечено' : 'не отмечено'}` : '',
    state.settings.modules.workMode ? `Закончил: ${work?.homeAt ? 'отмечено' : 'не отмечено'}` : '',
    work?.hours ? `Примерно ${work.hours} ч за день.` : '',
  ].filter(Boolean)
  const smokingHabit = state.habits.find((habit) => habit.title.toLowerCase().includes('кур') || habit.icon === 'cigarette-off')
  const finance = calculateDayFinance(state.habits, key)
  const conclusion =
    activity.total === 0
      ? ['Сегодня мало данных для полного отчёта. Отметь привычки, и завтра итог будет полезнее.']
      : activity.ratio >= 80
        ? ['День получился сильным.', 'Сохрани этот темп и завтра повтори самый простой первый шаг.']
        : activity.ratio >= 40
          ? ['Есть движение, но день закрыт не полностью.', 'Выбери одну привычку, которую точно удержишь завтра.']
          : ['Сегодня было тяжело или мало отметок.', 'Без давления: завтра достаточно начать с одной простой галочки.']

  return {
    date: key,
    summary: {
      completedHabits: activity.completed,
      totalHabits: activity.total,
      progress: activity.ratio,
      financeEffect: finance.total,
      streak: stats.activeStreak,
    },
    work: workSummary,
    habits: {
      completed,
      partial,
      missed,
    },
    subtasks,
    finance,
    smoking: smokingHabit
      ? isHabitCompletedOn(smokingHabit, key)
        ? 'Сегодня не курил. Отлично.'
        : 'Отметка «Не курю» не стоит. Возможно, был срыв или ты просто забыл отметить.'
      : 'Привычка «Не курю» не найдена.',
    conclusion,
    createdAt: new Date().toISOString(),
  }
}

function makeExport(state: HabitStore): ExportedHabitData {
  return {
    app: 'ARMAX Habits',
    version: 2,
    exportedAt: new Date().toISOString(),
    habits: state.habits,
    moodEntries: state.moodEntries,
    diaryEntries: state.diaryEntries,
    workLogs: state.workLogs,
    settings: state.settings,
    celebratedAchievements: state.celebratedAchievements,
    starBalance: state.starBalance,
    starHistory: state.starHistory,
    awards: state.awards,
    dailyReports: state.dailyReports,
    syncQueue: state.syncQueue,
  }
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      addHabit: (draft) => {
        const habit = createHabit(draft)
        set((state) => ({
          habits: [habit, ...state.habits],
          awards: ensureHabitStageAwards(state.awards, [habit, ...state.habits]),
          syncQueue: [
            createSyncQueueItem({
              entity: 'habit',
              entityId: habit.id,
              action: 'create',
              payload: habit,
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
        return habit
      },
      updateHabit: (habitId, draft) => {
        set((state) => {
          const nextHabits = state.habits.map((habit) => {
            if (habit.id !== habitId) {
              return habit
            }

            return {
              ...habit,
              ...draft,
              title: draft.title.trim(),
              description: draft.description.trim(),
              syncStatus: 'pending' as const,
              version: habit.version + 1,
              updatedAt: new Date().toISOString(),
            }
          })

          return {
            habits: nextHabits,
            awards: ensureHabitStageAwards(state.awards, nextHabits),
            syncQueue: [
              createSyncQueueItem({
                entity: 'habit',
                entityId: habitId,
                action: 'update',
                payload: draft,
                status: 'pending',
              }),
              ...state.syncQueue,
            ],
          }
        })
      },
      deleteHabit: (habitId) => {
        set((state) => {
          const nextDiaryEntries = Object.fromEntries(
            Object.entries(state.diaryEntries).map(([key, entry]) => {
              const habitNotes = { ...entry.habitNotes }
              delete habitNotes[habitId]
              return [key, { ...entry, habitNotes }]
            }),
          )

          return {
            habits: state.habits.filter((habit) => habit.id !== habitId),
            awards: ensureHabitStageAwards(
              state.awards,
              state.habits.filter((habit) => habit.id !== habitId),
            ),
            diaryEntries: nextDiaryEntries,
            syncQueue: [
              createSyncQueueItem({
                entity: 'habit',
                entityId: habitId,
                action: 'delete',
                payload: { deletedAt: new Date().toISOString() },
                status: 'pending',
              }),
              ...state.syncQueue,
            ],
          }
        })
      },
      toggleHabitForDate: (habitId, key = dateKey(), value = 1) => {
        const state = get()
        const beforeUnlocked = getUnlockedAchievementIds(state)
        const targetHabit = state.habits.find((habit) => habit.id === habitId)

        if (
          targetHabit &&
          targetHabit.subTaskSettings.enabled &&
          !targetHabit.completions[key] &&
          !getRequiredSubtaskProgress(targetHabit, key).canComplete
        ) {
          return []
        }

        const nextHabits = state.habits.map((habit) => {
          if (habit.id !== habitId) {
            return habit
          }

          const completions = { ...habit.completions }

          if (completions[key]) {
            delete completions[key]
          } else {
            completions[key] = {
              date: key,
              value,
              completedAt: new Date().toISOString(),
              note: state.diaryEntries[key]?.habitNotes[habitId],
            }
          }

          return {
            ...habit,
            completions,
            syncStatus: 'pending' as const,
            version: habit.version + 1,
            updatedAt: new Date().toISOString(),
          }
        })
        const nextState = { ...state, habits: nextHabits }
        const afterUnlocked = getUnlockedAchievementIds(nextState)
        const newlyUnlocked = getNewAchievements(
          beforeUnlocked,
          afterUnlocked,
          state.celebratedAchievements,
        )
        const pathRewards = applyPathRewards(
          nextHabits,
          state.starBalance,
          state.starHistory,
          state.awards,
          key,
        )

        set({
          habits: pathRewards.habits,
          syncQueue: [
            createSyncQueueItem({
              entity: 'completion',
              entityId: `${habitId}:${key}`,
              action: 'update',
              payload: { habitId, key, value },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
          celebratedAchievements:
            newlyUnlocked.length > 0
              ? Array.from(new Set([...state.celebratedAchievements, ...newlyUnlocked]))
              : state.celebratedAchievements,
          starBalance: pathRewards.starBalance,
          starHistory: pathRewards.starHistory,
          awards: pathRewards.awards,
          lastCelebration: pathRewards.lastAwardId ?? newlyUnlocked[0] ?? state.lastCelebration,
        })

        return newlyUnlocked
      },
      toggleHabit: (habitId, key = dateKey()) => get().toggleHabitForDate(habitId, key),
      toggleSubtaskForDate: (habitId, subtaskId, key = dateKey(), value = true) => {
        const state = get()
        const beforeUnlocked = getUnlockedAchievementIds(state)
        const nextHabits = state.habits.map((habit) => {
          if (habit.id !== habitId) {
            return habit
          }

          const dayCompletions = { ...(habit.subTaskCompletions[key] ?? {}) }

          if (dayCompletions[subtaskId]) {
            delete dayCompletions[subtaskId]
          } else {
            dayCompletions[subtaskId] = {
              subtaskId,
              date: key,
              completedAt: new Date().toISOString(),
              value,
            }
          }

          const subTaskCompletions = {
            ...habit.subTaskCompletions,
            [key]: dayCompletions,
          }
          const nextHabit = {
            ...habit,
            subTaskCompletions,
            syncStatus: 'pending' as const,
            version: habit.version + 1,
            updatedAt: new Date().toISOString(),
          }
          const progress = getRequiredSubtaskProgress(nextHabit, key)
          const completions = { ...nextHabit.completions }

          if (progress.canComplete && nextHabit.subTaskSettings.completionMode === 'auto') {
            completions[key] = {
              date: key,
              value: nextHabit.goal.target,
              completedAt: new Date().toISOString(),
              note: state.diaryEntries[key]?.habitNotes[habitId],
            }
          } else if (!progress.canComplete) {
            delete completions[key]
          }

          return {
            ...nextHabit,
            completions,
          }
        })
        const nextState = { ...state, habits: nextHabits }
        const afterUnlocked = getUnlockedAchievementIds(nextState)
        const newlyUnlocked = getNewAchievements(
          beforeUnlocked,
          afterUnlocked,
          state.celebratedAchievements,
        )
        const pathRewards = applyPathRewards(
          nextHabits,
          state.starBalance,
          state.starHistory,
          state.awards,
          key,
        )

        set({
          habits: pathRewards.habits,
          syncQueue: [
            createSyncQueueItem({
              entity: 'completion',
              entityId: `${habitId}:${key}:${subtaskId}`,
              action: 'update',
              payload: { habitId, key, subtaskId, value },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
          celebratedAchievements:
            newlyUnlocked.length > 0
              ? Array.from(new Set([...state.celebratedAchievements, ...newlyUnlocked]))
              : state.celebratedAchievements,
          starBalance: pathRewards.starBalance,
          starHistory: pathRewards.starHistory,
          awards: pathRewards.awards,
          lastCelebration: pathRewards.lastAwardId ?? newlyUnlocked[0] ?? state.lastCelebration,
        })

        return newlyUnlocked
      },
      setMoodForDate: (key, mood) => {
        set((state) => ({
          moodEntries: {
            ...state.moodEntries,
            [key]: {
              date: key,
              mood,
              updatedAt: new Date().toISOString(),
            },
          },
          syncQueue: [
            createSyncQueueItem({
              entity: 'mood',
              entityId: key,
              action: 'update',
              payload: { key, mood },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      setDiaryForDate: (key, note) => {
        set((state) => ({
          diaryEntries: {
            ...state.diaryEntries,
            [key]: createDiaryEntry(key, note, state.diaryEntries[key]?.habitNotes ?? {}),
          },
          syncQueue: [
            createSyncQueueItem({
              entity: 'diary',
              entityId: key,
              action: 'update',
              payload: { key, note },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      setHabitNoteForDate: (key, habitId, note) => {
        set((state) => {
          const entry = state.diaryEntries[key] ?? createDiaryEntry(key)

          return {
            diaryEntries: {
              ...state.diaryEntries,
              [key]: createDiaryEntry(key, entry.note, {
                ...entry.habitNotes,
                [habitId]: note,
              }),
            },
            habits: state.habits.map((habit) =>
              habit.id === habitId && habit.completions[key]
                ? {
                    ...habit,
                    completions: {
                      ...habit.completions,
                      [key]: {
                        ...habit.completions[key],
                        note,
                      },
                    },
                  }
                : habit,
            ),
            syncQueue: [
              createSyncQueueItem({
                entity: 'diary',
                entityId: `${key}:${habitId}`,
                action: 'update',
                payload: { key, habitId, note },
                status: 'pending',
              }),
              ...state.syncQueue,
            ],
          }
        })
      },
      setWorkLogForDate: (key, patch) => {
        set((state) => {
          const previous = state.workLogs[key] ?? createWorkLog(key)
          const next = createWorkLog(key, { ...previous, ...patch })

          return {
            workLogs: {
              ...state.workLogs,
              [key]: next,
            },
            syncQueue: [
              createSyncQueueItem({
                entity: 'work-log',
                entityId: key,
                action: 'update',
                payload: next,
                status: 'pending',
              }),
              ...state.syncQueue,
            ],
          }
        })
      },
      updateSmokingSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            smoking: {
              ...state.settings.smoking,
              ...settings,
            },
          },
          syncQueue: [
            createSyncQueueItem({
              entity: 'settings',
              entityId: 'settings',
              action: 'update',
              payload: { smoking: settings },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      updateSettings: (settings) => {
        set((state) => ({
          settings: normalizeSettings(settings),
          syncQueue: [
            createSyncQueueItem({
              entity: 'settings',
              entityId: 'settings',
              action: 'update',
              payload: settings,
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      setTheme: (theme) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme,
          },
          syncQueue: [
            createSyncQueueItem({
              entity: 'settings',
              entityId: 'theme',
              action: 'update',
              payload: { theme },
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      unlockAchievement: (achievementId) => {
        set((state) => ({
          celebratedAchievements: Array.from(new Set([...state.celebratedAchievements, achievementId])),
          lastCelebration: achievementId,
        }))
      },
      dismissCelebration: () => {
        set({ lastCelebration: undefined })
      },
      addToSyncQueue: (item) => {
        set((state) => ({
          syncQueue: [createSyncQueueItem(item), ...state.syncQueue],
        }))
      },
      markSynced: (itemId) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === itemId
              ? { ...item, status: 'synced', updatedAt: new Date().toISOString(), lastError: undefined }
              : item,
          ),
        }))
      },
      markFailed: (itemId, error) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'failed',
                  attempts: item.attempts + 1,
                  updatedAt: new Date().toISOString(),
                  lastError: error,
                }
              : item,
          ),
        }))
      },
      retryPending: () => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.status === 'failed' ? { ...item, status: 'pending', updatedAt: new Date().toISOString() } : item,
          ),
        }))
      },
      getSyncStatus: () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return 'Офлайн'
        }

        const queue = get().syncQueue

        if (queue.some((item) => item.status === 'failed')) {
          return 'Ошибка синхронизации'
        }

        if (queue.some((item) => item.status === 'pending')) {
          return 'Синхронизация'
        }

        return 'Всё сохранено'
      },
      calculateStreak: () => {
        const state = get()
        return getBaseStats(state.habits, dateKey(), state.moodEntries, state.settings, state.workLogs)
          .activeStreak
      },
      calculateBestStreak: () => {
        const state = get()
        return getBaseStats(state.habits, dateKey(), state.moodEntries, state.settings, state.workLogs)
          .bestStreak
      },
      calculateDailyProgress: (key = dateKey()) => getDailyActivity(get().habits, key).ratio,
      calculateMonthlyStats: (monthDate = new Date()) => getMonthActivity(get().habits, monthDate),
      generateDailyReport: (key = dateKey()) => buildDailyReport(get(), key),
      saveDailyReport: (key = dateKey(), report) => {
        const nextReport = report ?? buildDailyReport(get(), key)

        set((state) => ({
          dailyReports: {
            ...state.dailyReports,
            [key]: nextReport,
          },
          diaryEntries: {
            ...state.diaryEntries,
            [key]: createDiaryEntry(
              key,
              [
                state.diaryEntries[key]?.note,
                '',
                `Итог дня: выполнено ${nextReport.summary.completedHabits} из ${nextReport.summary.totalHabits}, прогресс ${nextReport.summary.progress}%.`,
                ...nextReport.conclusion,
              ]
                .filter(Boolean)
                .join('\n'),
              state.diaryEntries[key]?.habitNotes ?? {},
            ),
          },
          workLogs: {
            ...state.workLogs,
            [key]: createWorkLog(key, { ...state.workLogs[key], summaryAt: new Date().toISOString() }),
          },
          syncQueue: [
            createSyncQueueItem({
              entity: 'report',
              entityId: key,
              action: 'update',
              payload: nextReport,
              status: 'pending',
            }),
            ...state.syncQueue,
          ],
        }))
      },
      clearTodayMarks: (key = dateKey()) => {
        set((state) => ({
          habits: state.habits.map((habit) => {
            const completions = { ...habit.completions }
            const subTaskCompletions = { ...habit.subTaskCompletions }
            delete completions[key]
            delete subTaskCompletions[key]

            return {
              ...habit,
              completions,
              subTaskCompletions,
              updatedAt: new Date().toISOString(),
            }
          }),
          moodEntries: Object.fromEntries(Object.entries(state.moodEntries).filter(([entryKey]) => entryKey !== key)),
          workLogs: Object.fromEntries(Object.entries(state.workLogs).filter(([entryKey]) => entryKey !== key)),
          dailyReports: Object.fromEntries(Object.entries(state.dailyReports).filter(([entryKey]) => entryKey !== key)),
        }))
      },
      resetHabitProgress: (habitId) => {
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === habitId
              ? {
                  ...habit,
                  completions: {},
                  subTaskCompletions: {},
                  path: {
                    ...habit.path,
                    currentMilestone: habit.path.milestones[0] ?? 3,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : habit,
          ),
        }))
      },
      fullResetApp: (confirmWord) => {
        if (confirmWord !== 'УДАЛИТЬ') {
          return false
        }

        set(createInitialState())
        return true
      },
      exportData: () => makeExport(get()),
      importData: (payload) => {
        try {
          const data = typeof payload === 'string' ? JSON.parse(payload) : payload

          if (!isRecord(data) || !isValidImportPayload(data)) {
            return false
          }

          const importedHabits = normalizeHabits(data.habits)

          set({
            habits: importedHabits,
            moodEntries: normalizeRecord<MoodEntry>(data.moodEntries),
            diaryEntries: normalizeRecord<DiaryEntry>(data.diaryEntries),
            workLogs: normalizeRecord<WorkLog>(data.workLogs),
            settings: normalizeSettings(data.settings),
            celebratedAchievements: Array.isArray(data.celebratedAchievements)
              ? data.celebratedAchievements.filter((item): item is string => typeof item === 'string')
              : [],
            starBalance: typeof data.starBalance === 'number' ? data.starBalance : 0,
            starHistory: Array.isArray(data.starHistory) ? (data.starHistory as StarTransaction[]) : [],
            awards: ensureHabitStageAwards(Array.isArray(data.awards) ? (data.awards as Award[]) : [], importedHabits),
            dailyReports: normalizeRecord<DailyReport>(data.dailyReports),
            syncQueue: Array.isArray(data.syncQueue) ? (data.syncQueue as SyncQueueItem[]) : [],
            lastCelebration: undefined,
          })

          return true
        } catch {
          return false
        }
      },
      resetData: () => {
        set((state) => ({
          habits: normalizeHabits(state.habits).map((habit) => ({
            ...habit,
            completions: {},
            subTaskCompletions: {},
            path: {
              ...habit.path,
              currentMilestone: habit.path.milestones[0] ?? 3,
            },
          })),
          moodEntries: {},
          diaryEntries: {},
          workLogs: {},
          dailyReports: {},
          settings: state.settings,
          celebratedAchievements: state.celebratedAchievements,
          starBalance: state.starBalance,
          starHistory: state.starHistory,
          awards: state.awards,
          syncQueue: state.syncQueue,
          lastCelebration: undefined,
        }))
      },
    }),
    {
      name: storageKey,
      version: 2,
      storage: createJSONStorage(() => storageService),
      partialize: (state) => ({
        habits: state.habits,
        moodEntries: state.moodEntries,
        diaryEntries: state.diaryEntries,
        workLogs: state.workLogs,
        settings: state.settings,
        celebratedAchievements: state.celebratedAchievements,
        starBalance: state.starBalance,
        starHistory: state.starHistory,
        awards: state.awards,
        dailyReports: state.dailyReports,
        syncQueue: state.syncQueue,
      }),
      migrate: (persistedState) => normalizePersistedData(persistedState as Partial<HabitStore> | undefined),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedData(persistedState as Partial<HabitStore> | undefined),
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          storageService.removeItem(storageKey)
        }
      },
    },
  ),
)
