import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Flame, Pencil, Star, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Habit } from '../../types/habit'
import { getCategoryLabel, getHabitCardColor, getHabitIconColor, getTypeLabel } from '../../utils/habits'
import type { HabitProgress } from '../../utils/stats'
import { cn } from '../../utils/cn'
import { AnimatedButton } from '../ui/AnimatedButton'
import { AnimatedProgress } from '../ui/AnimatedProgress'
import { IosCheckButton } from '../ui/IosCheckButton'
import { HabitIconView } from './HabitIcon'

interface HabitCardProps {
  habit: Habit
  progress: HabitProgress
  dateKey: string
  onToggle: () => void
  onEdit?: () => void
  onNoteSave?: (note: string) => void
  onSubtaskToggle?: (subtaskId: string) => void
}

const burstParticles = Array.from({ length: 7 }, (_, index) => ({
  id: index,
  x: Math.cos(index) * (22 + index * 2),
  y: Math.sin(index) * (18 + index * 2),
}))

const subtaskTypeLabels = {
  checkbox: 'галочка',
  count: 'количество',
  time: 'время',
  value: 'значение',
  money: 'деньги',
  text: 'текст',
}

function getNextReminderLabel(habit: Habit) {
  const reminders = [
    ...habit.reminder.items.filter((reminder) => reminder.enabled),
    ...habit.subTasks.map((subTask) => subTask.reminder).filter((reminder) => reminder.enabled),
  ].sort((a, b) => a.time.localeCompare(b.time))

  if (reminders.length === 0) {
    return 'Напоминания не настроены'
  }

  const now = new Date()
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const next = reminders.find((reminder) => reminder.time >= current) ?? reminders[0]

  return `Следующее: сегодня в ${next.time}`
}

