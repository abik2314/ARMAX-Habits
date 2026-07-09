import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, ChevronDown, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  Habit,
  HabitCategory,
  HabitDraft,
  HabitGoalType,
  HabitIconKey,
  HabitSubtask,
  HabitSubtaskType,
  HabitType,
  MoneyEffectPeriod,
  MoneyEffectType,
  Reminder,
  ReminderRepeatType,
} from '../../types/habit'
import { useHabitStore } from '../../store/habitsStore'
import {
  categoryOptions,
  colorOptions,
  createReminder,
  createSubtask,
  createSubtaskTemplate,
  extraIconOptions,
  getDefaultDraft,
  getDefaultReminder,
  getDefaultPathSettings,
  getSubtaskTemplate,
  habitPathMilestones,
  goalOptions,
  iconOptions,
  normalizeSettings,
  subtaskTemplates,
  typeOptions,
} from '../../utils/habits'
import { cn } from '../../utils/cn'
import { hapticSelection } from '../../services/telegram'
import { notificationService, type ReminderStatus } from '../../services/notification'
import { AnimatedButton } from '../ui/AnimatedButton'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LiquidSwitch } from '../ui/LiquidSwitch'
import { LiquidToggle } from '../ui/LiquidToggle'
import { HabitIconView } from './HabitIcon'

interface HabitEditorSheetProps {
  isOpen: boolean
  habit?: Habit
  onClose: () => void
  onSave: (draft: HabitDraft) => void
  onDelete?: () => void
}

const moneyTypes: { value: MoneyEffectType; label: string }[] = [
  { value: 'saving', label: 'Экономия' },
  { value: 'income', label: 'Доход' },
  { value: 'expense', label: 'Расход' },
]

const moneyPeriods: { value: MoneyEffectPeriod; label: string }[] = [
  { value: 'completion', label: 'За выполнение' },
  { value: 'day', label: 'За день' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
]

const subtaskTypes: { value: HabitSubtaskType; label: string }[] = [
  { value: 'checkbox', label: 'Галочка' },
  { value: 'count', label: 'Количество' },
  { value: 'time', label: 'Время' },
  { value: 'value', label: 'Значение' },
  { value: 'money', label: 'Деньги' },
  { value: 'text', label: 'Текст' },
]

const repeatOptions: { value: ReminderRepeatType; label: string }[] = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'По дням недели' },
  { value: 'once', label: 'Один раз' },
]

function toDraft(habit?: Habit): HabitDraft {
  if (!habit) {
    return getDefaultDraft()
  }

  return {
    title: habit.title,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    iconColor: habit.iconColor ?? '',
    cardColor: habit.cardColor ?? '',
    category: habit.category,
    type: habit.type,
    goal: habit.goal,
    startDate: habit.startDate,
    isActive: habit.isActive,
    moneyEffect: habit.moneyEffect,
    subTasks: habit.subTasks,
    subTaskSettings: habit.subTaskSettings,
    reminder: habit.reminder,
    path: habit.path,
  }
}

