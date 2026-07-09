import { motion } from 'framer-motion'
import { Flame, History, Star, Trophy } from 'lucide-react'
import type { Habit } from '../../types/habit'
import { getHabitCardColor, getHabitIconColor } from '../../utils/habits'
import { getHabitProgress } from '../../utils/stats'
import { AnimatedProgress } from '../ui/AnimatedProgress'
import { HabitIconView } from './HabitIcon'

interface HabitPathCardProps {
  habit: Habit
  dateKey: string
}

export function HabitPathCard({ habit, dateKey }: HabitPathCardProps) {
  const progress = getHabitProgress(habit, dateKey)
  const milestones = habit.path.milestones.length ? habit.path.milestones : [3, 7, 21, 30, 60, 120, 365, 730, 1000]
  const nextMilestone = milestones.find((milestone) => !habit.path.completedMilestones.includes(milestone)) ?? milestones[milestones.length - 1]
  const stageProgress = nextMilestone ? Math.min(100, Math.round((progress.streak / nextMilestone) * 100)) : 0
  const earnedStars = habit.path.completedMilestones.reduce((sum, milestone) => sum + milestone, 0)
  const cardColor = getHabitCardColor(habit)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface overflow-hidden rounded-[22px] p-3"
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-[var(--app-border)]"
          style={{ backgroundColor: `${cardColor}18` }}
        >
          <HabitIconView icon={habit.icon} color={getHabitIconColor(habit)} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--app-text)]">{habit.title}</h3>
              <p className="mt-1 text-xs text-[var(--app-muted)]">Путь к следующей награде</p>
            </div>
            <div className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-200">
              {earnedStars}⭐
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] p-2">
              <Flame className="mx-auto h-4 w-4 text-[var(--app-green)]" />
              <div className="mt-1 font-semibold text-[var(--app-text)]">{progress.streak}</div>
              <div className="text-[var(--app-muted)]">серия</div>
            </div>
            <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] p-2">
              <Trophy className="mx-auto h-4 w-4 text-amber-300" />
              <div className="mt-1 font-semibold text-[var(--app-text)]">{progress.bestStreak}</div>
              <div className="text-[var(--app-muted)]">рекорд</div>
            </div>
            <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] p-2">
              <Star className="mx-auto h-4 w-4 text-[var(--app-purple)]" />
              <div className="mt-1 font-semibold text-[var(--app-text)]">+{nextMilestone}</div>
              <div className="text-[var(--app-muted)]">награда</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-[var(--app-muted)]">
              <span>Этап {nextMilestone} дней</span>
              <span>{stageProgress}%</span>
            </div>
            <AnimatedProgress value={stageProgress} heightClassName="h-2" />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {milestones.map((milestone) => (
              <span
                key={milestone}
                className={
                  habit.path.completedMilestones.includes(milestone)
                    ? 'rounded-full border border-amber-300/50 bg-amber-300/15 px-2 py-1 text-[10px] font-semibold text-amber-200'
                    : 'rounded-full border border-[var(--app-border)] bg-white/[0.035] px-2 py-1 text-[10px] text-[var(--app-muted)]'
                }
              >
                {milestone}
              </span>
            ))}
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-white/[0.035] px-2 py-1 text-[11px] text-[var(--app-muted)]">
            <History className="h-3.5 w-3.5" />
            {progress.totalCompleted} отметок за всё время
          </div>
        </div>
      </div>
    </motion.article>
  )
}
