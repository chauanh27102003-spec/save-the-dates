import { useEffect, useRef, useState } from 'react'
import { AppError, useApp } from '../lib/store'
import { EMOJI_CHOICES } from '../lib/categories'
import { Button, Chip, Input, useToast } from './ui'

/**
 * Horizontal category chips with an inline "new category" editor. Used for both
 * wishlist places and important dates — the two share the same shape.
 */
export function CategoryPicker({
  scope,
  value,
  onChange,
}: {
  scope: 'place' | 'milestone'
  value: string
  onChange: (id: string) => void
}) {
  const { placeCategories, milestoneKinds, actions } = useApp()
  const toast = useToast()
  const options = scope === 'place' ? placeCategories : milestoneKinds

  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])
  const [error, setError] = useState<string | null>(null)
  const row = useRef<HTMLDivElement>(null)

  // New categories land at the end of the strip — bring the selection into view.
  useEffect(() => {
    row.current
      ?.querySelector(`[data-category="${value}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [value])

  function create() {
    setError(null)
    try {
      const id = actions.addCategory({ scope, label, emoji })
      onChange(id)
      setEditing(false)
      setLabel('')
      setEmoji(EMOJI_CHOICES[0])
      toast('Category added')
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Could not add that.')
    }
  }

  function remove(id: string) {
    try {
      actions.removeCategory(id)
      if (value === id) onChange(options[0].id)
      toast('Category removed')
    } catch (e) {
      toast(e instanceof AppError ? e.message : 'Could not remove that.')
    }
  }

  return (
    <div>
      <div ref={row} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {options.map((c) => (
          <Chip
            key={c.id}
            active={value === c.id}
            onClick={() => onChange(c.id)}
            data-category={c.id}
          >
            {c.emoji} {c.label}
          </Chip>
        ))}
        <Chip active={editing} onClick={() => setEditing((v) => !v)}>
          ＋ New
        </Chip>
      </div>

      {editing && (
        <div className="anim-fade-up mt-3 rounded-card bg-white p-4">
          <p className="mb-2 text-[13px] font-semibold text-plum-soft">Pick an icon</p>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-9 items-center justify-center rounded-xl text-lg transition active:scale-90 ${
                  emoji === e ? 'bg-plum' : 'bg-cream'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <Input
              placeholder={scope === 'place' ? 'Karaoke' : 'Trip'}
              value={label}
              maxLength={20}
              onChange={(ev) => setLabel(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && label.trim() && create()}
            />
          </div>

          {error && (
            <p className="mt-2 rounded-2xl bg-[#fdf0ee] px-4 py-2.5 text-[13px] font-medium text-[#c0392b]">
              {error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" full disabled={!label.trim()} onClick={create}>
              Add {emoji} {label.trim() || 'category'}
            </Button>
          </div>

          {options.some((c) => c.custom) && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-[13px] font-semibold text-plum-soft">Your categories</p>
              <div className="flex flex-wrap gap-2">
                {options
                  .filter((c) => c.custom)
                  .map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[13px] font-semibold"
                    >
                      {c.emoji} {c.label}
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="text-muted transition active:scale-90"
                        aria-label={`Remove ${c.label}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
