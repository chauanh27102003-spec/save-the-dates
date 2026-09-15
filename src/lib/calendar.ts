import type { BusySlot, CalendarProvider } from './types'
import { addDays, startOfDay } from './date-utils'

export interface Slot {
  start: string
  end: string
  score: number
  label: string
}

/** Deterministic PRNG so the demo calendar looks the same on every reload. */
function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WORK = [
  'Team standup',
  'Sprint review',
  'Client call',
  'Design sync',
  '1:1 with manager',
  'Deep work block',
]
const LIFE = ['Gym', 'Family dinner', 'Dentist', 'Grocery run', 'Yoga class', 'Coffee with Mai']

/**
 * Fabricates a believable two-week calendar. In production this is replaced by
 * Google Calendar `freebusy.query` / EventKit on iOS — same BusySlot shape.
 */
export function generateBusy(userId: string, provider: CalendarProvider, seed: number): BusySlot[] {
  const rnd = mulberry(seed)
  const out: BusySlot[] = []
  const today = startOfDay(new Date())

  for (let d = 0; d < 21; d++) {
    const day = addDays(today, d)
    const weekend = day.getDay() === 0 || day.getDay() === 6

    if (!weekend) {
      // A work block most weekdays
      const startH = 9 + Math.floor(rnd() * 2)
      out.push(
        mk(userId, provider, WORK[Math.floor(rnd() * WORK.length)], day, startH, startH + 2 + Math.floor(rnd() * 2)),
      )
      if (rnd() > 0.45) {
        const h = 14 + Math.floor(rnd() * 3)
        out.push(mk(userId, provider, WORK[Math.floor(rnd() * WORK.length)], day, h, h + 1))
      }
      if (rnd() > 0.62) {
        const h = 18 + Math.floor(rnd() * 2)
        out.push(mk(userId, provider, LIFE[Math.floor(rnd() * LIFE.length)], day, h, h + 2))
      }
    } else {
      if (rnd() > 0.4) {
        const h = 9 + Math.floor(rnd() * 4)
        out.push(mk(userId, provider, LIFE[Math.floor(rnd() * LIFE.length)], day, h, h + 2))
      }
      if (rnd() > 0.72) {
        out.push(mk(userId, provider, LIFE[Math.floor(rnd() * LIFE.length)], day, 19, 22))
      }
    }
  }
  return out
}

function mk(
  userId: string,
  provider: CalendarProvider,
  title: string,
  day: Date,
  startH: number,
  endH: number,
): BusySlot {
  const s = new Date(day)
  s.setHours(startH, 0, 0, 0)
  const e = new Date(day)
  e.setHours(Math.min(endH, 23), 30 * (endH > 23 ? 1 : 0), 0, 0)
  if (e <= s) e.setHours(startH + 1)
  return {
    id: `busy_${userId}_${s.getTime()}_${Math.round(Math.random() * 1e6)}`,
    userId,
    provider,
    title,
    start: s.toISOString(),
    end: e.toISOString(),
  }
}

function overlaps(aS: number, aE: number, bS: number, bE: number) {
  return aS < bE && bS < aE
}

export function isBusy(slots: BusySlot[], start: Date, end: Date) {
  return conflictsIn(slots, start, end).length > 0
}

/** The events that actually clash with a window, so the UI can name them. */
export function conflictsIn(slots: BusySlot[], start: Date, end: Date) {
  const s = start.getTime()
  const e = end.getTime()
  return slots
    .filter((b) => overlaps(s, e, new Date(b.start).getTime(), new Date(b.end).getTime()))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
}

interface Window {
  startH: number
  startM: number
  hours: number
  label: string
  base: number
}

const WEEKDAY_WINDOWS: Window[] = [
  { startH: 12, startM: 0, hours: 1.5, label: 'Lunch date', base: 40 },
  { startH: 18, startM: 30, hours: 2.5, label: 'Evening date', base: 90 },
  { startH: 20, startM: 30, hours: 2, label: 'Late night', base: 55 },
]

