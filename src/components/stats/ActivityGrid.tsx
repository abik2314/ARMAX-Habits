import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DiaryEntry, Habit } from '../../types/habit'
import { cn } from '../../utils/cn'
import {
  compareDateKeys,
  dateKey,
  formatDisplayDate,
  formatMonthTitle,
  getCalendarCells,
  parseDateKey,
} from '../../utils/date'
import type { DailyActivity } from '../../utils/stats'
import { getHabitDayRatio, getRelevantHabits, isHabitCompletedOn } from '../../utils/stats'
import { AnimatedProgress } from '../ui/AnimatedProgress'
import { GlassCard } from '../ui/GlassCard'

interface ActivityGridProps {
  days: DailyActivity[]
  habits: Habit[]
  diaryEntries?: Record<string, DiaryEntry>
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getHeatClass(ratio: number, hasData: boolean) {
  if (!hasData) {
    return 'border-[var(--app-border)] bg-white/[0.035] text-[var(--app-muted)]'
  }

  if (ratio >= 100) {
    return 'border-[var(--app-green)]/70 bg-[var(--app-green)]/25 text-[var(--app-text)] shadow-[0_0_18px_var(--app-glow)]'
  }

  if (ratio >= 50) {
    return 'border-[var(--app-green)]/45 bg-[var(--app-green)]/14 text-[var(--app-text)]'
  }

  if (ratio > 0) {
    return 'border-amber-300/50 bg-amber-300/14 text-[var(--app-text)]'
  }

  return 'border-rose-400/30 bg-rose-500/10 text-[var(--app-muted)]'
}

function getFinanceForDay(habits: Habit[], key: string) {
  return habits.reduce(
    (sum, habit) => {
      if (!habit.moneyEffect || !isHabitCompletedOn(habit, key)) {
        return sum
      }

      const amount = habit.moneyEffect.amountPerCompletion
      if (habit.moneyEffect.type === 'income' || habit.moneyEffect.type === 'earned') {
        return { ...sum, earned: sum.earned + amount, total: sum.total + amount }
      }

      if (habit.moneyEffect.type === 'expense') {
        return { ...sum, expense: sum.expense + amount, total: sum.total - amount }
      }

      return { ...sum, saved: sum.saved + amount, total: sum.total + amount }
    },
    { earned: 0, saved: 0, expense: 0, total: 0 },
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

export function ActivityGrid({ days, habits, diaryEntries = {} }: ActivityGridProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const monthDate = useMemo(() => (days[0] ? parseDateKey(days[0].key) : new Date()), [days])
  const cells = useMemo(() => getCalendarCells(monthDate), [monthDate])
  const today = dateKey()
  const dayMap = useMemo(() => new Map(days.map((day) => [day.key, day])), [days])
  const pastAndToday = days.filter((day) => compareDateKeys(day.key, today) <= 0)
  const average =
    pastAndToday.length > 0
      ? Math.round(pastAndToday.reduce((sum, day) => sum + day.ratio, 0) / pastAndToday.length)
      : 0
  const selectedActivity = selectedDay ? dayMap.get(selectedDay) : undefined
  const selectedHabits = selectedDay ? getRelevantHabits(habits, selectedDay) : []
  const completed = selectedDay ? selectedHabits.filter((habit) => isHabitCompletedOn(habit, selectedDay)) : []
  const partial = selectedDay
    ? selectedHabits.filter((habit) => !isHabitCompletedOn(habit, selectedDay) && getHabitDayRatio(habit, selectedDay) > 0)
    : []
  const missed = selectedDay
    ? selectedHabits.filter((habit) => !isHabitCompletedOn(habit, selectedDay) && getHabitDayRatio(habit, selectedDay) === 0)
    : []
  const finance = selectedDay ? getFinanceForDay(habits, selectedDay) : { earned: 0, saved: 0, expense: 0, total: 0 }

  return (
    <div>
      <div className="mb-3">
        <div className="text-base font-semibold text-[var(--app-text)]">{formatMonthTitle(monthDate)}</div>
        <div className="text-xs text-[var(--app-muted)]">Средняя активность: {average}%</div>
      </div>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-medium text-[var(--app-muted)]">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const activity = dayMap.get(cell.key)
          const isCurrentMonth = cell.monthOffset === 0
          const isToday = cell.key === today
          const hasData = Boolean(activity && compareDateKeys(cell.key, today) <= 0 && activity.total > 0)

          if (!isCurrentMonth) {
            return <div key={cell.key} className="aspect-square rounded-[10px] opacity-0" />
          }

          return (
            <motion.button
              key={cell.key}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedDay(cell.key)}
              className={cn(
                'relative aspect-square rounded-[12px] border text-xs font-semibold transition-all',
                getHeatClass(activity?.ratio ?? 0, hasData),
                isToday && 'ring-1 ring-[var(--app-cyan)]/80',
              )}
              title={`${formatDisplayDate(cell.key)}: ${activity?.ratio ?? 0}%`}
            >
              {cell.day}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedDay ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 18, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.96 }}
              className="w-full max-w-[430px]"
            >
              <GlassCard strong className="max-h-[86svh] overflow-y-auto">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--app-text)]">Итог за {formatDisplayDate(selectedDay)}</h3>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">Прогресс, привычки, подзадачи и финансовый эффект.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-[var(--app-border)] bg-white/[0.04]"
                    aria-label="Закрыть"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <AnimatedProgress value={selectedActivity?.ratio ?? 0} />
                <div className="mt-2 text-sm font-semibold text-[var(--app-text)]">{selectedActivity?.ratio ?? 0}% активности</div>

                <DayList title="Выполненные" items={completed.map((habit) => habit.title)} />
                <DayList title="Частично выполненные" items={partial.map((habit) => habit.title)} />
                <DayList title="Невыполненные" items={missed.map((habit) => habit.title)} />

                {selectedHabits.some((habit) => habit.subTaskSettings.enabled && habit.subTasks.length > 0) ? (
                  <div className="mt-4 grid gap-2">
                    <div className="text-sm font-semibold text-[var(--app-text)]">Подзадачи</div>
                    {selectedHabits
                      .filter((habit) => habit.subTaskSettings.enabled && habit.subTasks.length > 0)
                      .map((habit) => (
                        <div key={habit.id} className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3">
                          <div className="text-sm font-semibold text-[var(--app-text)]">{habit.title}</div>
                          <div className="mt-2 grid gap-1 text-xs text-[var(--app-muted)]">
                            {habit.subTasks.map((subTask) => (
                              <span key={subTask.id}>
                                {subTask.title} — {habit.subTaskCompletions[selectedDay]?.[subTask.id] ? 'выполнено' : 'не отмечено'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}

                <div className="mt-4 rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3 text-sm text-[var(--app-muted)]">
                  Финансы: доход {formatMoney(finance.earned)} ₸ · экономия {formatMoney(finance.saved)} ₸ · расход{' '}
                  {formatMoney(finance.expense)} ₸ · итог {formatMoney(finance.total)} ₸
                </div>

                {diaryEntries[selectedDay]?.note ? (
                  <div className="mt-3 rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3 text-sm text-[var(--app-text)]">
                    {diaryEntries[selectedDay].note}
                  </div>
                ) : null}
              </GlassCard>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function DayList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-[var(--app-text)]">{title}</div>
      <div className="mt-2 grid gap-1 text-xs text-[var(--app-muted)]">
        {items.length > 0 ? items.map((item) => <span key={item}>{item}</span>) : <span>Нет данных</span>}
      </div>
    </div>
  )
}
