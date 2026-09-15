import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import { Avatar, Button, Card, Field, Input, ScreenHeader, useToast } from '../components/ui'
import { relativeTime } from '../lib/date-utils'
import { hasSupabase } from '../lib/config'

export default function LinkPartner() {
  const { me, world, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!me) return <Navigate to="/auth" replace />
  if (me.partnerId) return <Navigate to="/home" replace />

  const incoming = world.pairRequests.filter(
    (p) => p.status === 'pending' && p.toEmail === me.email,
  )
  const outgoing = world.pairRequests.filter(
    (p) => p.status === 'pending' && p.fromUserId === me.id,
  )

  async function send() {
    setError(null)
    setBusy(true)
    try {
      await actions.sendPairRequest(email)
      setEmail('')
      toast('Request sent 💌')
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function respond(id: string, accept: boolean, fromName: string) {
    setError(null)
    setBusy(true)
    try {
      await actions.respondPairRequest(id, accept)
      if (accept) {
        toast(`You and ${fromName} are linked 💕`)
        nav('/onboarding/calendar')
      }
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-10 pt-14 sm:pt-16">
      <ScreenHeader title="Find your person" subtitle="You get exactly one. Choose carefully 💗" />

      <Card className="mb-4 bg-plum text-white">
        <p className="text-[13px] font-bold uppercase tracking-widest text-white/50">
          How matching works
        </p>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-white/90">
          <li className="flex gap-2">
            <span>①</span> One account can be linked to one partner — for good.
          </li>
          <li className="flex gap-2">
            <span>②</span> One email links one Google Calendar and one iPhone calendar.
          </li>
          <li className="flex gap-2">
            <span>③</span> To link with someone else you have to delete your account first.
          </li>
        </ul>
      </Card>

      {incoming.length > 0 && (
        <div className="mb-4 space-y-3">
          {incoming.map((req) => {
            const from = world.users.find((u) => u.id === req.fromUserId)
            if (!from) return null
            return (
              <Card key={req.id} className="border-2 border-rose/30">
                <div className="flex items-center gap-3">
                  <Avatar emoji={from.emoji} color={from.color} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{from.name} wants to link</p>
                    <p className="truncate text-xs text-muted">
                      {from.email} · {relativeTime(req.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button full disabled={busy} onClick={() => void respond(req.id, true, from.name)}>
                    Accept forever
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void respond(req.id, false, from.name)}
                  >
                    Not now
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <Field label="Partner’s email" hint="They receive a link request inside the app.">
          <Input
            type="email"
            inputMode="email"
            placeholder="partner@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {error && (
          <p className="mt-3 rounded-2xl bg-[#fdf0ee] px-4 py-3 text-sm font-medium text-[#c0392b]">
            {error}
          </p>
        )}
        <Button full className="mt-4" disabled={!email.trim() || busy} onClick={() => void send()}>
          {busy ? 'Just a moment…' : 'Send link request'}
        </Button>
      </Card>

      {outgoing.length > 0 && (
        <div className="mt-4 space-y-2">
          {outgoing.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
            >
              <span className="text-lg">⏳</span>
              <span className="min-w-0 flex-1 truncate text-plum-soft">
                Waiting for <b className="text-plum">{p.toEmail}</b>
              </span>
              <span className="text-xs text-muted">{relativeTime(p.createdAt)}</span>
            </div>
          ))}
          {!hasSupabase && (
            <p className="px-1 pt-1 text-xs leading-relaxed text-muted">
              Local mode: sign out, sign in with that email on this device, and the request will be
              waiting.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => nav('/profile')}
        className="mt-6 w-full text-center text-sm font-semibold text-plum-soft underline underline-offset-4"
      >
        Account settings
      </button>
    </div>
  )
}
