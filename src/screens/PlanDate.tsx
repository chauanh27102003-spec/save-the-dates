import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { placeScore, useApp } from '../lib/store'
import { conflictsIn, suggestSlots } from '../lib/calendar'
import { findCategory } from '../lib/categories'
import { TEMPLATES, templateById } from '../lib/templates'
import { fileToDataUrl } from '../lib/image'
import { fmtDay, fmtDuration, fmtRange, fmtTime, toLocalInput } from '../lib/date-utils'
import { Button, Card, Chip, Field, Input, Stars, Tag, Textarea, useToast } from '../components/ui'
import { InvitationCard } from '../components/InvitationCard'

const STEPS = ['When', 'Where', 'Invite', 'Send']

export default function PlanDate() {
  const { me, partner, places, placeCategories, myBusy, partnerBusy, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null)
  const [manual, setManual] = useState(false)
  const [manualStart, setManualStart] = useState(toLocalInput(new Date(Date.now() + 86400000).toISOString()))
  const [minutes, setMinutes] = useState(150)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [headline, setHeadline] = useState(TEMPLATES[0].headline)
  const [message, setMessage] = useState(TEMPLATES[0].message)
  const [photo, setPhoto] = useState<string | null>(null)

  const suggestions = useMemo(
    () => suggestSlots(myBusy, partnerBusy, 6),
    [myBusy, partnerBusy],
  )

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...places]
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          findCategory(placeCategories, p.category).label.toLowerCase().includes(q),
      )
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || (placeScore(b) ?? 0) - (placeScore(a) ?? 0))
  }, [places, placeCategories, query])

  if (!me || !partner) return null
  const place = places.find((p) => p.id === placeId) ?? null

  const manualSlot = () => {
    const s = new Date(manualStart)
    const e = new Date(s.getTime() + minutes * 60000)
    return { start: s.toISOString(), end: e.toISOString() }
  }

  const manualCheck = (() => {
    const { start, end } = manualSlot()
    const s = new Date(start)
    const e = new Date(end)
    const mine = conflictsIn(myBusy, s, e)
    const theirs = conflictsIn(partnerBusy, s, e)
    return { mine, theirs, free: mine.length === 0 && theirs.length === 0, inPast: s.getTime() < Date.now() }
  })()

  function pickTemplate(id: string) {
    const t = templateById(id)
    setTemplateId(id)
    // Only overwrite copy the user has not touched.
    if (!headline || TEMPLATES.some((x) => x.headline === headline)) setHeadline(t.headline)
    if (!message || TEMPLATES.some((x) => x.message === message)) setMessage(t.message)
  }

  async function onPhoto(file?: File) {
    if (!file) return
    try {
      setPhoto(await fileToDataUrl(file))
    } catch {
      toast('Could not use that image')
    }
  }

  function send() {
    if (!slot) return
    const ev = actions.createDate({
      placeId,
      start: slot.start,
      end: slot.end,
      invitation: { templateId, headline, message, photo },
    })
    toast(`Invitation sent to ${partner!.name} 💌`)
    nav(`/dates/${ev.id}`, { replace: true })
  }

  const canNext = step === 0 ? !!slot : step === 1 ? true : step === 2 ? headline.trim().length > 0 : true

  return (
    <>
      <div className="no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-40 pt-14 sm:pt-16">
      {/* progress */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? nav(-1) : setStep(step - 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm transition active:scale-90"
        >
          ←
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-rose' : 'bg-line'}`} />
              <p className={`mt-1.5 text-[10px] font-bold uppercase ${i === step ? 'text-rose' : 'text-muted'}`}>
                {s}
              </p>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="anim-fade-up">
          <h1 className="text-[26px] font-extrabold leading-tight">When are you both free?</h1>
          <p className="mt-1 text-sm text-plum-soft">
            Compared against your calendar and {partner.name}’s. Only windows where neither of you is
            booked.
          </p>

          <div className="mt-5 space-y-3">
            {suggestions.length === 0 && (
              <Card>
                <p className="text-sm text-plum-soft">
                  No free window in the next two weeks. Pick a time manually below.
                </p>
              </Card>
            )}
            {suggestions.map((s) => {
              const active = slot?.start === s.start
              return (
                <button
                  key={s.start}
                  onClick={() => {
                    setSlot({ start: s.start, end: s.end })
                    setManual(false)
                  }}
                  className={`w-full rounded-card p-4 text-left transition active:scale-[0.98] ${
                    active ? 'bg-plum text-white' : 'bg-white shadow-[0_8px_30px_-18px_rgba(51,32,58,0.35)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${
                        active ? 'bg-white/15' : 'bg-blush'
                      }`}
                    >
                      <span className={`text-[9px] font-bold uppercase ${active ? 'text-white/70' : 'text-rose-dark'}`}>
                        {new Date(s.start).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-extrabold leading-none">
                        {new Date(s.start).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{s.label}</p>
                      <p className={`text-[13px] ${active ? 'text-white/70' : 'text-plum-soft'}`}>
                        {fmtDay(s.start)} · {fmtRange(s.start, s.end)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold ${active ? 'text-white' : 'text-mint'}`}>
                      {active ? '✓' : 'both free'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setManual((m) => !m)}
            className="mt-4 w-full text-center text-sm font-bold text-rose"
          >
            {manual ? 'Hide manual time' : 'Choose another time instead'}
          </button>

          {manual && (
            <Card className="anim-fade-up mt-3">
              <Field label="Starts">
                <Input
                  type="datetime-local"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                />
              </Field>

              <div className="mt-4">
                <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">How long</p>
                <div className="flex items-center gap-3 rounded-2xl bg-cream p-2">
                  <StepButton
                    label="−"
                    disabled={minutes <= 15}
                    onClick={() => setMinutes((m) => Math.max(15, m - 15))}
                  />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-extrabold leading-none">{fmtDuration(minutes)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      ends {fmtTime(manualSlot().end)}
                    </p>
                  </div>
                  <StepButton
                    label="+"
                    disabled={minutes >= 12 * 60}
                    onClick={() => setMinutes((m) => Math.min(12 * 60, m + 15))}
                  />
                </div>
                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                  {[30, 60, 90, 120, 180, 240, 360, 480].map((m) => (
                    <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                      {fmtDuration(m)}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Availability for the exact window they picked ------------- */}
              <div
                className={`mt-4 rounded-2xl px-4 py-3 ${
                  manualCheck.inPast
                    ? 'bg-[#fdf0ee] text-[#c0392b]'
                    : manualCheck.free
                      ? 'bg-[#e4f5ec] text-[#2f7a58]'
                      : 'bg-[#fdf0dc] text-[#a2701f]'
                }`}
              >
                {manualCheck.inPast ? (
                  <p className="text-[13px] font-bold">⛔ That time has already passed.</p>
                ) : manualCheck.free ? (
                  <>
                    <p className="text-[13px] font-bold">✓ Both free</p>
                    <p className="mt-0.5 text-[12px] opacity-80">
                      Nothing on your calendar or {partner.name}’s in this window.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-bold">
                      ⚠️ Clashes with{' '}
                      {manualCheck.mine.length && manualCheck.theirs.length
                        ? 'both calendars'
                        : manualCheck.mine.length
                          ? 'your calendar'
                          : `${partner.name}’s calendar`}
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-[12px] opacity-90">
                      {manualCheck.mine.map((b) => (
                        <li key={b.id}>
                          You · {b.title} ({fmtRange(b.start, b.end)})
                        </li>
                      ))}
                      {manualCheck.theirs.map((b) => (
                        <li key={b.id}>
                          {partner.name} · {b.title} ({fmtRange(b.start, b.end)})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[12px] opacity-80">You can still send it.</p>
                  </>
                )}
              </div>

              <Button
                full
                className="mt-4"
                variant="soft"
                disabled={manualCheck.inPast}
                onClick={() => {
                  setSlot(manualSlot())
                  toast(manualCheck.free ? 'Time selected — both free ✓' : 'Time selected')
                }}
              >
                Use {fmtTime(manualSlot().start)} on {fmtDay(manualSlot().start)}
              </Button>
            </Card>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="anim-fade-up">
          <h1 className="text-[26px] font-extrabold leading-tight">Where to?</h1>
          <p className="mt-1 text-sm text-plum-soft">Search the places you saved together.</p>

          <div className="mt-4">
            <Input
              placeholder="Search your wishlist…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-3 space-y-2">
            {filteredPlaces.map((p) => {
              const score = placeScore(p)
              const active = placeId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPlaceId(active ? null : p.id)}
                  className={`flex w-full items-center gap-3 rounded-card p-3.5 text-left transition active:scale-[0.98] ${
                    active ? 'bg-plum text-white' : 'bg-white'
                  }`}
                >
                  <span className="text-2xl">{p.photo}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">
                      {p.favourite && '⭐️ '}
                      {p.name}
                    </p>
                    <p className={`truncate text-[12px] ${active ? 'text-white/70' : 'text-muted'}`}>
                      {findCategory(placeCategories, p.category).label} · {p.address}
                    </p>
                  </div>
                  {score !== null && (
                    <span className={`shrink-0 text-xs font-bold ${active ? 'text-white' : 'text-amber'}`}>
                      ⭐️ {score.toFixed(1)}
                    </span>
                  )}
                </button>
              )
            })}
            {filteredPlaces.length === 0 && (
              <Card className="text-center">
                <p className="text-sm text-plum-soft">Nothing saved matches “{query}”.</p>
                <Button variant="soft" className="mt-3" onClick={() => nav('/wishlist?add=1')}>
                  Add a place
                </Button>
              </Card>
            )}
          </div>

          <button
            onClick={() => setPlaceId(null)}
            className="mt-4 w-full text-center text-sm font-bold text-plum-soft"
          >
            Decide the place later
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="anim-fade-up">
          <h1 className="text-[26px] font-extrabold leading-tight">Write the invitation</h1>
          <p className="mt-1 text-sm text-plum-soft">Start from a template, then make it yours.</p>

          <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTemplate(t.id)}
                className={`flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition active:scale-95 ${
                  t.id === templateId ? `${t.bg} ${t.ink}` : 'bg-white text-plum-soft'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[11px] font-bold leading-tight">{t.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <Field label="Headline">
              <Input value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} />
            </Field>
            <Field label="Message">
              <Textarea rows={4} value={message} maxLength={280} onChange={(e) => setMessage(e.target.value)} />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-plum-soft">Photo</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              {photo ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <img src={photo} alt="" className="h-36 w-full object-cover" />
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
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-white text-plum-soft transition active:scale-[0.98]"
                >
                  <span className="text-2xl">🖼️</span>
                  <span className="text-[13px] font-bold">Upload a photo</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[13px] font-semibold text-plum-soft">Preview</p>
            {slot && (
              <InvitationCard
                invitation={{ templateId, headline, message, photo }}
                start={slot.start}
                end={slot.end}
                place={place}
                from={me.name}
              />
            )}
          </div>
        </div>
      )}

      {step === 3 && slot && (
        <div className="anim-fade-up">
          <h1 className="text-[26px] font-extrabold leading-tight">Ready to send?</h1>
          <p className="mt-1 text-sm text-plum-soft">
            {partner.name} gets a pop-up and an in-app notification. On accept, it lands in both
            calendars.
          </p>

          <div className="mt-5">
            <InvitationCard
              invitation={{ templateId, headline, message, photo }}
              start={slot.start}
              end={slot.end}
              place={place}
              from={me.name}
            />
          </div>

          <Card className="mt-4">
            <Row label="To" value={`${partner.emoji} ${partner.name}`} />
            <Row label="When" value={`${fmtDay(slot.start)}, ${fmtRange(slot.start, slot.end)}`} />
            <Row label="Where" value={place ? place.name : 'Decide later'} />
            {place && placeScore(place) !== null && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[13px] text-plum-soft">Your rating</span>
                <Stars value={placeScore(place)!} size={14} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone="mint">Both calendars free</Tag>
              {photo && <Tag tone="violet">Custom photo</Tag>}
            </div>
          </Card>
        </div>
      )}

      </div>

      {/* footer — sits outside the scroller so it stays pinned */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-cream via-cream to-transparent px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-6">
        {step < 3 ? (
          <Button size="lg" full disabled={!canNext} onClick={() => setStep(step + 1)}>
            {step === 0 && !slot ? 'Pick a time' : 'Continue'}
          </Button>
        ) : (
          <Button size="lg" full onClick={send}>
            Send invitation 💌
          </Button>
        )}
      </div>
    </>
  )
}

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-plum shadow-sm transition active:scale-90 disabled:opacity-35 disabled:active:scale-100"
    >
      {label}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2.5 last:border-0">
      <span className="text-[13px] text-plum-soft">{label}</span>
      <span className="max-w-[62%] truncate text-right text-[14px] font-bold">{value}</span>
    </div>
  )
}
