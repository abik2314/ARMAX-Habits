export const dayMs = 24 * 60 * 60 * 1000

export interface CalendarCell {
  key: string
  day: number
  monthOffset: -1 | 0 | 1
}

export function dateKey(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string) {
  return new Date(`${key}T00:00:00`)
}

export function addDays(key: string, amount: number) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

export function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b)
}

export function isPastDate(key: string) {
  return compareDateKeys(key, dateKey()) < 0
}

export function formatDisplayDate(key: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(parseDateKey(key))
}

export function formatCompactDate(key: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(parseDateKey(key))
}

export function formatWeekday(key: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
  }).format(parseDateKey(key))
}

export function formatMonthTitle(date: Date) {
  const value = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return value[0].toUpperCase() + value.slice(1)
}

export function getDaysBetweenInclusive(startKey: string, endKey: string) {
  const days: string[] = []
  let cursor = startKey

  while (compareDateKeys(cursor, endKey) <= 0) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return days
}

export function getLastDays(count: number, endKey: string = dateKey()) {
  return Array.from({ length: count }, (_, index) => addDays(endKey, index - count + 1))
}

export function getCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - firstWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const monthOffset = current.getMonth() === month ? 0 : current < firstDay ? -1 : 1

    return {
      key: dateKey(current),
      day: current.getDate(),
      monthOffset,
    }
  })
}

export function getMonthRange(date: Date) {
  const start = dateKey(new Date(date.getFullYear(), date.getMonth(), 1))
  const end = dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  return { start, end }
}
