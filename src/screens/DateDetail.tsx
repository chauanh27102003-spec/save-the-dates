import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import { InvitationCard } from '../components/InvitationCard'
import { Avatar, Button, Card, EmptyState, ScreenHeader, Sheet, Stars, Tag, Textarea, useToast } from '../components/ui'
import { fmtDay, fmtRange, relativeTime } from '../lib/date-utils'
import type { CalendarProvider } from '../lib/types'
import { findCategory } from '../lib/categories'

export default function DateDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { me, partner, world, dates, places, reviews, placeCategories, actions } = useApp()
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null)
  const [message, setMessage] = useState('')
  const [provider, setProvider] = useState<CalendarProvider | null>(null)

  const d = dates.find((x) => x.id === id)
  if (!me || !partner) return null
  if (!d)
    return (
      <Screen>
        <EmptyState emoji="🫧" title="Date not found" body="It may have been cancelled." action={<Button onClick={() => nav('/dates')}>Back to dates</Button>} />
      </Screen>
    )

  const host = world.users.find((u) => u.id === d.createdBy)
  const place = places.find((p) => p.id === d.placeId) ?? null
  const iAmInvited = d.invitedUserId === me.id
  const myReview = reviews.find((r) => r.dateEventId === d.id && r.userId === me.id)
  const theirReview = reviews.find((r) => r.dateEventId === d.id && r.userId === partner.id)
  const myCalendars = me.calendars

  function openRespond(kind: 'accept' | 'decline') {
    setResponding(kind)
    setMessage(kind === 'accept' ? '' : '')
    setProvider(myCalendars[0]?.provider ?? null)
  }

  function confirm() {
    if (!responding) return
    actions.respondToDate(d!.id, responding === 'accept', message.trim(), responding === 'accept' ? provider : null)
    setResponding(null)
    toast(responding === 'accept' ? 'Added to your calendar ✅' : 'Response sent')
  }

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader title="The invitation" back="/dates" />
      </div>

      <InvitationCard
        invitation={d.invitation}
        start={d.start}
        end={d.end}
        place={place}
        from={host?.name}
      />

      {/* status ---------------------------------------------------------- */}
      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <Avatar emoji={host?.emoji ?? '💗'} color={host?.color ?? '#e8637a'} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-plum-soft">
              {d.createdBy === me.id ? 'You invited' : `${host?.name} invited you`}
            </p>
            <p className="font-extrabold">
              {d.createdBy === me.id ? partner.name : 'You'} · {relativeTime(d.createdAt)}
            </p>
          </div>
          <Tag
            tone={
              d.status === 'accepted' ? 'mint' : d.status === 'invited' ? 'amber' : d.status === 'completed' ? 'violet' : 'neutral'
            }
          >
            {d.status}
          </Tag>
        </div>

        {d.response && (
          <div className="mt-4 rounded-2xl bg-cream p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              {d.status === 'accepted' ? 'Accepted with' : 'Reply'}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed">
              {d.response.message || (d.status === 'accepted' ? 'Yes 💕' : 'Cannot make it.')}
            </p>
          </div>
        )}

        {d.calendarSynced.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {d.calendarSynced.map((c) => {
              const u = world.users.find((x) => x.id === c.userId)
              return (
                <p key={c.userId} className="flex items-center gap-2 text-[13px] text-plum-soft">
                  <span className="text-mint">✓</span>
                  In {u?.id === me.id ? 'your' : `${u?.name}’s`}{' '}
                  {c.provider === 'google' ? 'Google Calendar' : 'iPhone Calendar'}
                </p>
              )
            })}
          </div>
        )}
      </Card>

      {/* place ----------------------------------------------------------- */}
      {place && (
        <Card className="mt-3" onClick={() => nav(`/wishlist/${place.id}`)}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{place.photo}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{place.name}</p>
              <p className="truncate text-[12px] text-muted">
                {findCategory(placeCategories, place.category).label} · {place.address}
              </p>
            </div>
            <a
              href={place.mapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-bold"
            >
              Maps ↗
            </a>
          </div>
        </Card>
      )}

      {/* actions --------------------------------------------------------- */}
      {d.status === 'invited' && iAmInvited && (
        <div className="mt-5 space-y-2">
          <Button size="lg" full onClick={() => openRespond('accept')}>
            Accept 💕
          </Button>
          <Button variant="outline" full onClick={() => openRespond('decline')}>
            Can’t make it
          </Button>
        </div>
      )}

      {d.status === 'invited' && !iAmInvited && (
        <div className="mt-5 space-y-2">
          <p className="text-center text-sm text-plum-soft">
            Waiting for {partner.name} to respond…
          </p>
          <Button variant="danger" full onClick={() => { actions.cancelDate(d.id); toast('Date cancelled') }}>
            Cancel invitation
          </Button>
        </div>
      )}

      {d.status === 'accepted' && (
        <div className="mt-5">
          <Button variant="danger" full onClick={() => { actions.cancelDate(d.id); toast('Date cancelled') }}>
            Cancel this date
          </Button>
        </div>
      )}

      {d.status === 'completed' && (
        <>
          <div className="mt-5">
            <Button size="lg" full onClick={() => nav(`/review/${d.id}`)}>
              {myReview ? 'Edit your review' : 'Rate this date'}
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {[myReview, theirReview].filter(Boolean).map((r) => {
              const author = world.users.find((u) => u.id === r!.userId)
              return (
                <Card key={r!.id}>
                  <div className="flex items-center gap-2">
                    <Avatar emoji={author?.emoji ?? '💗'} color={author?.color ?? '#e8637a'} size={28} />
                    <p className="text-sm font-extrabold">{author?.id === me.id ? 'You' : author?.name}</p>
                    <Stars value={r!.placeStars} size={13} />
                    <span className="ml-auto text-xs text-muted">{relativeTime(r!.createdAt)}</span>
                  </div>
                  {r!.photo && <img src={r!.photo} alt="" className="mt-3 h-36 w-full rounded-2xl object-cover" />}
                  <p className="mt-2 text-[14px] leading-relaxed">{r!.feeling}</p>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* respond sheet ---------------------------------------------------- */}
      <Sheet
        open={!!responding}
        onClose={() => setResponding(null)}
        title={responding === 'accept' ? 'Say yes 💕' : 'Send a kind no'}
      >
        <p className="mb-4 text-sm text-plum-soft">
          {fmtDay(d.start)} · {fmtRange(d.start, d.end)}
        </p>

        <Textarea
          rows={3}
          placeholder={
            responding === 'accept'
              ? 'Yes! I will be there ten minutes early…'
              : 'I have something that evening — can we try Sunday?'
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {responding === 'accept' && (
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-semibold text-plum-soft">Add to which calendar?</p>
            {myCalendars.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-plum-soft">No calendar linked yet.</p>
                <Button variant="soft" className="mt-3" onClick={() => nav('/calendar')}>
                  Connect a calendar
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {myCalendars.map((c) => (
                  <button
                    key={c.provider}
                    onClick={() => setProvider(c.provider)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition ${
                      provider === c.provider ? 'bg-plum text-white' : 'bg-white'
                    }`}
                  >
                    <span className="text-xl">{c.provider === 'google' ? '📆' : '🍎'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">
                        {c.provider === 'google' ? 'Google Calendar' : 'iPhone Calendar'}
                      </p>
                      <p className={`truncate text-[11px] ${provider === c.provider ? 'text-white/60' : 'text-muted'}`}>
                        {c.accountEmail}
                      </p>
                    </div>
                    {provider === c.provider && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          size="lg"
          full
          className="mt-5"
          disabled={responding === 'accept' && myCalendars.length > 0 && !provider}
          onClick={confirm}
        >
          {responding === 'accept' ? 'Accept and add to calendar' : 'Send response'}
        </Button>
      </Sheet>
    </Screen>
  )
}