export function HabitCard({ habit, progress, dateKey, onToggle, onEdit, onNoteSave, onSubtaskToggle }: HabitCardProps) {
  const wasCompleted = useRef(progress.completed)
  const [showBurst, setShowBurst] = useState(false)
  const [subtasksOpen, setSubtasksOpen] = useState(habit.subTaskSettings.enabled)
  const [noteDraft, setNoteDraft] = useState(progress.note)
  const cardColor = getHabitCardColor(habit)
  const iconColor = getHabitIconColor(habit)
  const subtaskCompletions = habit.subTaskCompletions[dateKey] ?? {}
  const completedSubtasks = habit.subTasks.filter((subTask) => subtaskCompletions[subTask.id]).length
  const requiredSubtasks = habit.subTasks.filter((subTask) => subTask.required)
  const requiredCompleted = requiredSubtasks.filter((subTask) => subtaskCompletions[subTask.id]).length
  const hasSubtasks = habit.subTaskSettings.enabled && habit.subTasks.length > 0
  const canCompleteMain = !hasSubtasks || requiredSubtasks.length === 0 || requiredCompleted === requiredSubtasks.length
  const subtaskRatio = habit.subTasks.length > 0 ? Math.round((completedSubtasks / habit.subTasks.length) * 100) : 0
  const noteDirty = noteDraft !== progress.note
  const pathMilestones = habit.path.milestones.length ? habit.path.milestones : [3, 7, 21, 30, 60, 120, 365, 730, 1000]
  const nextMilestone =
    pathMilestones.find((milestone) => !habit.path.completedMilestones.includes(milestone)) ??
    pathMilestones[pathMilestones.length - 1]
  const pathRatio = nextMilestone ? Math.min(100, Math.round((progress.streak / nextMilestone) * 100)) : 0

  useEffect(() => {
    if (!wasCompleted.current && progress.completed) {
      setShowBurst(true)
      const timer = window.setTimeout(() => setShowBurst(false), 700)
      wasCompleted.current = progress.completed
      return () => window.clearTimeout(timer)
    }

    wasCompleted.current = progress.completed
    return undefined
  }, [progress.completed])

  useEffect(() => {
    setNoteDraft(progress.note)
  }, [progress.note])

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'glass-surface relative overflow-hidden rounded-[22px] p-3 transition-all duration-300',
        progress.completed && 'shadow-[0_0_34px_var(--app-glow),0_18px_70px_var(--app-shadow)]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background: progress.completed
            ? `linear-gradient(135deg, ${cardColor}24, rgba(139,92,246,0.12))`
            : 'transparent',
        }}
      />

      <div className="relative z-10 flex items-start gap-3">
        <div
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px] border border-[var(--app-border)]"
          style={{ backgroundColor: `${cardColor}18` }}
        >
          <HabitIconView icon={habit.icon} color={iconColor} className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--app-text)]">{habit.title}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[var(--app-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-muted)]">
                  {getTypeLabel(habit.type)}
                </span>
                <span className="rounded-full border border-[var(--app-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-muted)]">
                  {getCategoryLabel(habit.category)}
                </span>
              </div>
            </div>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-[var(--app-border)] bg-white/[0.04] text-[var(--app-muted)]"
                aria-label={`Редактировать ${habit.title}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {habit.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--app-muted)]">
              {habit.description}
            </p>
          ) : null}

          {hasSubtasks ? (
            <button
              type="button"
              onClick={() => setSubtasksOpen((current) => !current)}
              className="mt-3 flex w-full items-center justify-between rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] px-3 py-2 text-left text-xs text-[var(--app-muted)]"
            >
              <span>
                Подзадачи: {completedSubtasks} из {habit.subTasks.length}
                {habit.subTaskSettings.showPercent ? ` · ${subtaskRatio}%` : ''}
              </span>
              <motion.span animate={{ rotate: subtasksOpen ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>
          ) : null}

          <div className="mt-3">
            <AnimatedProgress value={hasSubtasks ? subtaskRatio : progress.completionRate} heightClassName="h-1.5" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--app-muted)]">
            <motion.span
              key={progress.streak}
              initial={{ y: 4, opacity: 0.2 }}
              animate={{ y: 0, opacity: 1 }}
              className="inline-flex items-center gap-1"
            >
              <Flame className="h-3.5 w-3.5 text-[var(--app-green)]" />
              {progress.streak} подряд
            </motion.span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-[var(--app-amber)]" />
              рекорд {progress.bestStreak}
            </span>
            <span>{progress.totalCompleted} отметок</span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-white/[0.035] px-2 py-1 text-[11px] text-[var(--app-muted)]">
            <Bell className="h-3.5 w-3.5 text-[var(--app-cyan)]" />
            {getNextReminderLabel(habit)}
          </div>

          {habit.path.enabled ? (
            <div className="mt-3 rounded-[16px] border border-[var(--app-border)] bg-white/[0.035] p-2">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--app-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-300" />
                  Путь: {progress.streak}/{nextMilestone} дней
                </span>
                <span>+{nextMilestone}⭐</span>
              </div>
              <AnimatedProgress value={pathRatio} heightClassName="h-1.5" />
            </div>
          ) : null}
        </div>

      <div className="relative shrink-0">
          <IosCheckButton
            checked={progress.completed}
            disabled={!progress.completed && !canCompleteMain}
            onClick={onToggle}
            label={progress.completed ? `Снять отметку ${habit.title}` : `Отметить ${habit.title}`}
          />

          <AnimatePresence>
            {showBurst ? (
              <span className="pointer-events-none absolute left-1/2 top-1/2">
                {burstParticles.map((particle) => (
                  <motion.span
                    key={particle.id}
                    className="absolute h-1.5 w-1.5 rounded-full bg-[var(--app-green)] shadow-[0_0_12px_var(--app-glow)]"
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                    animate={{ x: particle.x, y: particle.y, scale: [0.3, 1, 0.4], opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.68, ease: 'easeOut' }}
                  />
                ))}
              </span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasSubtasks && subtasksOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 mt-3 grid gap-2 overflow-hidden"
          >
            {habit.subTasks.map((subTask) => {
              const isDone = Boolean(subtaskCompletions[subTask.id])

              return (
                <button
                  key={subTask.id}
                  type="button"
                  onClick={() => onSubtaskToggle?.(subTask.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] p-2.5 text-left',
                    isDone && 'border-[var(--app-green)]/45 bg-[var(--app-green)]/10',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                      isDone
                        ? 'border-[var(--app-green)] bg-[var(--app-green)] text-[#04100A]'
                        : 'border-[var(--app-border)] text-[var(--app-muted)]',
                    )}
                  >
                    {isDone ? '✓' : subTask.order + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--app-text)]">{subTask.title}</span>
                    <span className="text-[11px] text-[var(--app-muted)]">
                      {subTask.required ? 'Обязательная' : 'Дополнительная'} · {subtaskTypeLabels[subTask.type]}
                    </span>
                  </span>
                </button>
              )
            })}
            {!canCompleteMain ? (
              <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.035] px-3 py-2 text-xs text-[var(--app-muted)]">
                Основная привычка откроется после обязательных подзадач: {requiredCompleted} из {requiredSubtasks.length}.
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {onNoteSave ? (
        <div className="relative z-10 mt-3 grid gap-2">
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Заметка к привычке"
            className="min-h-10 w-full resize-none rounded-[16px] border border-[var(--app-border)] bg-white/[0.045] px-3 py-2 text-xs text-[var(--app-text)] placeholder:text-[var(--app-muted)]/70"
          />
          {noteDirty ? (
            <AnimatedButton type="button" onClick={() => onNoteSave(noteDraft)} className="h-9 justify-self-end rounded-[14px] px-3 text-xs">
              Сохранить
            </AnimatedButton>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  )
}
