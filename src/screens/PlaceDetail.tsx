import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { placeScore, useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
  Stars,
  Tag,
  useToast,
} from '../components/ui'
import { findCategory } from '../lib/categories'
import { CategoryPicker } from '../components/CategoryPicker'
import { fmtDay, relativeTime } from '../lib/date-utils'

export default function PlaceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { me, world, places, dates, placeCategories, actions } = useApp()
  const [note, setNote] = useState('')

  const p = places.find((x) => x.id === id)
  if (!me) return null
  if (!p)
    return (
      <Screen>
        <EmptyState
          emoji="🫧"
          title="Place not found"
          body="It might have been removed from your wishlist."
          action={<Button onClick={() => nav('/wishlist')}>Back to wishlist</Button>}
        />
      </Screen>
    )

  const score = placeScore(p)
  const visits = dates.filter((d) => d.placeId === p.id && d.status === 'completed')
  const myRating = p.ratings.filter((r) => r.userId === me.id).slice(-1)[0]

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader
          title={p.name}
          subtitle={`${findCategory(placeCategories, p.category).label} · ${'₫'.repeat(p.priceLevel)}`}
          back="/wishlist"
          right={
            <button
              onClick={() => actions.toggleFavourite(p.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm transition active:scale-90"
              aria-label="Favourite"
            >
              {p.favourite ? '⭐️' : '☆'}
            </button>
          }
        />
      </div>

      <Card className="bg-plum text-white">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{p.photo}</span>
          <div className="min-w-0 flex-1">
            {score !== null ? (
              <>
                <p className="text-3xl font-extrabold leading-none">{score.toFixed(1)}</p>
                <Stars value={score} size={14} />
                <p className="mt-1 text-xs text-white/60">
                  {p.ratings.length} rating{p.ratings.length === 1 ? '' : 's'} from the two of you
                </p>
              </>
            ) : (
              <p className="text-sm text-white/70">
                Not rated yet — go once and tell each other what you think.
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-[13px] text-white/70">📍 {p.address}</p>
        <a
          href={p.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-white/15 py-2.5 text-sm font-bold backdrop-blur"
        >
          Open in Google Maps ↗
        </a>
      </Card>

      {/* Individual ratings ------------------------------------------------ */}
      {p.ratings.length > 0 && (
        <Card className="mt-3">
          <p className="mb-3 text-[13px] font-bold uppercase tracking-widest text-muted">
            Who rated what
          </p>
          <div className="space-y-2.5">
            {world.users
              .filter((u) => p.ratings.some((r) => r.userId === u.id))
              .map((u) => {
                const rs = p.ratings.filter((r) => r.userId === u.id)
                const avg = rs.reduce((s, r) => s + r.stars, 0) / rs.length
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar emoji={u.emoji} color={u.color} size={32} />
                    <span className="flex-1 text-sm font-bold">{u.id === me.id ? 'You' : u.name}</span>
                    <Stars value={avg} size={14} />
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Category ---------------------------------------------------------- */}
      <Card className="mt-3">
        <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-muted">Category</p>
        <CategoryPicker
          scope="place"
          value={p.category}
          onChange={(id) => {
            actions.setPlaceCategory(p.id, id)
            toast('Category updated')
          }}
        />
      </Card>

      {/* Quick rate -------------------------------------------------------- */}
      <Card className="mt-3">
        <p className="text-[13px] font-bold uppercase tracking-widest text-muted">Your rating</p>
        <div className="mt-2">
          <Stars
            value={myRating?.stars ?? 0}
            size={28}
            onChange={(n) => {
              actions.ratePlace(p.id, n, null)
              toast('Rating saved — synced to the wishlist')
            }}
          />
        </div>
      </Card>

      {/* Notes ------------------------------------------------------------- */}
      <h2 className="mb-3 mt-7 text-[17px] font-extrabold">Notes</h2>
      <div className="space-y-2">
        {p.notes.map((n) => {
          const author = world.users.find((u) => u.id === n.userId)
          return (
            <Card key={n.id}>
              <div className="flex items-center gap-2">
                <Avatar emoji={author?.emoji ?? '💗'} color={author?.color ?? '#e8637a'} size={24} />
                <span className="text-[13px] font-bold">
                  {author?.id === me.id ? 'You' : author?.name}
                </span>
                <span className="ml-auto text-xs text-muted">{relativeTime(n.createdAt)}</span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed">{n.text}</p>
            </Card>
          )
        })}
        {p.notes.length === 0 && (
          <p className="px-1 text-sm text-muted">No notes yet. Leave a hint for next time.</p>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!note.trim()) return
          actions.addNote(p.id, note.trim())
          setNote('')
          toast('Note added')
        }}
      >
        <Input placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" disabled={!note.trim()}>
          Add
        </Button>
      </form>

      {/* Visits ------------------------------------------------------------ */}
      {visits.length > 0 && (
        <>
          <h2 className="mb-3 mt-7 text-[17px] font-extrabold">You went here</h2>
          <div className="space-y-2">
            {visits.map((d) => (
              <Card key={d.id} onClick={() => nav(`/dates/${d.id}`)}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">💕</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{d.invitation.headline}</p>
                    <p className="text-[12px] text-muted">{fmtDay(d.start)}</p>
                  </div>
                  <Tag tone="violet">Done</Tag>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="mt-7 space-y-2">
        <Button size="lg" full onClick={() => nav('/plan')}>
          Plan a date here ✦
        </Button>
        <Button
          variant="danger"
          full
          onClick={() => {
            actions.removePlace(p.id)
            toast('Removed from wishlist')
            nav('/wishlist')
          }}
        >
          Remove from wishlist
        </Button>
      </div>
    </Screen>
  )
}
