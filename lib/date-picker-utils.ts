/** Local calendar date as YYYY-MM-DD (matches picker value). */
export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseIsoDateLocal(value: string): Date | null {
  const trimmed = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const [y, m, d] = trimmed.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null
  }
  return date
}

export function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function todayLocal(): Date {
  return startOfDayLocal(new Date())
}

export function formatIsoDateDisplay(iso: string): string {
  const parsed = parseIsoDateLocal(iso)
  if (!parsed) return ''
  return parsed.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Short label for compact filter toolbars (e.g. 25 May 26). */
export function formatIsoDateCompact(iso: string): string {
  const parsed = parseIsoDateLocal(iso)
  if (!parsed) return ''
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export function compareIsoDates(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS
}

export type CalendarDayCell = {
  date: Date
  iso: string
  inMonth: boolean
}

/** Monday-first month grid including leading/trailing outside days. */
export function buildMonthGrid(viewMonth: Date): CalendarDayCell[] {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7

  const cells: CalendarDayCell[] = []

  for (let i = mondayOffset; i > 0; i--) {
    const date = new Date(year, month, 1 - i)
    cells.push({ date, iso: toIsoDateLocal(date), inMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    cells.push({ date, iso: toIsoDateLocal(date), inMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const dayIndex = cells.length - mondayOffset - daysInMonth + 1
    const date = new Date(year, month + 1, dayIndex)
    cells.push({ date, iso: toIsoDateLocal(date), inMonth: false })
  }

  return cells
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function monthYearLabel(date: Date): string {
  return date.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })
}
