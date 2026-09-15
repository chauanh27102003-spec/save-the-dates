import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import { Avatar, Card, Tag } from '../components/ui'
import {
  addDays,
  countdownLabel,
  daysBetween,
  fmtDay,
  fmtRange,
  nextOccurrence,
  startOfDay,
} from '../lib/date-utils'
import { dayAvailability } from '../lib/calendar'
import { findCategory } from '../lib/categories'

export default function Home() {
  const {
    me,
    partner,
    couple,
    dates,
    milestones,
    milestoneKinds,
    places,
    placeCategories,
    unread,
    myBusy,
    partnerBusy,
  } = useApp()
  const nav = useNavigate()
  if (!me || !partner || !couple) return null

  const togetherDays = daysBetween(couple.since, new Date())

  const upcoming = dates
    .filter((d) => ['invited', 'accepted'].includes(d.status) && new Date(d.end) > new Date())
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))[0]

  const needsReview = dates.filter((d) => d.status === 'completed')

  const nextMilestone = milestones
    .map((m) => ({ m, when: nextOccurrence(m.date, m.yearly) }))
    .sort((a, b) => +a.when - +b.when)[0]

  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i))

  return (
    <Screen>
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm font-semibold text-plum-soft">
            {greeting()}, {me.name} {me.emoji}
          </p>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
            You &amp; {partner.name}
          </h1>
        </div>
        <Link
          to="/notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-sm"
        >
          🔔
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
      </div>

      {/* Together counter -------------------------------------------------- */}
      <Card className="relative mt-5 overflow-hidden bg-plum p-5 text-white">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-rose/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Avatar emoji={me.emoji} color="#ffffff" size={34} ring />
            <Avatar emoji={partner.emoji} color="#ffffff" size={34} ring />
            <span className="anim-beat ml-1 text-lg">💗</span>
          </div>
          <p className="mt-4 text-[13px] font-bold uppercase tracking-widest text-white/50">
            Together for
          </p>
          <p className="text-[44px] font-extrabold leading-none">
            {togetherDays.toLocaleString()}{' '}
            <span className="text-xl font-bold text-white/60">days</span>
          </p>
          {nextMilestone && (
            <Link
              to="/milestones"
              className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"
            >
              <span className="text-xl">
                {findCategory(milestoneKinds, nextMilestone.m.kind).emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{nextMilestone.m.title}</p>
                <p className="text-xs text-white/60">{fmtDay(nextMilestone.when)}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-plum">
                {countdownLabel(daysBetween(new Date(), nextMilestone.when))}
              </span>
            </Link>
          )}
        </div>
      </Card>

      {/* Next date --------------------------------------------------------- */}
      <SectionTitle title="Next date" action={{ label: 'All dates', to: '/dates' }} />
      {upcoming ? (
        <Card onClick={() => nav(`/dates/${upcoming.id}`)}>
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-blush">
              <span className="text-[10px] font-bold uppercase text-rose-dark">
                {new Date(upcoming.start).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-xl font-extrabold leading-none text-plum">
                {new Date(upcoming.start).getDate()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Tag tone={upcoming.status === 'accepted' ? 'mint' : 'amber'}>
                  {upcoming.status === 'accepted' ? 'Confirmed' : 'Waiting'}
                </Tag>
                <span className="text-xs text-muted">
                  {daysBetween(new Date(), upcoming.start) === 0
                    ? 'Today'
                    : `in ${daysBetween(new Date(), upcoming.start)}d`}
                </span>
              </div>
              <p className="truncate font-extrabold">{upcoming.invitation.headline}</p>
              <p className="mt-0.5 truncate text-[13px] text-plum-soft">
                {fmtRange(upcoming.start, upcoming.end)}
                {upcoming.placeId &&
                  ` · ${places.find((p) => p.id === upcoming.placeId)?.name ?? ''}`}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card onClick={() => nav('/plan')} className="flex items-center gap-3">
          <span className="text-3xl">✦</span>
          <div>
            <p className="font-extrabold">Nothing planned yet</p>
            <p className="text-[13px] text-plum-soft">Let’s find a window you are both free.</p>
          </div>
        </Card>
      )}

      {/* Shared availability ------------------------------------------------ */}
      <SectionTitle title="This week, both free" />
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {week.map((d) => {
          const state = dayAvailability(myBusy, partnerBusy, d)
          const tone =
            state === 'open'
              ? 'bg-[#e4f5ec] text-[#2f7a58]'
              : state === 'some'
                ? 'bg-[#fdf0dc] text-[#a2701f]'
                : 'bg-blush text-rose-dark'
          return (
            <button
              key={+d}
              onClick={() => nav('/plan')}
              className={`flex w-[62px] shrink-0 flex-col items-center rounded-2xl px-2 py-3 transition active:scale-95 ${tone}`}
            >
              <span className="text-[10px] font-bold uppercase opacity-70">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg font-extrabold">{d.getDate()}</span>
              <span className="mt-1 text-[10px] font-semibold">{state}</span>
            </button>
          )
        })}
      </div>

      {/* After-date nudge --------------------------------------------------- */}
      {needsReview.length > 0 && (
        <>
          <SectionTitle title="How was it?" action={{ label: 'Diary', to: '/dates?view=diary' }} />
          <div className="space-y-3">
            {needsReview.slice(0, 2).map((d) => {
              const place = places.find((p) => p.id === d.placeId)
              return (
                <Card key={d.id} onClick={() => nav(`/review/${d.id}`)} className="bg-lilac">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {place ? findCategory(placeCategories, place.category).emoji : '💭'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">
                        {place?.name ?? d.invitation.headline}
                      </p>
                      <p className="text-[13px] text-plum-soft">
                        {fmtDay(d.start)} · rate &amp; write
                      </p>
                    </div>
                    <span className="text-violet">→</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Quick actions ------------------------------------------------------ */}
      <SectionTitle title="Quick actions" />
      <div className="grid grid-cols-2 gap-3">
        <QuickAction emoji="✦" label="Plan a date" to="/plan" />
        <QuickAction emoji="📍" label="Add a place" to="/wishlist?add=1" />
        <QuickAction emoji="🎂" label="Add a date to count" to="/milestones" />
        <QuickAction emoji="🏆" label="Top rated places" to="/wishlist?view=ranking" />
      </div>
    </Screen>
  )
}

function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between">
      <h2 className="text-[17px] font-extrabold">{title}</h2>
      {action && (
        <Link to={action.to} className="text-[13px] font-bold text-rose">
          {action.label}
        </Link>
      )}
    </div>
  )
}

function QuickAction({ emoji, label, to }: { emoji: string; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-card bg-white p-4 shadow-[0_8px_30px_-18px_rgba(51,32,58,0.35)] transition active:scale-95"
    >
      <span className="text-2xl">{emoji}</span>
      <p className="mt-2 text-sm font-extrabold leading-tight">{label}</p>
    </Link>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
