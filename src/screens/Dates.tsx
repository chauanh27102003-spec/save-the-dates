import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import { Button, Card, Chip, EmptyState, ScreenHeader, Tag } from '../components/ui'
import { DiaryTimeline } from '../components/DiaryTimeline'
import { fmtDay, fmtRange } from '../lib/date-utils'
import type { DateEvent } from '../lib/types'

type View = 'upcoming' | 'past' | 'diary'

export default function Dates() {
  const { me, dates, places, reviews } = useApp()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) ?? 'upcoming'
  const setView = (v: View) => setParams(v === 'upcoming' ? {} : { view: v }, { replace: true })

  if (!me) return null

  const now = Date.now()
  const upcoming = dates.filter(
    (d) => new Date(d.end).getTime() >= now && ['invited', 'accepted'].includes(d.status),
  )
  const past = dates
    .filter((d) => new Date(d.end).getTime() < now || ['declined', 'cancelled'].includes(d.status))
    .reverse()
  const list = view === 'past' ? past : upcoming

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader
          title="Your dates"
          subtitle={`${upcoming.length} coming up · ${reviews.length} diary ${
            reviews.length === 1 ? 'entry' : 'entries'
          }`}
          right={
            <Button size="sm" onClick={() => nav('/plan')}>
              ✦ Plan
            </Button>
          }
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Chip active={view === 'upcoming'} onClick={() => setView('upcoming')}>
          Upcoming
        </Chip>
        <Chip active={view === 'past'} onClick={() => setView('past')}>
          Past
        </Chip>
        <Chip active={view === 'diary'} onClick={() => setView('diary')}>
          📖 Diary
        </Chip>
      </div>

      {view === 'diary' ? (
        <DiaryTimeline />
      ) : list.length === 0 ? (
        <EmptyState
          emoji={view === 'upcoming' ? '🗓️' : '📦'}
          title={view === 'upcoming' ? 'Nothing on the calendar' : 'No history yet'}
          body={
            view === 'upcoming'
              ? 'Find a window you are both free and send an invitation.'
              : 'Dates you finish will collect here with your reviews.'
          }
          action={
            view === 'upcoming' ? <Button onClick={() => nav('/plan')}>Plan a date</Button> : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <DateRow
              key={d.id}
              d={d}
              place={places.find((p) => p.id === d.placeId)?.name}
              mine={d.createdBy === me.id}
              reviewed={reviews.some((r) => r.dateEventId === d.id && r.userId === me.id)}
              onClick={() => nav(`/dates/${d.id}`)}
            />
          ))}
        </div>
      )}
    </Screen>
  )
}

const STATUS: Record<
  DateEvent['status'],
  { label: string; tone: 'rose' | 'mint' | 'amber' | 'neutral' | 'violet' }
> = {
  invited: { label: 'Waiting', tone: 'amber' },
  accepted: { label: 'Confirmed', tone: 'mint' },
  declined: { label: 'Declined', tone: 'neutral' },
  completed: { label: 'Done', tone: 'violet' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

function DateRow({
  d,
  place,
  mine,
  reviewed,
  onClick,
}: {
  d: DateEvent
  place?: string
  mine: boolean
  reviewed: boolean
  onClick: () => void
}) {
  const s = STATUS[d.status]
  return (
    <Card onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream">
          <span className="text-[10px] font-bold uppercase text-plum-soft">
            {new Date(d.start).toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-extrabold leading-none">{new Date(d.start).getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Tag tone={s.tone}>{s.label}</Tag>
            {d.status === 'completed' && !reviewed && <Tag tone="rose">Review me</Tag>}
          </div>
          <p className="truncate font-extrabold">{d.invitation.headline}</p>
          <p className="mt-0.5 truncate text-[13px] text-plum-soft">
            {fmtDay(d.start)} · {fmtRange(d.start, d.end)}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {place ? `📍 ${place}` : '📍 Place to be decided'} · {mine ? 'sent by you' : 'invited you'}
          </p>
        </div>
      </div>
    </Card>
  )
}
