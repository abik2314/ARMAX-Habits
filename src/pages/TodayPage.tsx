import { AnimatePresence } from 'framer-motion'
import {
  Banknote,
  Briefcase,
  CalendarCheck,
  CigaretteOff,
  Clock3,
  Plus,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { HabitCard } from '../components/habits/HabitCard'
import { HabitEditorSheet } from '../components/habits/HabitEditorSheet'
import { DailyReportModal } from '../components/reports/DailyReportModal'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { AnimatedProgress } from '../components/ui/AnimatedProgress'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { GlassCard } from '../components/ui/GlassCard'
import { ProgressRing } from '../components/ui/ProgressRing'
import { SaveToast } from '../components/ui/SaveToast'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useTelegramUser } from '../hooks/useTelegramUser'
import { hapticImpact, hapticSuccess } from '../services/telegram'
import { notificationService } from '../services/notification'
import { useHabitStore } from '../store/habitsStore'
import type { DailyReport, HabitDraft, HabitModuleSettings } from '../types/habit'
import { cn } from '../utils/cn'
import { dateKey, formatDisplayDate } from '../utils/date'
import { moodOptions, moodTone } from '../utils/habits'
import {
  getDashboardStats,
  getHabitProgress,
  getRelevantHabits,
  isHabitCompletedOn,
} from '../utils/stats'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

function getHoursFrom(start?: string, end = new Date().toISOString()) {
  if (!start) {
    return 0
  }

  return Math.max(0, Number(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000).toFixed(1)))
}

