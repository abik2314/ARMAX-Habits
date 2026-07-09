import type { Habit, HabitSubtask, Reminder } from '../types/habit'
import { platformService } from './platform'

export type ReminderStatus =
  | 'Напоминание включено'
  | 'Ожидает разрешения'
  | 'Не поддерживается на этой платформе'
  | `Следующее: сегодня в ${string}`
  | 'Ошибка планирования'

export interface ReminderSchedule {
  targetId: string
  title: string
  reminder: Reminder
}

interface CapacitorLocalNotifications {
  requestPermissions?: () => Promise<{ display?: 'granted' | 'denied' | 'prompt' }>
  checkPermissions?: () => Promise<{ display?: 'granted' | 'denied' | 'prompt' }>
  schedule?: (options: {
    notifications: Array<{
      id: number
      title: string
      body: string
      schedule?: { at: Date; repeats?: boolean; every?: 'day' | 'week' }
    }>
  }) => Promise<unknown>
  cancel?: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>
}

interface CapacitorPluginsWindow extends Window {
  Capacitor?: {
    Plugins?: {
      LocalNotifications?: CapacitorLocalNotifications
    }
  }
}

const webTimers = new Map<string, number>()

function getCapacitorLocalNotifications() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as CapacitorPluginsWindow).Capacitor?.Plugins?.LocalNotifications
}

function reminderNumericId(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }

  return Math.max(1, hash % 2_000_000_000)
}

