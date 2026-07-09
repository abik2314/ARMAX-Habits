import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CalendarMotionGrid } from '../components/calendar/CalendarMotionGrid'
import { HabitPathCard } from '../components/habits/HabitPathCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { GlassCard } from '../components/ui/GlassCard'
import { SaveToast } from '../components/ui/SaveToast'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useHabitStore } from '../store/habitsStore'
import { addMonths, dateKey, formatDisplayDate, formatMonthTitle } from '../utils/date'
import { getDailyActivity, getRelevantHabits } from '../utils/stats'

export function CalendarPage() {
  const today = dateKey()
  const habits = useHabitStore((state) => state.habits)
  const diaryEntries = useHabitStore((state) => state.diaryEntries)
  const setDiaryForDate = useHabitStore((state) => state.setDiaryForDate)
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [direction, setDirection] = useState(1)
  const [diaryDraft, setDiaryDraft] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const selectedHabits = useMemo(() => getRelevantHabits(habits, selectedDate), [habits, selectedDate])
  const activity = useMemo(() => getDailyActivity(habits, selectedDate), [habits, selectedDate])
  const diary = diaryEntries[selectedDate]

  useEffect(() => {
    setDiaryDraft(diary?.note ?? '')
  }, [diary?.note])

  const showSaved = () => {
    setToastMessage('Сохранено')
    window.setTimeout(() => setToastMessage(''), 1600)
  }

  const changeMonth = (amount: number) => {
    setDirection(amount)
    setMonthDate((current) => addMonths(current, amount))
  }

  const saveDiary = () => {
    setDiaryForDate(selectedDate, diaryDraft)
    showSaved()
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--app-muted)]">Календарь</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-[var(--app-text)]">
          История дисциплины
        </h1>
      </header>

      <GlassCard strong>
        <div className="mb-4 flex items-center justify-between">
          <AnimatedButton
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-10 w-10 rounded-[16px] px-0"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-5 w-5" />
          </AnimatedButton>
          <div className="text-center">
            <div className="text-base font-semibold text-[var(--app-text)]">{formatMonthTitle(monthDate)}</div>
            <div className="text-xs text-[var(--app-muted)]">{activity.ratio}% выбранного дня</div>
          </div>
          <AnimatedButton
            type="button"
            onClick={() => changeMonth(1)}
            className="h-10 w-10 rounded-[16px] px-0"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-5 w-5" />
          </AnimatedButton>
        </div>

        <CalendarMotionGrid
          monthDate={monthDate}
          selectedDateKey={selectedDate}
          habits={habits}
          direction={direction}
          onSelect={setSelectedDate}
        />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Дневник дня" subtitle={formatDisplayDate(selectedDate)} />
        <textarea
          value={diaryDraft}
          onChange={(event) => setDiaryDraft(event.target.value)}
          placeholder="Что повлияло на день?"
          className="min-h-20 w-full resize-none rounded-[18px] border border-[var(--app-border)] bg-white/[0.05] px-4 py-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/70"
        />
        {diaryDraft !== (diary?.note ?? '') ? (
          <AnimatedButton type="button" onClick={saveDiary} className="mt-3 h-10 rounded-[16px] px-4">
            Сохранить
          </AnimatedButton>
        ) : null}
      </GlassCard>

      <section>
        <SectionHeader
          title="Путь привычек"
          subtitle={`${formatDisplayDate(selectedDate)} · ${activity.ratio}% активности`}
        />
        <div className="grid gap-3">
          {selectedHabits.map((habit) => (
            <HabitPathCard key={habit.id} habit={habit} dateKey={selectedDate} />
          ))}
        </div>
      </section>
      <SaveToast message={toastMessage} />
    </div>
  )
}
