import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { placeScore, useApp } from '../lib/store'
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
  Stars,
  Textarea,
  useToast,
} from '../components/ui'
import { CategoryPicker } from '../components/CategoryPicker'
import { PlaceRanking } from '../components/PlaceRanking'
import { findCategory } from '../lib/categories'
import { mapsUrl, searchPlaces, type PlaceSuggestion } from '../lib/places'
import type { PlaceCategory } from '../lib/types'

export default function Wishlist() {
  const { places, placeCategories, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all')
  const [sort, setSort] = useState<'recent' | 'rating'>(
    params.get('sort') === 'rating' ? 'rating' : 'recent',
  )
  const [adding, setAdding] = useState(params.get('add') === '1')

  // `view` stays in the URL so links from Home switch the tab even when this
  // screen is already mounted; `add` and `sort` are one-shot and get cleared.
  const view = params.get('view') === 'ranking' ? 'ranking' : 'list'
  const setView = (v: 'list' | 'ranking') =>
    setParams(v === 'ranking' ? { view: 'ranking' } : {}, { replace: true })

  useEffect(() => {
    if (!params.get('add') && !params.get('sort')) return
    if (params.get('add') === '1') setAdding(true)
    if (params.get('sort') === 'rating') setSort('rating')
    const next = new URLSearchParams(params)
    next.delete('add')
    next.delete('sort')
    setParams(next, { replace: true })
  }, [params, setParams])

  // A category can be deleted while it is selected as the filter.
  useEffect(() => {
    if (cat !== 'all' && !placeCategories.some((c) => c.id === cat)) setCat('all')
  }, [placeCategories, cat])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return places
      .filter((p) => (cat === 'all' ? true : p.category === cat))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.favourite !== b.favourite) return Number(b.favourite) - Number(a.favourite)
        if (sort === 'rating') return (placeScore(b) ?? -1) - (placeScore(a) ?? -1)
        return +new Date(b.createdAt) - +new Date(a.createdAt)
      })
  }, [places, query, cat, sort])

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader
          title="Places"
          subtitle={`${places.length} spots you both want to try`}
          right={
            <Button size="sm" onClick={() => setAdding(true)}>
              + Add
            </Button>
          }
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Chip active={view === 'list'} onClick={() => setView('list')}>
          Wishlist
        </Chip>
        <Chip active={view === 'ranking'} onClick={() => setView('ranking')}>
          🏆 Ranking
        </Chip>
      </div>

      {view === 'ranking' ? (
        <PlaceRanking />
      ) : (
        <>
          <Input
            placeholder="Search saved places…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            <Chip active={cat === 'all'} onClick={() => setCat('all')}>
              All
            </Chip>
            {placeCategories.map((c) => (
              <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                {c.emoji} {c.label}
              </Chip>
            ))}
          </div>

          <div className="mb-3 mt-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-plum-soft">{list.length} places</p>
            <button
              onClick={() => setSort(sort === 'recent' ? 'rating' : 'recent')}
              className="text-[13px] font-bold text-rose"
            >
              {sort === 'recent' ? 'Sort by rating ↓' : 'Sort by newest ↓'}
            </button>
          </div>

          {list.length === 0 ? (
            <EmptyState
              emoji="📍"
              title={places.length === 0 ? 'No places yet' : 'Nothing in this category'}
              body={
                places.length === 0
                  ? 'Save the spots you want to try together. Ratings from your dates end up here.'
                  : 'Try another category, or add a place to this one.'
              }
              action={<Button onClick={() => setAdding(true)}>Add a place</Button>}
            />
          ) : (
            <div className="space-y-3">
              {list.map((p) => {
                const score = placeScore(p)
                const meta = findCategory(placeCategories, p.category)
                return (
                  <Card key={p.id} onClick={() => nav(`/wishlist/${p.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl">
                        {p.photo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold">
                          {p.favourite && '⭐️ '}
                          {p.name}
                        </p>
                        <p className="truncate text-[12px] text-muted">
                          {meta.emoji} {meta.label} · {'₫'.repeat(p.priceLevel)} · {p.address}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {score !== null ? (
                            <>
                              <Stars value={score} size={13} />
                              <span className="text-xs font-bold text-plum-soft">
                                {score.toFixed(1)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted">Not rated yet</span>
                          )}
                          {p.notes.length > 0 && (
                            <span className="text-xs text-muted">· 📝 {p.notes.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <AddPlaceSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          actions.addPlace(v)
          setAdding(false)
          if (view === 'ranking') setView('list')
          toast('Saved to your wishlist 📍')
        }}
      />
    </Screen>
  )
}

/* ------------------------------------------------------------- add sheet */

function AddPlaceSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (v: {
    name: string
    address: string
    category: PlaceCategory
    priceLevel: 1 | 2 | 3
    photo: string
    mapsUrl: string
    note?: string
  }) => void
}) {
  const { placeCategories } = useApp()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<PlaceSuggestion | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('cafe')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) {
      setQ('')
      setPicked(null)
      setName('')
      setAddress('')
      setNote('')
    }
  }, [open])

  const results = useMemo(() => searchPlaces(q), [q])

  function choose(s: PlaceSuggestion) {
    setPicked(s)
    setName(s.name)
    setAddress(s.address)
    setCategory(s.category)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a place">
      {!picked ? (
        <>
          <Input
            autoFocus
            placeholder="Search Google Maps…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mt-3 space-y-2">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => choose(s)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left transition active:scale-[0.98]"
              >
                <span className="text-2xl">{s.photo}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{s.name}</p>
                  <p className="truncate text-[12px] text-muted">{s.address}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-amber">⭐️ {s.googleRating}</span>
              </button>
            ))}
            {results.length === 0 && (
              <button
                onClick={() => {
                  setPicked({
                    id: 'manual',
                    name: q,
                    address: '',
                    category: 'cafe',
                    priceLevel: 1,
                    photo: '📍',
                    googleRating: 0,
                  })
                  setName(q)
                }}
                className="w-full rounded-2xl border-2 border-dashed border-line bg-white p-4 text-sm font-bold text-plum-soft"
              >
                Add “{q}” manually
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Category</p>
            <CategoryPicker scope="place" value={category} onChange={setCategory} />
          </div>
          <Field label="Note" hint="Why this place? What to order? Best time to go?">
            <Textarea
              rows={3}
              placeholder="Window seat on the second floor…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <div className="rounded-2xl bg-lilac p-3.5 text-[13px] text-plum">
            🗺️ Linked to Google Maps —{' '}
            <a
              className="font-bold underline"
              href={mapsUrl(name, address)}
              target="_blank"
              rel="noreferrer"
            >
              open location
            </a>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setPicked(null)}>
              Back
            </Button>
            <Button
              full
              disabled={!name.trim()}
              onClick={() =>
                onSave({
                  name: name.trim(),
                  address: address.trim(),
                  category,
                  priceLevel: picked.priceLevel,
                  photo:
                    picked.photo === '📍' ? findCategory(placeCategories, category).emoji : picked.photo,
                  mapsUrl: mapsUrl(name, address),
                  note: note.trim() || undefined,
                })
              }
            >
              Save to wishlist
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