function nextDateForTime(time: string, delayMs = 0) {
  if (delayMs > 0) {
    return new Date(Date.now() + delayMs)
  }

  const [hours = '9', minutes = '0'] = time.split(':')
  const next = new Date()
  next.setHours(Number(hours), Number(minutes), 0, 0)

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

function canUseWebNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

async function requestWebPermission() {
  if (!canUseWebNotifications()) {
    return 'unsupported' as const
  }

  return Notification.requestPermission()
}

async function requestCapacitorPermission() {
  const plugin = getCapacitorLocalNotifications()

  if (!plugin?.requestPermissions) {
    return 'unsupported' as const
  }

  const result = await plugin.requestPermissions()
  return result.display === 'granted' ? 'granted' : 'denied'
}

export const notificationService = {
  canUseWebNotifications,
  requestNotificationPermission: async () => {
    if (platformService.isCapacitor()) {
      return requestCapacitorPermission()
    }

    return requestWebPermission()
  },
  requestPermission: async () => notificationService.requestNotificationPermission(),
  getNotificationSupportStatus: (): ReminderStatus => {
    if (platformService.isCapacitor()) {
      return getCapacitorLocalNotifications() ? 'Напоминание включено' : 'Не поддерживается на этой платформе'
    }

    if (!canUseWebNotifications()) {
      return 'Не поддерживается на этой платформе'
    }

    return Notification.permission === 'granted' ? 'Напоминание включено' : 'Ожидает разрешения'
  },
  getNextReminderTime: (reminders: Reminder[]) => {
    const enabled = reminders.filter((reminder) => reminder.enabled).sort((a, b) => a.time.localeCompare(b.time))

    if (enabled.length === 0) {
      return undefined
    }

    const now = new Date()
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return (enabled.find((reminder) => reminder.time >= current) ?? enabled[0]).time
  },
  getReminderStatus: (reminders: Reminder[]): ReminderStatus => {
    const nextTime = notificationService.getNextReminderTime(reminders)

    if (nextTime) {
      return `Следующее: сегодня в ${nextTime}`
    }

    return notificationService.getNotificationSupportStatus()
  },
  scheduleReminder: async (schedule: ReminderSchedule): Promise<ReminderStatus> => {
    if (!schedule.reminder.enabled) {
      await notificationService.cancelReminder(schedule.reminder.id)
      return 'Ожидает разрешения'
    }

    try {
      if (platformService.isCapacitor()) {
        const plugin = getCapacitorLocalNotifications()

        if (!plugin?.schedule) {
          return 'Не поддерживается на этой платформе'
        }

        const permission = await notificationService.requestNotificationPermission()
        if (permission !== 'granted') {
          return 'Ожидает разрешения'
        }

        await plugin.schedule({
          notifications: [
            {
              id: reminderNumericId(schedule.reminder.id),
              title: schedule.title,
              body: schedule.reminder.message,
              schedule: {
                at: nextDateForTime(schedule.reminder.time),
                repeats: schedule.reminder.repeatType !== 'once',
                every: schedule.reminder.repeatType === 'weekly' ? 'week' : 'day',
              },
            },
          ],
        })

        return `Следующее: сегодня в ${schedule.reminder.time}`
      }

      if (!canUseWebNotifications()) {
        return 'Не поддерживается на этой платформе'
      }

      if (Notification.permission !== 'granted') {
        return 'Ожидает разрешения'
      }

      await notificationService.cancelReminder(schedule.reminder.id)
      const at = nextDateForTime(schedule.reminder.time)
      const timer = window.setTimeout(() => {
        new Notification(schedule.title, {
          body: schedule.reminder.message,
          tag: schedule.reminder.id,
        })
      }, Math.max(0, at.getTime() - Date.now()))
      webTimers.set(schedule.reminder.id, timer)

      return `Следующее: сегодня в ${schedule.reminder.time}`
    } catch {
      return 'Ошибка планирования'
    }
  },
  cancelReminder: async (reminderId: string) => {
    const timer = webTimers.get(reminderId)
    if (timer) {
      window.clearTimeout(timer)
      webTimers.delete(reminderId)
    }

    const plugin = getCapacitorLocalNotifications()
    if (plugin?.cancel) {
      await plugin.cancel({ notifications: [{ id: reminderNumericId(reminderId) }] })
    }
  },
  rescheduleReminder: async (schedule: ReminderSchedule) => {
    await notificationService.cancelReminder(schedule.reminder.id)
    return notificationService.scheduleReminder(schedule)
  },
  scheduleTestNotification: async () => {
    const permission = await notificationService.requestNotificationPermission()
    if (permission !== 'granted') {
      return 'Ожидает разрешения' as ReminderStatus
    }

    const testReminder: Reminder = {
      id: `test-${Date.now()}`,
      enabled: true,
      time: '00:00',
      daysOfWeek: [],
      message: 'Тестовое напоминание ARMAX Habits',
      targetType: 'habit',
      targetId: 'test',
      repeatType: 'once',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (platformService.isCapacitor()) {
      const plugin = getCapacitorLocalNotifications()
      if (!plugin?.schedule) {
        return 'Не поддерживается на этой платформе' as ReminderStatus
      }

      await plugin.schedule({
        notifications: [
          {
            id: reminderNumericId(testReminder.id),
            title: 'ARMAX Habits',
            body: testReminder.message,
            schedule: { at: nextDateForTime(testReminder.time, 10_000) },
          },
        ],
      })

      return 'Напоминание включено' as ReminderStatus
    }

    if (!canUseWebNotifications()) {
      return 'Не поддерживается на этой платформе' as ReminderStatus
    }

    const timer = window.setTimeout(() => {
      new Notification('ARMAX Habits', {
        body: testReminder.message,
        tag: testReminder.id,
      })
    }, 10_000)
    webTimers.set(testReminder.id, timer)

    return 'Напоминание включено' as ReminderStatus
  },
  scheduleHabitReminders: async (habit: Pick<Habit, 'id' | 'title' | 'reminder' | 'subTasks'>) => {
    const statuses: ReminderStatus[] = []
    for (const reminder of habit.reminder.items) {
      statuses.push(
        await notificationService.rescheduleReminder({
          targetId: habit.id,
          title: habit.title,
          reminder,
        }),
      )
    }

    for (const subTask of habit.subTasks) {
      statuses.push(await notificationService.syncSubtaskReminder(habit.title, subTask))
    }

    return statuses
  },
  syncSubtaskReminder: async (habitTitle: string, subTask: HabitSubtask) => {
    return notificationService.rescheduleReminder({
      targetId: subTask.id,
      title: `${habitTitle}: ${subTask.title}`,
      reminder: subTask.reminder,
    })
  },
  cancelHabitReminders: async (habit: Pick<Habit, 'reminder' | 'subTasks'>) => {
    for (const reminder of habit.reminder.items) {
      await notificationService.cancelReminder(reminder.id)
    }

    for (const subTask of habit.subTasks) {
      await notificationService.cancelReminder(subTask.reminder.id)
    }
  },
  getIosPwaWarning: () =>
    'На iPhone PWA уведомления могут работать только после добавления на экран Домой и с ограничениями iOS.',
}
