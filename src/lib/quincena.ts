// Reglas de quincena y semana, iguales a las validadas en el prototipo HTML.

export function quincenaIndex(date: Date): number {
  return date.getFullYear() * 24 + date.getMonth() * 2 + (date.getDate() <= 15 ? 0 : 1)
}

export function quincenaFromIndex(idx: number): { start: Date; end: Date } {
  const year = Math.floor(idx / 24)
  const rem = ((idx % 24) + 24) % 24
  const month = Math.floor(rem / 2)
  const half = rem % 2 // 0 = 1–15, 1 = 16–fin
  let start: Date, end: Date
  if (half === 0) {
    start = new Date(year, month, 1)
    end = new Date(year, month, 16)
  } else {
    start = new Date(year, month, 16)
    end = new Date(year, month + 1, 1)
  }
  return { start, end }
}

export function currentQuincenaIndex(): number {
  return quincenaIndex(new Date())
}

export function mostRecentSaturday(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const diff = (date.getDay() - 6 + 7) % 7
  date.setDate(date.getDate() - diff)
  return date
}

export function firstSaturdayOnOrAfter(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const diff = (6 - date.getDay() + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

export function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatQuincenaLabel(idx: number): string {
  const { start, end } = quincenaFromIndex(idx)
  const endDisplay = new Date(end)
  endDisplay.setDate(endDisplay.getDate() - 1)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `Quincena del ${start.toLocaleDateString('es-MX', { day: 'numeric' })} al ${endDisplay.toLocaleDateString('es-MX', opts)}`
}

export function nextOccurrenceOfDay(day: number): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let d = new Date(now.getFullYear(), now.getMonth(), day)
  if (d < now) d.setMonth(d.getMonth() + 1)
  return d
}

export function prevOccurrenceOfDay(day: number): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let d = new Date(now.getFullYear(), now.getMonth(), day)
  if (d > now) d.setMonth(d.getMonth() - 1)
  return d
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
