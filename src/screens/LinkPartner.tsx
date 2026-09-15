import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import { Avatar, Button, Card, Field, Input, ScreenHeader, useToast } from '../components/ui'
import { relativeTime } from '../lib/date-utils'
import { hasSupabase } from '../lib/config'

const PALETTE = ['#e8637a', '#8b6bd9', '#4fb286', '#e9a23b', '#5aa9e6']
const EMOJIS = ['🌷', '🍀', '🌙', '⭐️', '🔥']

/**
 * Until the two of you are linked, the database will not let you read the
 * other person's profile row — so there is no avatar to load. Derive a stable
 * one from the address instead of showing a blank.
 */
function faceFor(email: string) {
  let h = 0
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0
  return { emoji: EMOJIS[h % EMOJIS.length], color: PALETTE[h % PALETTE.length] }
}

export default function LinkPartner() {
  const { me, world, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!me) return <Navigate to="/auth" replace />
  if (me.partnerId) return <Navigate to="/home" replace />

  const myEmail = me.email.trim().toLowerCase()
  const incoming = world.pairRequests.filter(
    (p) => p.status === 'pending' && p.toEmail.trim().toLowerCase() === myEmail,
  )
  const outgoing = world.pairRequests.filter(
    (p) => p.status === 'pending' && p.fromUserId === me.id,
  )

  async function send() {
    setError(null)
    setBusy(true)
    try {
      const clean = email.trim().toLowerCase()
      await actions.sendPairRequest(email)
      setEmail('')
      toast('Request sent 💌')
      void shareInvite(clean)
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Nothing emails the partner for us, so the request sits unseen until they
   * next open the app. Hand the sender something they can actually send.
   */
  async function shareInvite(toEmail: string) {
    if (!me) return
    const url = `${window.location.origin}/auth?invite=${encodeURIComponent(toEmail)}`
    const text = `${me.name} wants to plan dates with you on Save the Dates. Sign in with ${toEmail} and the request will be waiting: ${url}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Save the Dates', text })
        return
      } catch {
        /* dismissed the share sheet — fall back to the clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast('Invite copied — send it to them 📋')
    } catch {
      toast('Could not copy the invite')
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
            // In local mode the sender is in this browser's world; in cloud
            // mode they are not, so fall back to what the request carries.
            const known = world.users.find((u) => u.id === req.fromUserId)
            const fromEmail = known?.email ?? req.fromEmail
            const fromName = known?.name || req.fromName || fromEmail.split('@')[0]
            const face = known ?? faceFor(fromEmail)
            return (
              <Card key={req.id} className="border-2 border-rose/30">
                <div className="flex items-center gap-3">
                  <Avatar emoji={face.emoji} color={face.color} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{fromName} wants to link</p>
                    <p className="truncate text-xs text-muted">
                      {fromEmail} · {relativeTime(req.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button full disabled={busy} onClick={() => void respond(req.id, true, fromName)}>
                    Accept forever
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void respond(req.id, false, fromName)}
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
        <Field
          label="Partner’s email"
          hint="The request waits for them inside the app — nothing emails them, so send the invite yourself."
        >
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
            <div key={p.id} className="rounded-2xl bg-white px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">⏳</span>
                <span className="min-w-0 flex-1 truncate text-plum-soft">
                  Waiting for <b className="text-plum">{p.toEmail}</b>
                </span>
                <span className="text-xs text-muted">{relativeTime(p.createdAt)}</span>
              </div>
              <Button
                variant="soft"
                full
                size="sm"
                className="mt-3"
                onClick={() => void shareInvite(p.toEmail)}
              >
                Share the invite
              </Button>
            </div>
          ))}
          <p className="px-1 pt-1 text-xs leading-relaxed text-muted">
            {hasSupabase
              ? 'They will see the request the moment they sign in with that address — but only if they know to look. Share the invite so they do.'
              : 'Local mode: sign out, sign in with that email on this device, and the request will be waiting.'}
          </p>
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
