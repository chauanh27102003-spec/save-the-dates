import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import { Button, Card, EmptyState, ScreenHeader, Stars, Textarea, useToast } from '../components/ui'
import { fileToDataUrl } from '../lib/image'
import { fmtDay, fmtRange } from '../lib/date-utils'

export default function Review() {
  const { dateId } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { me, dates, places, reviews, actions } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const d = dates.find((x) => x.id === dateId)
  const existing = reviews.find((r) => r.dateEventId === dateId && r.userId === me?.id)

  const [stars, setStars] = useState(existing?.placeStars ?? 0)
  const [feeling, setFeeling] = useState(existing?.feeling ?? '')
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null)

  if (!me) return null
  if (!d)
    return (
      <Screen>
        <EmptyState emoji="🫧" title="Date not found" body="Nothing to review here." action={<Button onClick={() => nav('/dates')}>Back</Button>} />
      </Screen>
    )

  const place = places.find((p) => p.id === d.placeId)

  async function onPhoto(file?: File) {
    if (!file) return
    try {
      setPhoto(await fileToDataUrl(file))
    } catch {
      toast('Could not use that image')
    }
  }

  function save() {
    actions.addReview({
      dateEventId: d!.id,
      placeStars: stars,
      feeling: feeling.trim(),
      photo,
    })
    toast(place ? `Rating synced to ${place.name} ⭐️` : 'Saved to your diary 📖')
    nav('/dates?view=diary')
  }

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader title="How was it?" subtitle={`${fmtDay(d.start)} · ${fmtRange(d.start, d.end)}`} back />
      </div>

      {place ? (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{place.photo}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{place.name}</p>
              <p className="truncate text-[12px] text-muted">{place.address}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-cream py-4">
            <p className="text-[13px] font-semibold text-plum-soft">Rate the place</p>
            <Stars value={stars} size={32} onChange={setStars} />
            <p className="text-xs text-muted">
              {['Pick a star', 'Never again', 'It was fine', 'Good', 'Really good', 'Take me back'][stars]}
            </p>
          </div>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
            Your rating syncs into the wishlist so the next pick is easier.
          </p>
        </Card>
      ) : (
        <Card className="mb-4 text-center">
          <p className="text-sm text-plum-soft">No place was attached to this date.</p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-muted">
          Your entry in the shared diary
        </p>
        <Textarea
          rows={6}
          placeholder="What do you want to remember about tonight?"
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          maxLength={600}
        />
        <p className="mt-1 text-right text-[11px] text-muted">{feeling.length}/600</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
        {photo ? (
          <div className="relative mt-3 overflow-hidden rounded-2xl">
            <img src={photo} alt="" className="h-40 w-full object-cover" />
            <button
              onClick={() => setPhoto(null)}
              className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-plum-soft transition active:scale-[0.98]"
          >
            <span className="text-xl">📷</span>
            <span className="text-[13px] font-bold">Add a photo</span>
          </button>
        )}
      </Card>

      <div className="mt-5">
        <Button size="lg" full disabled={!stars && !feeling.trim()} onClick={save}>
          Save to our diary
        </Button>
      </div>
    </Screen>
  )
}
