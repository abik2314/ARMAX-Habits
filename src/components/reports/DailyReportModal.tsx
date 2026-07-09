import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { DailyReport } from '../../types/habit'
import { formatDisplayDate } from '../../utils/date'
import { AnimatedButton } from '../ui/AnimatedButton'
import { AnimatedProgress } from '../ui/AnimatedProgress'
import { GlassCard } from '../ui/GlassCard'

interface DailyReportModalProps {
  isOpen: boolean
  report: DailyReport | null
  onClose: () => void
  onSave: () => void
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

export function DailyReportModal({ isOpen, report, onClose, onSave }: DailyReportModalProps) {
  return (
    <AnimatePresence>
      {isOpen && report ? (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 18, scale: 0.96 }}
            className="w-full max-w-[440px]"
          >
            <GlassCard strong className="max-h-[86svh] overflow-y-auto">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--app-text)]">Итог дня</h2>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">{formatDisplayDate(report.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-[var(--app-border)] bg-white/[0.04]"
                  aria-label="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-[20px] border border-[var(--app-border)] bg-white/[0.045] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[var(--app-muted)]">Выполнено привычек</div>
                    <div className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
                      {report.summary.completedHabits}/{report.summary.totalHabits}
                    </div>
                  </div>
                  <div className="text-right text-sm text-[var(--app-muted)]">
                    <div>{report.summary.progress}%</div>
                    <div>{formatMoney(report.summary.financeEffect)} ₸</div>
                    <div>серия {report.summary.streak}</div>
                  </div>
                </div>
                <AnimatedProgress value={report.summary.progress} className="mt-3" />
              </div>

              <ReportSection title="Работа" items={report.work} />
              <ReportSection title="Не курю" items={[report.smoking]} />
              <ReportSection title="Выполненные" items={report.habits.completed} />
              <ReportSection title="Частично выполненные" items={report.habits.partial} />
              <ReportSection title="Невыполненные" items={report.habits.missed} />

              {Object.keys(report.subtasks).length > 0 ? (
                <div className="mt-4 grid gap-2">
                  <div className="text-sm font-semibold text-[var(--app-text)]">Подзадачи</div>
                  {Object.entries(report.subtasks).map(([habitTitle, subtasks]) => (
                    <div key={habitTitle} className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3">
                      <div className="text-sm font-semibold text-[var(--app-text)]">{habitTitle}</div>
                      <div className="mt-2 grid gap-1 text-xs text-[var(--app-muted)]">
                        {subtasks.map((subtask) => (
                          <span key={subtask.title}>
                            {subtask.title} — {subtask.completed ? 'выполнено' : 'не отмечено'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3 text-sm text-[var(--app-muted)]">
                Финансы: заработано {formatMoney(report.finance.earned)} ₸ · сэкономлено {formatMoney(report.finance.saved)} ₸ · потрачено{' '}
                {formatMoney(report.finance.expense)} ₸ · итог {formatMoney(report.finance.total)} ₸
              </div>

              <ReportSection title="Вывод" items={report.conclusion} />

              <AnimatedButton type="button" onClick={onSave} variant="primary" className="mt-4 w-full">
                Сохранить в дневник
              </AnimatedButton>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-[var(--app-text)]">{title}</div>
      <div className="mt-2 grid gap-1 text-xs text-[var(--app-muted)]">
        {items.length > 0 ? items.map((item) => <span key={item}>{item}</span>) : <span>Нет данных</span>}
      </div>
    </div>
  )
}
