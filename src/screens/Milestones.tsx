import { useState } from 'react'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  ScreenHeader,
  Sheet,
  Tag,
  useToast,
} from '../components/ui'
import {
  countdownLabel,
  daysBetween,
  fmtLongDay,
  isoDate,
  nextOccurrence,
  ordinal,
} from '../lib/date-utils'
import { findCategory } from '../lib/categories'
import { CategoryPicker } from '../components/CategoryPicker'
import type { MilestoneKind } from '../lib/types'

export default function Milestones() {
  const { couple, milestones, milestoneKinds, actions } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(isoDate(new Date()))
  const [kind, setKind] = useState<MilestoneKind>('custom')
  const [yearly, setYearly] = useState(true)
  const [remind, setRemind] = useState(7)
  const [filter, setFilter] = useState<string>('all')

  if (!couple) return null

  const rows = milestones
    .filter((m) => filter === 'all' || m.kind === filter)
    .map((m) => {
      const when = nextOccurrence(m.date, m.yearly)
      return { m, when, away: daysBetween(new Date(), when) }
    })
    .sort((a, b) => a.away - b.away)

  // Only offer filters for kinds actually in use.
  const usedKinds = milestoneKinds.filter((k) => milestones.some((m) => m.kind === k.id))

  const together = daysBetween(couple.since, new Date())
  const nextRound = [100, 365, 500, 1000, 1500, 2000, 3000, 5000].find((n) => n > together)

  function save() {
    actions.addMilestone({
      title: title.trim(),
      date,
      kind,
      yearly,
      remindDaysBefore: remind,
    })
    setAdding(false)
    setTitle('')
    setKind('custom')
    setYearly(true)
    setRemind(7)
    toast('Countdown started ⏳')
  }

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader
          title="Countdowns"
          subtitle="The days neither of you is allowed to forget"
          back="/home"
          right={
            <Button size="sm" onClick={() => setAdding(true)}>
              + Add
            </Button>
          }
        />
      </div>

      <Card className="mb-4 bg-blush">
        <p className="text-[13px] font-bold uppercase tracking-widest text-rose-dark">
          Days together
        </p>
        <p className="text-[40px] font-extrabold leading-none">{together.toLocaleString()}</p>
        <p className="mt-1 text-[13px] text-plum-soft">Since {fmtLongDay(couple.since)}</p>
        {nextRound && (
          <p className="mt-3 rounded-2xl bg-white/70 px-3.5 py-2.5 text-[13px] font-semibold">
            🎉 {nextRound.toLocaleString()} days in{' '}
            <b>{(nextRound - together).toLocaleString()} days</b>
          </p>
        )}
      </Card>

      {usedKinds.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {usedKinds.map((k) => (
            <Chip key={k.id} active={filter === k.id} onClick={() => setFilter(k.id)}>
              {k.emoji} {k.label}
            </Chip>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          emoji="🎂"
          title={milestones.length === 0 ? 'No important dates yet' : 'Nothing in this category'}
          body={
            milestones.length === 0
              ? 'Add birthdays, your anniversary, or the day you first met.'
              : 'Try another category, or add a date to this one.'
          }
          action={<Button onClick={() => setAdding(true)}>Add a date</Button>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map(({ m, when, away }) => {
            const years = m.yearly ? when.getFullYear() - new Date(m.date).getFullYear() : 0
            const urgent = away <= m.remindDaysBefore
            return (
              <Card key={m.id} className={urgent ? 'border-2 border-rose/30' : ''}>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl">
                    {findCategory(milestoneKinds, m.kind).emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{m.title}</p>
                    <p className="truncate text-[12px] text-muted">
                      {fmtLongDay(when)}
                      {m.yearly && years > 0 && ` · ${ordinal(years)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-extrabold leading-none ${urgent ? 'text-rose' : ''}`}>
                      {countdownLabel(away)}
                    </p>
                    {urgent && (
                      <span className="text-[10px] font-bold uppercase text-rose">reminder on</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Tag tone="rose">{findCategory(milestoneKinds, m.kind).label}</Tag>
                  <Tag tone={m.yearly ? 'violet' : 'neutral'}>
                    {m.yearly ? 'Every year' : 'One time'}
                  </Tag>
                  <Tag tone="neutral">🔔 {m.remindDaysBefore}d before</Tag>
                  <button
                    onClick={() => {
                      actions.removeMilestone(m.id)
                      toast('Removed')
                    }}
                    className="ml-auto text-xs font-bold text-muted"
                  >
                    Remove
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <p className="mt-5 px-1 text-center text-xs leading-relaxed text-muted">
        Both of you get the reminder — no one gets to be the only one who remembered.
      </p>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add an important date">
        <div className="space-y-3">
          <Field label="What is it?">
            <Input
              autoFocus
              placeholder="Linh’s birthday"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Type</p>
            <CategoryPicker scope="milestone" value={kind} onChange={setKind} />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Repeats</p>
            <div className="flex gap-2">
              <Chip active={yearly} onClick={() => setYearly(true)}>
                Every year
              </Chip>
              <Chip active={!yearly} onClick={() => setYearly(false)}>
                One time only
              </Chip>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Remind us</p>
            <div className="flex gap-2">
              {[1, 3, 7, 14, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setRemind(n)}
                  className={`flex-1 rounded-xl py-2 text-[13px] font-bold transition ${
                    remind === n ? 'bg-plum text-white' : 'bg-white text-plum-soft'
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>
          <Button size="lg" full className="mt-2" disabled={!title.trim()} onClick={save}>
            Start the countdown
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