function isSameDraft(a: HabitDraft, b: HabitDraft) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function HabitEditorSheet({ isOpen, habit, onClose, onSave, onDelete }: HabitEditorSheetProps) {
  const rawSettings = useHabitStore((state) => state.settings)
  const modules = useMemo(() => normalizeSettings(rawSettings).modules, [rawSettings])
  const initialDraft = useMemo(() => toDraft(habit), [habit])
  const [draft, setDraft] = useState<HabitDraft>(initialDraft)
  const [showExtraIcons, setShowExtraIcons] = useState(false)
  const [isCloseConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [isTemplateOpen, setTemplateOpen] = useState(false)
  const [templateNotice, setTemplateNotice] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>(() =>
    notificationService.getNotificationSupportStatus(),
  )
  const isValid = draft.title.trim().length >= 2
  const isDirty = !isSameDraft(draft, initialDraft)

  useEffect(() => {
    if (isOpen) {
      setDraft(initialDraft)
      setShowExtraIcons(false)
      setNewSubtaskTitle('')
      setTemplateOpen(false)
      setTemplateNotice('')
      setReminderStatus(notificationService.getNotificationSupportStatus())
    }
  }, [initialDraft, isOpen])

  const updateDraft = (patch: Partial<HabitDraft>) => {
    hapticSelection()
    setDraft((current) => ({ ...current, ...patch }))
  }

  const updateGoal = (patch: Partial<HabitDraft['goal']>) => {
    setDraft((current) => ({
      ...current,
      goal: {
        ...current.goal,
        ...patch,
      },
    }))
  }

  const updateSubtask = (subtaskId: string, patch: Partial<HabitSubtask>) => {
    setDraft((current) => ({
      ...current,
      subTasks: current.subTasks.map((subTask) =>
        subTask.id === subtaskId ? { ...subTask, ...patch, updatedAt: new Date().toISOString() } : subTask,
      ),
    }))
  }

  const removeSubtask = (subtaskId: string) => {
    setDraft((current) => ({
      ...current,
      subTasks: current.subTasks
        .filter((subTask) => subTask.id !== subtaskId)
        .map((subTask, index) => ({ ...subTask, order: index })),
    }))
  }

  const moveSubtask = (subtaskId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const next = [...current.subTasks].sort((a, b) => a.order - b.order)
      const index = next.findIndex((subTask) => subTask.id === subtaskId)
      const targetIndex = index + direction

      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return current
      }

      const currentSubtask = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = currentSubtask

      return {
        ...current,
        subTasks: next.map((subTask, order) => ({ ...subTask, order })),
      }
    })
  }

  const addSubtask = (title = newSubtaskTitle) => {
    const trimmed = title.trim()

    if (!trimmed) {
      return
    }

    setDraft((current) => ({
      ...current,
      subTaskSettings: { ...current.subTaskSettings, enabled: true },
      subTasks: [...current.subTasks, createSubtask(trimmed, current.subTasks.length)],
    }))
    setNewSubtaskTitle('')
  }

  const updateHabitReminder = (reminderId: string, patch: Partial<Reminder>) => {
    setDraft((current) => ({
      ...current,
      reminder: {
        ...current.reminder,
        enabled: true,
        items: current.reminder.items.map((item) =>
          item.id === reminderId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
        ),
      },
    }))
  }

  const addHabitReminder = () => {
    setDraft((current) => ({
      ...current,
      reminder: {
        ...current.reminder,
        enabled: true,
        items: [
          ...current.reminder.items,
          createReminder('habit', habit?.id ?? 'draft', {
            enabled: true,
            time: current.reminder.time || '09:00',
            message: current.reminder.text || getDefaultReminder().text,
          }),
        ],
      },
    }))
  }

  const removeHabitReminder = (reminderId: string) => {
    setDraft((current) => ({
      ...current,
      reminder: {
        ...current.reminder,
        items: current.reminder.items.filter((item) => item.id !== reminderId),
      },
    }))
  }

  const updateSubtaskReminder = (subtaskId: string, patch: Partial<Reminder>) => {
    setDraft((current) => ({
      ...current,
      subTasks: current.subTasks.map((subTask) =>
        subTask.id === subtaskId
          ? {
              ...subTask,
              reminder: {
                ...subTask.reminder,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            }
          : subTask,
      ),
    }))
  }

  const applyTemplate = (templateId: string) => {
    const template = createSubtaskTemplate(templateId, draft.subTasks.length)

    if (template.length === 0) {
      return
    }

    setDraft((current) => ({
      ...current,
      subTaskSettings: { ...current.subTaskSettings, enabled: true },
      subTasks: [...current.subTasks, ...template],
    }))
    setTemplateNotice('Шаблон добавлен')
    setTemplateOpen(false)
  }

  const requestClose = () => {
    if (isDirty) {
      setCloseConfirmOpen(true)
      return
    }

    onClose()
  }

  const handleSave = () => {
    if (!isValid) {
      return
    }

    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      color: draft.cardColor || draft.iconColor || draft.color,
      subTasks: draft.subTasks.map((subTask, order) => ({ ...subTask, order })),
    })
  }

  const testReminder = async () => {
    setReminderStatus(await notificationService.scheduleTestNotification())
  }

  const visibleIcons = showExtraIcons ? [...iconOptions, ...extraIconOptions] : iconOptions

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ y: 520 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ type: 'spring', damping: 34, stiffness: 360 }}
            className="glass-surface max-h-[92svh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] p-4"
          >
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-card-strong)] px-4 py-4 backdrop-blur-2xl">
              <div>
                <h2 className="text-lg font-semibold text-[var(--app-text)]">
                  {habit ? 'Изменить привычку' : 'Новая привычка'}
                </h2>
                <p className="text-sm text-[var(--app-muted)]">Основное, подзадачи и расширенные настройки</p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="grid h-10 w-10 place-items-center rounded-[16px] border border-[var(--app-border)] bg-white/[0.05] text-[var(--app-muted)]"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                <div className="mb-3 text-sm font-semibold text-[var(--app-text)]">Основные настройки</div>
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Название</span>
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Например: не потратил лишнее"
                      className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-4 text-base text-[var(--app-text)] placeholder:text-[var(--app-muted)]/70 focus:border-[var(--app-green)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Описание</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Короткая мотивация или правило"
                      className="min-h-20 w-full resize-none rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-4 py-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/70 focus:border-[var(--app-green)]"
                    />
                  </label>

                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--app-muted)]">Тип</div>
                    <LiquidToggle
                      value={draft.type}
                      options={typeOptions}
                      onChange={(value) => updateDraft({ type: value as HabitType })}
                    />
                  </div>

                  <LiquidSwitch
                    checked={draft.isActive}
                    label="Активна"
                    description="Отключённая привычка скрывается с главного экрана, но остаётся в моих привычках."
                    onChange={(checked) => updateDraft({ isActive: checked })}
                  />
                </div>
              </div>

              <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                <div className="mb-3 text-sm font-semibold text-[var(--app-text)]">Вид привычки</div>
                <div className="grid gap-4">
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--app-muted)]">Категория</div>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateDraft({ category: option.value as HabitCategory })}
                          className={cn(
                            'h-10 rounded-[16px] border px-3 text-sm font-medium transition-colors',
                            draft.category === option.value
                              ? 'border-[var(--app-green)] bg-[var(--app-green)]/15 text-[var(--app-text)]'
                              : 'border-[var(--app-border)] bg-white/[0.04] text-[var(--app-muted)]',
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--app-muted)]">Иконка</span>
                      <button
                        type="button"
                        onClick={() => setShowExtraIcons((current) => !current)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-green)]"
                      >
                        Ещё иконки
                        <motion.span animate={{ rotate: showExtraIcons ? 180 : 0 }}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {visibleIcons.map((option) => (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          key={option.value}
                          type="button"
                          onClick={() => updateDraft({ icon: option.value as HabitIconKey })}
                          className={cn(
                            'grid h-11 place-items-center rounded-[16px] border transition-colors',
                            draft.icon === option.value
                              ? 'border-[var(--app-purple)] bg-[var(--app-purple)]/18'
                              : 'border-[var(--app-border)] bg-white/[0.04]',
                          )}
                          aria-label={option.label}
                        >
                          <HabitIconView icon={option.value} color={draft.iconColor || 'var(--app-green)'} className="h-5 w-5" />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <ColorPicker
                    title="Цвет иконки"
                    value={draft.iconColor ?? ''}
                    onChange={(color) => updateDraft({ iconColor: color })}
                  />
                  <ColorPicker
                    title="Цвет кнопки/карточки"
                    value={draft.cardColor ?? ''}
                    onChange={(color) => updateDraft({ cardColor: color, color })}
                  />
                </div>
              </div>

              <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                <div className="mb-3 text-sm font-semibold text-[var(--app-text)]">Цель</div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Тип цели</span>
                    <select
                      value={draft.goal.type}
                      onChange={(event) => updateGoal({ type: event.target.value as HabitGoalType })}
                      className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-sm"
                    >
                      {goalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">План</span>
                    <input
                      type="number"
                      min={1}
                      value={draft.goal.target}
                      onChange={(event) => updateGoal({ target: Number(event.target.value) || 1 })}
                      className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Единица</span>
                    <input
                      value={draft.goal.unit}
                      onChange={(event) => updateGoal({ unit: event.target.value })}
                      className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Дата старта</span>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(event) => updateDraft({ startDate: event.target.value })}
                      className="h-12 w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                <LiquidSwitch
                  checked={draft.subTaskSettings.enabled}
                  label="Использовать подзадачи"
                  description="Обязательные подзадачи блокируют главную галочку, пока не выполнены."
                  onChange={(checked) =>
                    updateDraft({
                      subTaskSettings: { ...draft.subTaskSettings, enabled: checked },
                      subTasks: checked && draft.subTasks.length === 0 ? getSubtaskTemplate(draft.title) : draft.subTasks,
                    })
                  }
                />

                {draft.subTaskSettings.enabled ? (
                  <div className="mt-3 grid gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <LiquidSwitch
                        checked={draft.subTaskSettings.completionMode === 'auto'}
                        label="Автозавершение"
                        onChange={(checked) =>
                          updateDraft({
                            subTaskSettings: {
                              ...draft.subTaskSettings,
                              completionMode: checked ? 'auto' : 'manual',
                            },
                          })
                        }
                      />
                      <LiquidSwitch
                        checked={draft.subTaskSettings.showPercent}
                        label="Показывать процент"
                        onChange={(checked) =>
                          updateDraft({
                            subTaskSettings: {
                              ...draft.subTaskSettings,
                              showPercent: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      {draft.subTasks.map((subTask, index) => (
                        <div key={subTask.id} className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-3">
                          <div className="grid gap-2">
                            <input
                              value={subTask.title}
                              onChange={(event) => updateSubtask(subTask.id, { title: event.target.value })}
                              className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                            />
                            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                              <select
                                value={subTask.type}
                                onChange={(event) => updateSubtask(subTask.id, { type: event.target.value as HabitSubtaskType })}
                                className="h-10 rounded-[14px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-2 text-xs"
                              >
                                {subtaskTypes.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => updateSubtask(subTask.id, { required: !subTask.required })}
                                className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.04] px-2 text-xs text-[var(--app-text)]"
                              >
                                {subTask.required ? 'Обязательная' : 'Дополнительная'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSubtask(subTask.id)}
                                className="grid h-10 w-10 place-items-center rounded-[14px] border border-rose-400/30 bg-rose-500/10 text-rose-200"
                                aria-label="Удалить подзадачу"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => moveSubtask(subTask.id, -1)}
                                disabled={index === 0}
                                className="h-8 flex-1 rounded-[12px] border border-[var(--app-border)] text-xs text-[var(--app-muted)] disabled:opacity-40"
                              >
                                Выше
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSubtask(subTask.id, 1)}
                                disabled={index === draft.subTasks.length - 1}
                                className="h-8 flex-1 rounded-[12px] border border-[var(--app-border)] text-xs text-[var(--app-muted)] disabled:opacity-40"
                              >
                                Ниже
                              </button>
                            </div>
                            {modules.reminders ? (
                              <div className="grid gap-2 rounded-[16px] border border-[var(--app-border)] bg-white/[0.035] p-2">
                                <LiquidSwitch
                                  checked={subTask.reminder.enabled}
                                  label="Напоминание подзадачи"
                                  onChange={(checked) => updateSubtaskReminder(subTask.id, { enabled: checked })}
                                />
                                {subTask.reminder.enabled ? (
                                  <div className="grid gap-2">
                                    <div className="grid grid-cols-[auto_1fr] gap-2">
                                      <input
                                        type="time"
                                        value={subTask.reminder.time}
                                        onChange={(event) => updateSubtaskReminder(subTask.id, { time: event.target.value })}
                                        className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.055] px-2 text-xs"
                                      />
                                      <input
                                        value={subTask.reminder.message}
                                        onChange={(event) => updateSubtaskReminder(subTask.id, { message: event.target.value })}
                                        placeholder={`${subTask.reminder.time} — ${subTask.title}`}
                                        className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-xs"
                                      />
                                    </div>
                                    <select
                                      value={subTask.reminder.repeatType}
                                      onChange={(event) =>
                                        updateSubtaskReminder(subTask.id, { repeatType: event.target.value as ReminderRepeatType })
                                      }
                                      className="h-10 rounded-[14px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-xs"
                                    >
                                      {repeatOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(event) => setNewSubtaskTitle(event.target.value)}
                        placeholder="Новая подзадача"
                        className="h-11 rounded-[16px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                      />
                      <AnimatedButton type="button" onClick={() => addSubtask()} className="h-11 px-3">
                        Добавить
                      </AnimatedButton>
                    </div>
                    {templateNotice ? (
                      <div className="rounded-[16px] border border-[var(--app-green)]/35 bg-[var(--app-green)]/10 px-3 py-2 text-xs font-semibold text-[var(--app-green)]">
                        {templateNotice}
                      </div>
                    ) : null}
                    <AnimatedButton type="button" onClick={() => setTemplateOpen(true)} className="h-11">
                      Подставить шаблон
                    </AnimatedButton>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                <LiquidSwitch
                  checked={draft.path.enabled}
                  label="Путь привычки"
                  description="Этапы 3, 7, 21, 30 дней и дальше. За завершение этапа начисляются звёзды."
                  onChange={(checked) =>
                    updateDraft({
                      path: {
                        ...getDefaultPathSettings(draft.path),
                        enabled: checked,
                      },
                    })
                  }
                />
                {draft.path.enabled ? (
                  <div className="mt-3 grid gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(draft.path.milestones.length ? draft.path.milestones : habitPathMilestones).map((milestone) => (
                        <span
                          key={milestone}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold',
                            draft.path.completedMilestones.includes(milestone)
                              ? 'border-amber-300/60 bg-amber-300/15 text-amber-200'
                              : 'border-[var(--app-border)] bg-white/[0.04] text-[var(--app-muted)]',
                          )}
                        >
                          {milestone} дн. · +{milestone}⭐
                        </span>
                      ))}
                    </div>
                    <label>
                      <span className="mb-2 block text-sm font-medium text-[var(--app-muted)]">Своя цель, дней</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.path.customGoal ?? ''}
                        onChange={(event) => {
                          const customGoal = Number(event.target.value) || undefined
                          updateDraft({
                            path: {
                              ...draft.path,
                              customGoal,
                              milestones: customGoal
                                ? Array.from(new Set([...habitPathMilestones, customGoal])).sort((a, b) => a - b)
                                : habitPathMilestones,
                            },
                          })
                        }}
                        placeholder="Например: 45"
                        className="h-11 w-full rounded-[16px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-sm"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {modules.finance ? (
                <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                  <LiquidSwitch
                    checked={Boolean(draft.moneyEffect)}
                    label="Финансовый эффект"
                    description="Эти деньги ты экономишь, зарабатываешь или тратишь благодаря привычке."
                    onChange={(checked) =>
                      updateDraft({
                        moneyEffect: checked
                          ? { type: 'saving', amountPerCompletion: 0, currency: 'KZT', period: 'completion', description: '' }
                          : undefined,
                      })
                    }
                  />
                  {draft.moneyEffect ? (
                    <div className="mt-3 grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={draft.moneyEffect.type}
                          onChange={(event) =>
                            updateDraft({
                              moneyEffect: {
                                ...draft.moneyEffect!,
                                type: event.target.value as MoneyEffectType,
                              },
                            })
                          }
                          className="h-11 rounded-[16px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-xs"
                        >
                          {moneyTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={draft.moneyEffect.amountPerCompletion}
                          onChange={(event) =>
                            updateDraft({
                              moneyEffect: {
                                ...draft.moneyEffect!,
                                amountPerCompletion: Number(event.target.value) || 0,
                              },
                            })
                          }
                          className="h-11 rounded-[16px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-xs"
                          placeholder="₸"
                        />
                      </div>
                      <select
                        value={draft.moneyEffect.period ?? 'completion'}
                        onChange={(event) =>
                          updateDraft({
                            moneyEffect: {
                              ...draft.moneyEffect!,
                              period: event.target.value as MoneyEffectPeriod,
                            },
                          })
                        }
                        className="h-11 rounded-[16px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-xs"
                      >
                        {moneyPeriods.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={draft.moneyEffect.description ?? ''}
                        onChange={(event) =>
                          updateDraft({
                            moneyEffect: {
                              ...draft.moneyEffect!,
                              description: event.target.value,
                            },
                          })
                        }
                        placeholder="Описание финансового эффекта"
                        className="h-11 rounded-[16px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-xs"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {modules.reminders ? (
                <div className="rounded-[22px] border border-[var(--app-border)] bg-white/[0.035] p-3">
                  <LiquidSwitch
                    checked={draft.reminder.enabled}
                    label="Напоминания"
                    description="Сейчас сохраняем настройки, позже их подхватят PWA/Capacitor уведомления."
                    onChange={(checked) =>
                      updateDraft({
                        reminder: {
                          ...draft.reminder,
                          enabled: checked,
                        },
                      })
                    }
                  />
                  <div className="mt-3 rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] px-3 py-2 text-xs text-[var(--app-muted)]">
                    {reminderStatus}
                    <div className="mt-1 text-[11px] text-[var(--app-muted)]/80">
                      {notificationService.getIosPwaWarning()}
                    </div>
                  </div>
                  {draft.reminder.enabled ? (
                    <div className="mt-3 grid gap-2">
                      {draft.reminder.items.length === 0 ? (
                        <div className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.04] px-3 py-2 text-xs text-[var(--app-muted)]">
                          Напоминания не настроены. Добавь первое время.
                        </div>
                      ) : null}
                      {draft.reminder.items.map((reminder) => (
                        <div key={reminder.id} className="grid gap-2 rounded-[18px] border border-[var(--app-border)] bg-white/[0.04] p-2">
                          <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                            <input
                              type="time"
                              value={reminder.time}
                              onChange={(event) => updateHabitReminder(reminder.id, { time: event.target.value })}
                              className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.055] px-2 text-xs"
                            />
                            <input
                              value={reminder.message}
                              onChange={(event) => updateHabitReminder(reminder.id, { message: event.target.value })}
                              placeholder="Например: Выпить витамин D"
                              className="h-10 rounded-[14px] border border-[var(--app-border)] bg-white/[0.055] px-3 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => removeHabitReminder(reminder.id)}
                              className="grid h-10 w-10 place-items-center rounded-[14px] border border-rose-400/30 bg-rose-500/10 text-rose-200"
                              aria-label="Удалить время"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <select
                            value={reminder.repeatType}
                            onChange={(event) =>
                              updateHabitReminder(reminder.id, { repeatType: event.target.value as ReminderRepeatType })
                            }
                            className="h-10 rounded-[14px] border border-[var(--app-border)] bg-[var(--app-card-strong)] px-3 text-xs"
                          >
                            {repeatOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <AnimatedButton type="button" onClick={addHabitReminder} className="h-10 rounded-[16px] px-3 text-xs">
                        <Bell className="h-4 w-4" />
                        Добавить время
                      </AnimatedButton>
                      <AnimatedButton type="button" onClick={testReminder} className="h-10 rounded-[16px] px-3 text-xs">
                        Проверить напоминание через 10 секунд
                      </AnimatedButton>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <AnimatedButton
                  haptic
                  variant="primary"
                  type="button"
                  onClick={handleSave}
                  disabled={!isValid}
                  className="w-full"
                >
                  Сохранить
                </AnimatedButton>
                {habit && onDelete ? (
                  <AnimatedButton
                    haptic
                    variant="danger"
                    type="button"
                    onClick={onDelete}
                    className="w-12 px-0"
                    aria-label="Удалить привычку"
                  >
                    <Trash2 className="h-5 w-5" />
                  </AnimatedButton>
                ) : null}
              </div>
            </div>
          </motion.section>

          <AnimatePresence>
            {isTemplateOpen ? (
              <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ y: 20, scale: 0.96 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 16, scale: 0.96 }}
                  className="glass-surface w-full max-w-[420px] rounded-[26px] p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--app-text)]">Выбрать шаблон подзадач</h3>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">
                        Шаблон добавится к текущим подзадачам. Уже созданные пункты не удаляются.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplateOpen(false)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-[var(--app-border)] bg-white/[0.04]"
                      aria-label="Закрыть"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {subtaskTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-left transition-colors hover:border-[var(--app-green)]/60"
                      >
                        <span className="block text-sm font-semibold text-[var(--app-text)]">{template.title}</span>
                        <span className="mt-1 block text-xs text-[var(--app-muted)]">{template.items.join(' · ')}</span>
                      </button>
                    ))}
                  </div>
                  <AnimatedButton type="button" onClick={() => setTemplateOpen(false)} className="mt-3 h-10 w-full rounded-[16px]">
                    Отмена
                  </AnimatedButton>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <ConfirmDialog
            isOpen={isCloseConfirmOpen}
            title="Закрыть без сохранения?"
            description="Изменения в привычке не будут сохранены."
            confirmLabel="Закрыть"
            onCancel={() => setCloseConfirmOpen(false)}
            onConfirm={() => {
              setCloseConfirmOpen(false)
              onClose()
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

interface ColorPickerProps {
  title: string
  value: string
  onChange: (color: string) => void
}

function ColorPicker({ title, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-[var(--app-muted)]">{title}</div>
      <div className="grid grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={cn(
            'h-9 rounded-[14px] border border-[var(--app-border)] bg-white/[0.04] text-[10px] font-semibold text-[var(--app-muted)]',
            !value && 'border-[var(--app-green)] text-[var(--app-text)]',
          )}
        >
          Тема
        </button>
        {colorOptions.map((color) => (
          <motion.button
            whileTap={{ scale: 0.9 }}
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="grid h-9 place-items-center rounded-[14px] border border-[var(--app-border)]"
            style={{ backgroundColor: color }}
            aria-label={`Цвет ${color}`}
          >
            {value === color ? <Check className="h-4 w-4 text-[#04100A]" strokeWidth={3} /> : null}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
