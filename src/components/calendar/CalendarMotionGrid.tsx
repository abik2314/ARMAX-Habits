import { motion } from 'framer-motion'
import type { Habit } from '../../types/habit'
import { cn } from '../../utils/cn'
import { dateKey, getCalendarCells, isPastDate } from '../../utils/date'
import { getDailyActivity } from '../../utils/stats'

interface CalendarMotionGridProps {
  monthDate: Date
  selectedDateKey: string
  habits: Habit[]
  direction: number
  onSelect: (key: string) => void
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getCellClass(status: ReturnType<typeof getDailyActivity>['status'], missed: boolean) {
  if (status === 'complete') {
    return 'border-[var(--app-green)]/65 bg-[var(--app-green)]/18 text-[var(--app-text)]'
  }

  if (status === 'partial') {
    return 'border-amber-300/60 bg-amber-300/16 text-[var(--app-text)]'
  }

  if (missed) {
    return 'border-rose-400/35 bg-rose-500/10 text-[var(--app-muted)]'
  }

  return 'border-[var(--app-border)] bg-white/[0.04] text-[var(--app-muted)]'
}

export function CalendarMotionGrid({
  monthDate,
  selectedDateKey,
  habits,
  direction,
  onSelect,
}: CalendarMotionGridProps) {
  const cells = getCalendarCells(monthDate)
  const today = dateKey()
  const maxCompleted = Math.max(0, ...cells.map((cell) => getDailyActivity(habits, cell.key).completed))

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-medium text-[var(--app-muted)]">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <motion.div
        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
        initial={{ opacity: 0, x: direction >= 0 ? 26 : -26 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction >= 0 ? -26 : 26 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((cell, index) => {
          const activity = getDailyActivity(habits, cell.key)
          const isSelected = selectedDateKey === cell.key
          const isToday = today === cell.key
          const isOutside = cell.monthOffset !== 0
          const missed = activity.total > 0 && activity.completed === 0 && isPastDate(cell.key)
          const isRecord = activity.completed > 0 && activity.completed === maxCompleted && activity.status === 'complete'

          return (
            <motion.button
              layout
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, scale: 0.84 }}
              animate={{ opacity: 1, scale: isSelected ? 1.08 : 1 }}
              transition={{ delay: Math.min(index * 0.006, 0.12), type: 'spring', stiffness: 420, damping: 30 }}
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={cn(
                'relative aspect-square rounded-[16px] border text-sm font-semibold transition-all duration-300',
                getCellClass(activity.status, missed),
                isOutside && 'opacity-35',
                isSelected && 'z-10 shadow-[0_0_24px_var(--app-glow)] ring-2 ring-[var(--app-green)]',
                isRecord && 'ring-1 ring-amber-300/80',
              )}
              aria-label={`Выбрать ${cell.key}`}
            >
              <span>{cell.day}</span>
              <motion.span
                className={cn(
                  'absolute inset-x-0 bottom-1.5 mx-auto h-1.5 w-1.5 rounded-full',
                  activity.status === 'complete'
                    ? 'bg-[var(--app-green)]'
                    : activity.status === 'partial'
                      ? 'bg-[var(--app-amber)]'
                      : missed
                        ? 'bg-rose-400'
                        : 'bg-transparent',
                )}
                initial={{ scale: 0 }}
                animate={{ scale: activity.completed > 0 || missed ? 1 : 0 }}
              />
              {isToday ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--app-cyan)]" />
              ) : null}
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