export function TodayPage() {
  const today = dateKey()
  const habits = useHabitStore((state) => state.habits)
  const moodEntries = useHabitStore((state) => state.moodEntries)
  const diaryEntries = useHabitStore((state) => state.diaryEntries)
  const workLogs = useHabitStore((state) => state.workLogs)
  const settings = useHabitStore((state) => state.settings)
  const addHabit = useHabitStore((state) => state.addHabit)
  const updateHabit = useHabitStore((state) => state.updateHabit)
  const deleteHabit = useHabitStore((state) => state.deleteHabit)
  const toggleHabitForDate = useHabitStore((state) => state.toggleHabitForDate)
  const setMoodForDate = useHabitStore((state) => state.setMoodForDate)
  const setDiaryForDate = useHabitStore((state) => state.setDiaryForDate)
  const setHabitNoteForDate = useHabitStore((state) => state.setHabitNoteForDate)
  const setWorkLogForDate = useHabitStore((state) => state.setWorkLogForDate)
  const toggleSubtaskForDate = useHabitStore((state) => state.toggleSubtaskForDate)
  const generateDailyReport = useHabitStore((state) => state.generateDailyReport)
  const saveDailyReport = useHabitStore((state) => state.saveDailyReport)
  const { data: user } = useTelegramUser()
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [diaryDraft, setDiaryDraft] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [isReportOpen, setReportOpen] = useState(false)
  const stats = useMemo(
    () => getDashboardStats(habits, today, moodEntries, settings, workLogs),
    [habits, moodEntries, settings, today, workLogs],
  )
  const todayHabits = useMemo(() => getRelevantHabits(habits, today), [habits, today])
  const inactiveHabits = useMemo(() => habits.filter((habit) => !habit.deletedAt && !habit.isActive), [habits])
  const editingHabit = habits.find((habit) => habit.id === editingHabitId)
  const diary = diaryEntries[today]
  const selectedMood = moodEntries[today]?.mood
  const firstName =
    settings.profile.useTelegramName && user?.firstName
      ? user.firstName
      : settings.profile.displayName.trim() || user?.firstName || 'друг'
  const workHabit = habits.find((habit) => habit.category === 'work' || habit.icon === 'briefcase')
  const workLog = workLogs[today]
  const isDailyReportAvailable = settings.dev.allowDailyReportAnytime || new Date().getHours() >= 21
  const riskHabit = todayHabits
    .filter((habit) => !isHabitCompletedOn(habit, today))
    .sort((a, b) => getHabitProgress(b, today).streak - getHabitProgress(a, today).streak)[0]
  const moduleRank = (key: keyof HabitModuleSettings) => {
    const index = settings.moduleOrder.indexOf(key)
    return index >= 0 ? index : 99
  }

  useEffect(() => {
    setDiaryDraft(diary?.note ?? '')
  }, [diary?.note])

  const showSaved = () => {
    setToastMessage('Сохранено')
    window.setTimeout(() => setToastMessage(''), 1600)
  }

  const handleToggle = (habitId: string) => {
    const unlocked = toggleHabitForDate(habitId, today)
    hapticImpact('medium')

    if (unlocked.length > 0) {
      hapticSuccess()
    }
  }

  const openCreate = () => {
    setEditingHabitId(null)
    setEditorOpen(true)
  }

  const openEdit = (habitId: string) => {
    setEditingHabitId(habitId)
    setEditorOpen(true)
  }

  const handleSave = (draft: HabitDraft) => {
    if (editingHabit) {
      void notificationService.cancelHabitReminders(editingHabit)
      updateHabit(editingHabit.id, draft)
      void notificationService.scheduleHabitReminders({
        id: editingHabit.id,
        title: draft.title,
        reminder: draft.reminder,
        subTasks: draft.subTasks,
      })
    } else {
      const habit = addHabit(draft)
      void notificationService.scheduleHabitReminders(habit)
    }

    setEditorOpen(false)
    showSaved()
  }

  const handleDelete = () => {
    if (editingHabit) {
      setPendingDeleteId(editingHabit.id)
    }
  }

  const confirmDelete = () => {
    if (pendingDeleteId) {
      const habit = habits.find((item) => item.id === pendingDeleteId)
      if (habit) {
        void notificationService.cancelHabitReminders(habit)
      }
      deleteHabit(pendingDeleteId)
      setPendingDeleteId(null)
      setEditorOpen(false)
      setEditingHabitId(null)
      showSaved()
    }
  }

  const saveDiary = () => {
    setDiaryForDate(today, diaryDraft)
    showSaved()
  }

  const saveHabitNote = (habitId: string, note: string) => {
    setHabitNoteForDate(today, habitId, note)
    showSaved()
  }

  const markWork = (event: 'arrivedAt' | 'shiftStartedAt' | 'breakAt' | 'homeAt' | 'summaryAt') => {
    const now = new Date().toISOString()
    const nextPatch =
      event === 'homeAt'
        ? { [event]: now, hours: getHoursFrom(workLog?.arrivedAt, now) }
        : { [event]: now }

    setWorkLogForDate(today, nextPatch)

    if (event === 'arrivedAt' && workHabit && !isHabitCompletedOn(workHabit, today)) {
      toggleHabitForDate(workHabit.id, today, workHabit.goal.target)
    }

    hapticSuccess()
  }

  const openDailyReport = () => {
    if (!isDailyReportAvailable) {
      return
    }

    setDailyReport(generateDailyReport(today))
    setReportOpen(true)
  }

  const handleSaveDailyReport = () => {
    if (!dailyReport) {
      return
    }

    saveDailyReport(today, dailyReport)
    setReportOpen(false)
    showSaved()
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <p className="text-sm font-medium text-[var(--app-muted)]">{formatDisplayDate(today)}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[var(--app-text)]">
              Салам, {firstName}
            </h1>
            <p className="mt-1 text-sm text-[var(--app-muted)]">Премиальная система дисциплины дня.</p>
          </div>
          <AnimatedButton
            haptic
            type="button"
            onClick={openCreate}
            variant="primary"
            className="h-12 w-12 shrink-0 rounded-[18px] px-0"
            aria-label="Добавить привычку"
          >
            <Plus className="h-6 w-6" strokeWidth={2.7} />
          </AnimatedButton>
        </div>
      </header>

      <GlassCard strong active className="overflow-hidden p-0">
        <div className="grid grid-cols-[auto_1fr] gap-4 p-4">
          <ProgressRing value={stats.dayProgress} />
          <div className="flex min-w-0 flex-col justify-center">
            <div className="text-sm font-medium text-[var(--app-muted)]">Прогресс дня</div>
            <div className="mt-1 text-3xl font-semibold text-[var(--app-text)]">
              {stats.completedToday}/{stats.totalHabits}
            </div>
            <AnimatedProgress value={stats.dayProgress} className="mt-3" />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--app-muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-[14px] border border-[var(--app-border)] bg-white/[0.04] px-2 py-1.5">
                <Zap className="h-3.5 w-3.5 text-[var(--app-green)]" />
                серия {stats.activeStreak}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[14px] border border-[var(--app-border)] bg-white/[0.04] px-2 py-1.5">
                <Target className="h-3.5 w-3.5 text-[var(--app-purple)]" />
                рекорд {stats.bestStreak}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {settings.modules.mood ? (
      <GlassCard style={{ order: moduleRank('mood') }}>
        <SectionHeader title="Настроение дня" subtitle="сохраняется в статистике" />
        <div className="grid grid-cols-5 gap-2">
          {moodOptions.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setMoodForDate(today, mood.value)}
              className={cn(
                'h-11 rounded-[16px] border px-1 text-[11px] font-semibold transition-all',
                selectedMood === mood.value
                  ? 'scale-[1.03] text-[#04100A] shadow-[0_0_22px_var(--app-glow)]'
                  : 'text-[var(--app-muted)]',
              )}
              style={{
                borderColor: selectedMood === mood.value ? moodTone[mood.value] : 'var(--app-border)',
                backgroundColor: selectedMood === mood.value ? moodTone[mood.value] : 'rgba(255,255,255,0.04)',
              }}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </GlassCard>
      ) : null}

      <div className="grid gap-3">
        <GlassCard className="p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[var(--app-green)]/16 text-[var(--app-green)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[var(--app-text)]">Не пропусти</div>
              <div className="text-xs text-[var(--app-muted)]">
                {riskHabit
                  ? `${riskHabit.title}: не потеряй серию ${getHabitProgress(riskHabit, today).streak} дн.`
                  : 'Все ключевые привычки сегодня под контролем.'}
              </div>
            </div>
          </div>
        </GlassCard>

        {(settings.modules.noSmoking || settings.modules.finance) ? (
        <div className="grid grid-cols-2 gap-3" style={{ order: Math.min(moduleRank('noSmoking'), moduleRank('finance')) }}>
          {settings.modules.noSmoking ? (
          <GlassCard className="p-3">
            <CigaretteOff className="h-5 w-5 text-[var(--app-purple)]" />
            <div className="mt-3 text-2xl font-semibold text-[var(--app-text)]">{stats.smoking.days}</div>
            <div className="text-xs text-[var(--app-muted)]">дней не курит</div>
            <div className="mt-2 text-[11px] text-[var(--app-green)]">
              {formatMoney(stats.smoking.moneySaved)} ₸ сохранено
            </div>
          </GlassCard>
          ) : null}
          {settings.modules.finance ? (
          <GlassCard className="p-3">
            <Banknote className="h-5 w-5 text-[var(--app-green)]" />
            <div className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {formatMoney(stats.finance.totalEffect)}
            </div>
            <div className="text-xs text-[var(--app-muted)]">финансовый эффект</div>
            <div className="mt-2 text-[11px] text-[var(--app-green)]">₸ по привычкам</div>
          </GlassCard>
          ) : null}
        </div>
        ) : null}

        {settings.modules.workMode ? (
        <GlassCard style={{ order: moduleRank('workMode') }}>
          <SectionHeader title="Рабочий режим" subtitle={`${stats.work.workDays} рабочих дней · стабильность графика`} />
          <p className="mb-3 text-xs leading-relaxed text-[var(--app-muted)]">
            Отмечай выход, смену, перерыв и итог дня, чтобы видеть рабочие дни, часы и стабильность режима.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <AnimatedButton haptic type="button" onClick={() => markWork('arrivedAt')} className="h-11 px-2">
              <Briefcase className="h-4 w-4" />
              Вышел
            </AnimatedButton>
            <AnimatedButton haptic type="button" onClick={() => markWork('shiftStartedAt')} className="h-11 px-2">
              Начал смену
            </AnimatedButton>
            <AnimatedButton haptic type="button" onClick={() => markWork('breakAt')} className="h-11 px-2">
              <Clock3 className="h-4 w-4" />
              Перерыв
            </AnimatedButton>
            <AnimatedButton haptic type="button" onClick={() => markWork('homeAt')} className="h-11 px-2">
              Закончил
            </AnimatedButton>
            <AnimatedButton
              haptic
              type="button"
              onClick={openDailyReport}
              disabled={!isDailyReportAvailable}
              className={cn('col-span-2 h-11 px-2', !isDailyReportAvailable && 'opacity-55')}
            >
              {isDailyReportAvailable ? 'Итог дня' : 'Доступно после 21:00'}
            </AnimatedButton>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-[var(--app-muted)]">
            <span>{workLog?.arrivedAt ? 'вышел' : 'не отмечено'}</span>
            <span>{workLog?.shiftStartedAt ? 'смена начата' : workLog?.breakAt ? 'перерыв' : 'без смены'}</span>
            <span>{workLog?.hours ? `${workLog.hours} ч` : `${stats.work.averageHours} ч ср.`}</span>
          </div>
        </GlassCard>
        ) : null}
      </div>

      {settings.modules.diary ? (
      <GlassCard style={{ order: moduleRank('diary') }}>
        <SectionHeader title="Дневник" subtitle="заметка на сегодня" />
        <textarea
          value={diaryDraft}
          onChange={(event) => setDiaryDraft(event.target.value)}
          placeholder="Что сегодня важно заметить?"
          className="min-h-20 w-full resize-none rounded-[18px] border border-[var(--app-border)] bg-white/[0.05] px-4 py-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/70"
        />
        {diaryDraft !== (diary?.note ?? '') ? (
          <AnimatedButton type="button" onClick={saveDiary} className="mt-3 h-10 rounded-[16px] px-4">
            Сохранить
          </AnimatedButton>
        ) : null}
      </GlassCard>
      ) : null}

      <section>
        <SectionHeader
          title="Привычки"
          subtitle={`${todayHabits.length} активных`}
          action={
            <AnimatedButton type="button" onClick={openCreate} className="h-9 rounded-[16px] px-3">
              <Plus className="h-4 w-4 text-[var(--app-green)]" />
              Добавить
            </AnimatedButton>
          }
        />

        <AnimatePresence mode="popLayout">
          {todayHabits.length > 0 ? (
            <div className="grid gap-3">
              {todayHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  dateKey={today}
                  progress={getHabitProgress(habit, today, diary)}
                  onToggle={() => handleToggle(habit.id)}
                  onEdit={() => openEdit(habit.id)}
                  onNoteSave={(note) => saveHabitNote(habit.id, note)}
                  onSubtaskToggle={(subtaskId) => toggleSubtaskForDate(habit.id, subtaskId, today)}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="text-center">
              <CalendarCheck className="mx-auto h-10 w-10 text-[var(--app-green)]" />
              <h3 className="mt-3 text-base font-semibold text-[var(--app-text)]">На сегодня пусто</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Добавь привычку и начни серию.</p>
            </GlassCard>
          )}
        </AnimatePresence>
      </section>

      {inactiveHabits.length > 0 ? (
        <section>
          <SectionHeader title="Мои привычки" subtitle="отключённые можно вернуть" />
          <div className="grid gap-3">
            {inactiveHabits.map((habit) => (
              <GlassCard key={habit.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--app-text)]">{habit.title}</div>
                    <div className="text-xs text-[var(--app-muted)]">Отключена</div>
                  </div>
                  <AnimatedButton type="button" onClick={() => openEdit(habit.id)} className="h-10 rounded-[16px] px-3">
                    Изменить
                  </AnimatedButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      ) : null}

      <HabitEditorSheet
        isOpen={isEditorOpen}
        habit={editingHabit}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onDelete={editingHabit ? handleDelete : undefined}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Удалить привычку?"
        description="Привычка исчезнет из списка, а связанные отметки и заметки по ней будут очищены."
        confirmLabel="Удалить"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
      <DailyReportModal
        isOpen={isReportOpen}
        report={dailyReport}
        onClose={() => setReportOpen(false)}
        onSave={handleSaveDailyReport}
      />
      <SaveToast message={toastMessage} />
    </div>
  )
}
