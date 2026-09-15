import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { findCategory } from '../lib/categories'
import { fmtDay, relativeTime } from '../lib/date-utils'
import { Avatar, Button, Card, EmptyState, Stars } from './ui'

/** The shared diary: every finished date with both partners' entries. */
export function DiaryTimeline() {
  const { me, world, dates, places, reviews, placeCategories } = useApp()
  const nav = useNavigate()
  if (!me) return null

  const done = dates.filter((d) => d.status === 'completed').slice().reverse()

  if (done.length === 0)
    return (
      <EmptyState
        emoji="📖"
        title="Your diary starts after the first date"
        body="Once a date is over you can both rate the place and write how it felt."
        action={<Button onClick={() => nav('/plan')}>Plan a date</Button>}
      />
    )

  return (
    <div className="space-y-4">
      {done.map((d) => {
        const place = places.find((p) => p.id === d.placeId)
        const entries = reviews.filter((r) => r.dateEventId === d.id)
        return (
          <div key={d.id}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-sm font-extrabold">{fmtDay(d.start)}</span>
              <span className="truncate text-xs text-muted">· {d.invitation.headline}</span>
            </div>
            <Card>
              {place && (
                <button
                  onClick={() => nav(`/wishlist/${place.id}`)}
                  className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-cream p-3 text-left"
                >
                  <span className="text-xl">{place.photo}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{place.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {findCategory(placeCategories, place.category).label}
                  </span>
                </button>
              )}

              {entries.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm text-plum-soft">No entry yet.</p>
                  <Button variant="soft" className="mt-3" onClick={() => nav(`/review/${d.id}`)}>
                    Write how it went
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((r) => {
                    const author = world.users.find((u) => u.id === r.userId)
                    return (
                      <div key={r.id}>
                        <div className="flex items-center gap-2">
                          <Avatar
                            emoji={author?.emoji ?? '💗'}
                            color={author?.color ?? '#e8637a'}
                            size={26}
                          />
                          <span className="text-[13px] font-extrabold">
                            {author?.id === me.id ? 'You' : author?.name}
                          </span>
                          <Stars value={r.placeStars} size={12} />
                          <span className="ml-auto text-[11px] text-muted">
                            {relativeTime(r.createdAt)}
                          </span>
                        </div>
                        {r.photo && (
                          <img src={r.photo} alt="" className="mt-2 h-36 w-full rounded-2xl object-cover" />
                        )}
                        <p className="mt-2 text-[14px] leading-relaxed">{r.feeling}</p>
                      </div>
                    )
                  })}
                  {!entries.some((r) => r.userId === me.id) && (
                    <Button variant="soft" full onClick={() => nav(`/review/${d.id}`)}>
                      Add your side of the story
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        )
      })}
    </div>
  )
}