const WEEKEND_WINDOWS: Window[] = [
  { startH: 10, startM: 0, hours: 2.5, label: 'Brunch date', base: 80 },
  { startH: 14, startM: 0, hours: 3, label: 'Afternoon out', base: 85 },
  { startH: 18, startM: 0, hours: 3, label: 'Evening date', base: 100 },
]

/**
 * Finds windows where BOTH calendars are free, ranked by how good a date slot
 * it is (weekend + evening + soon, but not tonight).
 */
export function suggestSlots(mine: BusySlot[], theirs: BusySlot[], count = 6, daysAhead = 14): Slot[] {
  const all = [...mine, ...theirs]
  const today = startOfDay(new Date())
  const found: Slot[] = []

  for (let d = 1; d <= daysAhead; d++) {
    const day = addDays(today, d)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    const windows = weekend ? WEEKEND_WINDOWS : WEEKDAY_WINDOWS

    for (const w of windows) {
      const s = new Date(day)
      s.setHours(w.startH, w.startM, 0, 0)
      const e = new Date(s.getTime() + w.hours * 3600000)
      if (isBusy(all, s, e)) continue

      // sooner is better, but give a small nudge away from "tomorrow"
      const proximity = Math.max(0, 30 - d * 2)
      const prepBonus = d >= 2 && d <= 9 ? 12 : 0
      found.push({
        start: s.toISOString(),
        end: e.toISOString(),
        score: w.base + proximity + prepBonus + (weekend ? 15 : 0),
        label: w.label,
      })
    }
  }

  found.sort((a, b) => b.score - a.score || +new Date(a.start) - +new Date(b.start))

  // One suggestion per day, and cap repeats of the same kind so the list
  // does not turn into six identical "evening date" rows.
  const perDay = new Set<string>()
  const perLabel: Record<string, number> = {}
  const picked: Slot[] = []
  const take = (slot: Slot) => {
    perDay.add(slot.start.slice(0, 10))
    perLabel[slot.label] = (perLabel[slot.label] ?? 0) + 1
    picked.push(slot)
  }

  for (const slot of found) {
    if (picked.length >= count) break
    if (perDay.has(slot.start.slice(0, 10))) continue
    if ((perLabel[slot.label] ?? 0) >= 3) continue
    take(slot)
  }
  // Backfill if the diversity cap left us short.
  for (const slot of found) {
    if (picked.length >= count) break
    if (perDay.has(slot.start.slice(0, 10))) continue
    take(slot)
  }

  return picked.sort((a, b) => +new Date(a.start) - +new Date(b.start))
}

/** Free/busy summary for one day, used by the availability strip. */
export function dayLoad(slots: BusySlot[], day: Date) {
  const s = startOfDay(day)
  const e = addDays(s, 1)
  const hits = slots.filter((b) =>
    overlaps(s.getTime(), e.getTime(), new Date(b.start).getTime(), new Date(b.end).getTime()),
  )
  const hours = hits.reduce(
    (sum, b) => sum + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 3600000,
    0,
  )
  return { count: hits.length, hours, events: hits }
}

/**
 * How date-able a single day is for the two of them: 'open' when the best
 * window of the day is free for both, 'some' when at least one window works.
 */
export function dayAvailability(mine: BusySlot[], theirs: BusySlot[], day: Date) {
  const all = [...mine, ...theirs]
  const weekend = day.getDay() === 0 || day.getDay() === 6
  const windows = weekend ? WEEKEND_WINDOWS : WEEKDAY_WINDOWS
  const best = windows.reduce((a, b) => (b.base > a.base ? b : a))

  const free = windows.filter((w) => {
    const s = new Date(day)
    s.setHours(w.startH, w.startM, 0, 0)
    if (s.getTime() < Date.now()) return false
    return !isBusy(all, s, new Date(s.getTime() + w.hours * 3600000))
  })

  if (free.includes(best)) return 'open' as const
  if (free.length) return 'some' as const
  return 'busy' as const
}
