import { useNavigate } from 'react-router-dom'
import { placeScore, useApp } from '../lib/store'
import { findCategory } from '../lib/categories'
import { Card, EmptyState, Stars, Tag } from './ui'

/** Places the two of them have rated, best first. */
export function PlaceRanking() {
  const { places, placeCategories } = useApp()
  const nav = useNavigate()

  const ranked = places
    .filter((p) => placeScore(p) !== null)
    .sort((a, b) => (placeScore(b) ?? 0) - (placeScore(a) ?? 0))

  if (ranked.length === 0)
    return (
      <EmptyState
        emoji="🏆"
        title="No rankings yet"
        body="Rate the places you visit and the leaderboard builds itself."
      />
    )

  return (
    <div className="space-y-3">
      {ranked.map((p, i) => {
        const score = placeScore(p)!
        return (
          <Card key={p.id} onClick={() => nav(`/wishlist/${p.id}`)}>
            <div className="flex items-center gap-3">
              <span className="w-7 text-center text-lg font-extrabold">
                {['🥇', '🥈', '🥉'][i] ?? i + 1}
              </span>
              <span className="text-2xl">{p.photo}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{p.name}</p>
                <p className="truncate text-[12px] text-muted">
                  {findCategory(placeCategories, p.category).label} · {p.ratings.length} rating
                  {p.ratings.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold leading-none">{score.toFixed(1)}</p>
                <Stars value={score} size={11} />
              </div>
            </div>
            {p.favourite && (
              <div className="mt-3">
                <Tag tone="rose">⭐️ Pinned favourite</Tag>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
