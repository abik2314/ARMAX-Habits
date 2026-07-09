import {
  Banknote,
  CalendarCheck,
  CircleCheck,
  CigaretteOff,
  Flame,
  Lightbulb,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { ActivityGrid } from '../components/stats/ActivityGrid'
import { AnimatedProgress } from '../components/ui/AnimatedProgress'
import { GlassCard } from '../components/ui/GlassCard'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatCard } from '../components/ui/StatCard'
import { useHabitStore } from '../store/habitsStore'
import { formatWeekday } from '../utils/date'
import { moodOptions, normalizeSettings } from '../utils/habits'
import { getDashboardStats } from '../utils/stats'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

function getMoodLabel(value: string) {
  return moodOptions.find((option) => option.value === value)?.label ?? value
}

export function StatsPage() {
  const habits = useHabitStore((state) => state.habits)
  const moodEntries = useHabitStore((state) => state.moodEntries)
  const diaryEntries = useHabitStore((state) => state.diaryEntries)
  const rawSettings = useHabitStore((state) => state.settings)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const workLogs = useHabitStore((state) => state.workLogs)
  const stats = useMemo(
    () => getDashboardStats(habits, undefined, moodEntries, settings, workLogs),
    [habits, moodEntries, settings, workLogs],
  )
  const maxWeekRatio = Math.max(100, ...stats.weekActivity.map((item) => item.ratio))

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--app-muted)]">Статистика</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-[var(--app-text)]">
          Дисциплина в цифрах
        </h1>
      </header>

      {settings.modules.levels ? (
      <GlassCard strong active>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[var(--app-muted)]">Опыт и ранг</div>
            <div className="mt-1 text-3xl font-semibold text-[var(--app-text)]">{stats.rank}</div>
            <div className="mt-1 text-xs text-[var(--app-muted)]">
              уровень {stats.level} · {stats.xp} опыта
            </div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[var(--app-green)] text-2xl font-bold text-[#04100A]">
            {stats.level}
          </div>
        </div>
        <AnimatedProgress value={stats.xpProgress} className="mt-4" />
        <div className="mt-2 text-xs text-[var(--app-muted)]">до следующего уровня {stats.nextLevelXp - stats.xp} опыта</div>
      </GlassCard>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Target} label="выполнение" value={`${stats.completionRate}%`} accent="#4ADE80" />
        <StatCard icon={Flame} label="серия дней" value={`${stats.activeStreak}`} accent="#8B5CF6" />
        <StatCard icon={Trophy} label="лучший рекорд" value={`${stats.bestStreak}`} accent="#FBBF24" />
        <StatCard icon={CircleCheck} label="отметок всего" value={`${stats.totalCompleted}`} accent="#22D3EE" />
        <StatCard icon={CalendarCheck} label="пропущено дней" value={`${stats.missedDays}`} accent="#FB7185" />
        <StatCard icon={TrendingUp} label="частичных дней" value={`${stats.partialDays}`} accent="#A3E635" />
      </div>

      {stats.totalCompleted === 0 ? (
        <GlassCard className="text-center">
          <Target className="mx-auto h-10 w-10 text-[var(--app-green)]" />
          <h2 className="mt-3 text-base font-semibold text-[var(--app-text)]">Статистика ждёт первых отметок</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Как только ты отметишь привычку, графики и подсказки начнут строиться на реальных данных.
          </p>
        </GlassCard>
      ) : null}

      <GlassCard>
        <SectionHeader title="Неделя" subtitle="график активности" />
        <div className="flex h-40 items-end gap-2">
          {stats.weekActivity.map((day) => (
            <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-[16px] bg-white/[0.05] p-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: stats.totalCompleted === 0 ? '0%' : `${Math.max(8, (day.ratio / maxWeekRatio) * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="w-full rounded-[12px] bg-[linear-gradient(180deg,var(--app-green),var(--app-purple))] shadow-[0_0_18px_var(--app-glow)]"
                />
              </div>
              <span className="text-[11px] text-[var(--app-muted)]">{formatWeekday(day.key)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Месяц" subtitle={`${stats.monthCompletionRate}% средняя активность`} />
        <ActivityGrid days={stats.monthActivity} habits={habits} diaryEntries={diaryEntries} />
      </GlassCard>

      {(settings.modules.noSmoking || settings.modules.finance) ? (
      <div className="grid grid-cols-2 gap-3">
        {settings.modules.noSmoking ? (
        <StatCard
          icon={CigaretteOff}
          label="сигарет не выкурено"
          value={`${stats.smoking.cigarettesAvoided}`}
          accent="#8B5CF6"
          helper={`${formatMoney(stats.smoking.moneySaved)} ₸`}
        />
        ) : null}
        {settings.modules.finance ? (
        <StatCard
          icon={Banknote}
          label="финансовый эффект"
          value={`${formatMoney(stats.finance.totalEffect)} ₸`}
          accent="#4ADE80"
          helper={`доход ${formatMoney(stats.finance.earned)} ₸ · расход ${formatMoney(stats.finance.expense)} ₸`}
        />
        ) : null}
      </div>
      ) : null}

      {settings.modules.analytics ? (
      <GlassCard>
        <SectionHeader title="Аналитика" subtitle="подсказки по ритму" />
        {stats.insights.length > 0 ? (
          <div className="grid gap-2">
            {stats.insights.map((insight) => (
              <div
                key={insight}
                className="flex gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-text)]"
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-green)]" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-sm text-[var(--app-muted)]">
            Подсказки появятся после первых отметок и будут строиться только на твоих реальных данных.
          </div>
        )}
      </GlassCard>
      ) : null}

      {settings.modules.mood ? (
      <GlassCard>
        <SectionHeader title="Настроение и выполнение" subtitle="связь с результатом" />
        {stats.moodPerformance.length > 0 ? (
          <div className="grid gap-3">
            {stats.moodPerformance.map((item) => (
              <div key={item.mood}>
                <div className="mb-1 flex justify-between text-xs text-[var(--app-muted)]">
                  <span>{getMoodLabel(item.mood)}</span>
                  <span>{item.averageProgress}% · {item.days} дн.</span>
                </div>
                <AnimatedProgress value={item.averageProgress} heightClassName="h-2" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--app-muted)]">Выбери настроение на главном экране, и здесь появится связь с прогрессом.</p>
        )}
      </GlassCard>
      ) : null}
    </div>
  )
}
