export const DAY_MS = 86400000

export function startOfDay(d: Date | string) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date | string, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isoDate(d: Date | string) {
  const x = new Date(d)
  const m = `${x.getMonth() + 1}`.padStart(2, '0')
  const day = `${x.getDate()}`.padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDay(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function fmtLongDay(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function fmtRange(start: string, end: string) {
  return `${fmtTime(start)} – ${fmtTime(end)}`
}

export function daysBetween(a: Date | string, b: Date | string) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)
}

/** Next occurrence of a yearly date (birthday / anniversary), from today. */
export function nextOccurrence(dateIso: string, yearly: boolean, from = new Date()) {
  const base = new Date(dateIso + 'T00:00:00')
  if (!yearly) return base
  const today = startOfDay(from)
  const candidate = new Date(today.getFullYear(), base.getMonth(), base.getDate())
  if (candidate.getTime() < today.getTime()) candidate.setFullYear(candidate.getFullYear() + 1)
  return candidate
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export function countdownLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Local datetime -> value usable by <input type="datetime-local"> */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}
