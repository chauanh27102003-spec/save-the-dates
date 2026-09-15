import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import { Screen } from '../components/Shell'
import {
  Avatar,
  Button,
  Card,
  Divider,
  Field,
  Input,
  Modal,
  ScreenHeader,
  Tag,
  useToast,
} from '../components/ui'
import { ReportSheet, screenName } from '../components/ReportSheet'
import { APP_VERSION, hasSupabase } from '../lib/config'
import { fmtLongDay, relativeTime } from '../lib/date-utils'

export default function Profile() {
  const { me, partner, couple, session, places, dates, reviews, myFeedback, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [typed, setTyped] = useState('')
  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  async function savePassword() {
    setPwError(null)
    setPwBusy(true)
    try {
      await actions.updatePassword(pw)
      setPw('')
      toast('Password saved 🔑')
    } catch (e) {
      setPwError(e instanceof AppError ? e.message : 'Could not save that password.')
    } finally {
      setPwBusy(false)
    }
  }

  if (!me) return null

  return (
    <Screen>
      <div className="pt-4">
        <ScreenHeader title="You" />
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar emoji={me.emoji} color={me.color} size={62} />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold">{me.name}</p>
            <p className="truncate text-[13px] text-muted">{me.email}</p>
          </div>
        </div>
        {session && (
          <p className="mt-4 rounded-2xl bg-cream px-3.5 py-2.5 text-[12px] leading-relaxed text-plum-soft">
            📱 Signed in on this device {relativeTime(session.signedInAt)}. One device holds one
            account — sign out to use a different one.
          </p>
        )}
      </Card>

      {/* Partner ------------------------------------------------------------ */}
      <h2 className="mb-3 mt-7 text-[17px] font-extrabold">Your person</h2>
      {partner && couple ? (
        <Card>
          <div className="flex items-center gap-3">
            <Avatar emoji={partner.emoji} color={partner.color} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{partner.name}</p>
              <p className="truncate text-[12px] text-muted">{partner.email}</p>
            </div>
            <Tag tone="rose">Linked</Tag>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat value={places.length} label="places" />
            <Stat value={dates.filter((d) => d.status === 'completed').length} label="dates" />
            <Stat value={reviews.length} label="entries" />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Together since {fmtLongDay(couple.since)}. A link is permanent — the only way out is
            deleting your account, and that clears the shared wishlist and diary for both of you.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-plum-soft">
            You are not linked to anyone yet. One account can be linked to exactly one person.
          </p>
          <Button full className="mt-4" onClick={() => nav('/link')}>
            Find your person
          </Button>
        </Card>
      )}

      {/* Calendars ---------------------------------------------------------- */}
      <h2 className="mb-3 mt-7 text-[17px] font-extrabold">Calendars</h2>
      <Card>
        {me.calendars.length === 0 ? (
          <p className="text-sm text-plum-soft">
            No calendar linked. Without one we cannot suggest times you are both free.
          </p>
        ) : (
          <div className="space-y-3">
            {me.calendars.map((c) => (
              <div key={c.provider} className="flex items-center gap-3">
                <span className="text-2xl">{c.provider === 'google' ? '📆' : '🍎'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">
                    {c.provider === 'google' ? 'Google Calendar' : 'iPhone Calendar'}
                  </p>
                  <p className="truncate text-[12px] text-muted">{c.accountEmail}</p>
                </div>
                <Tag tone="mint">Bound</Tag>
              </div>
            ))}
          </div>
        )}
        <Button variant="soft" full className="mt-4" onClick={() => nav('/calendar')}>
          Manage calendars
        </Button>
      </Card>

      {/* Password ----------------------------------------------------------- */}
      {hasSupabase && (
        <>
          <h2 className="mb-3 mt-7 text-[17px] font-extrabold">Password</h2>
          <Card>
            <p className="text-[13px] leading-relaxed text-plum-soft">
              Set one and you can sign in without waiting for an email. Sign-in links and codes
              share a sending quota; a password does not.
            </p>
            <div className="mt-4">
              <Field label="New password" hint="At least 8 characters.">
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
              </Field>
            </div>
            {pwError && (
              <p className="mt-3 rounded-2xl bg-[#fdf0ee] px-4 py-3 text-sm font-medium text-[#c0392b]">
                {pwError}
              </p>
            )}
            <Button
              full
              className="mt-4"
              disabled={pw.length < 8 || pwBusy}
              onClick={() => void savePassword()}
            >
              {pwBusy ? 'Saving…' : 'Save password'}
            </Button>
          </Card>
        </>
      )}

      {/* Feedback ----------------------------------------------------------- */}
      <Divider label="Help us fix it" />
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl">🐞</span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Something not working?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-plum-soft">
              Send a report with the screen you were on and what went wrong.
            </p>
          </div>
        </div>
        <Button full className="mt-4" onClick={() => setReporting(true)}>
          Report a problem
        </Button>

        {myFeedback.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-[13px] font-semibold text-plum-soft">
              Your reports ({myFeedback.length})
            </p>
            <div className="space-y-2">
              {myFeedback.slice(0, 4).map((f) => (
                <div key={f.id} className="flex items-start gap-2 rounded-2xl bg-cream p-3">
                  <span>{f.kind === 'bug' ? '🐞' : f.kind === 'idea' ? '💡' : '💬'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug">{f.message}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {screenName(f.screen)} · {relativeTime(f.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await actions.removeFeedback(f.id)
                        toast('Report removed')
                      } catch {
                        toast('Could not remove that report')
                      }
                    }}
                    className="shrink-0 text-xs text-muted transition active:scale-90"
                    aria-label="Remove report"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Account ------------------------------------------------------------ */}
      <Divider label="Account" />
      <div className="space-y-2">
        <Button
          variant="outline"
          full
          onClick={async () => {
            await actions.signOut()
            nav('/auth', { replace: true })
          }}
        >
          Sign out of this device
        </Button>
        <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
          Delete my account
        </Button>
      </div>

      <Divider label="About this build" />
      <Card className="bg-lilac">
        <p className="text-[13px] leading-relaxed text-plum">
          {hasSupabase
            ? 'Your account and shared data are stored on the server. Calendars and map search are still simulated in this build.'
            : 'Local mode — everything lives in this browser only, and calendars, email and maps are simulated. Nothing is shared with another device.'}
        </p>
        {!hasSupabase && (
          <Button
            variant="danger"
            full
            className="mt-4"
            onClick={() => {
              actions.wipeLocalData()
              toast('Local data cleared')
              nav('/auth', { replace: true })
            }}
          >
            Clear all data in this browser
          </Button>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-muted">
        Save the Dates · v{APP_VERSION} · {hasSupabase ? 'cloud' : 'local'}
      </p>

      <ReportSheet open={reporting} onClose={() => setReporting(false)} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="p-6">
          <h3 className="text-lg font-extrabold">Delete your account?</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-plum-soft">
            This unlinks you from {partner?.name ?? 'your partner'}, frees your calendar accounts,
            and permanently deletes the shared wishlist, dates and diary. Type <b>DELETE</b> to
            confirm.
          </p>
          <div className="mt-4">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
          </div>
          <div className="mt-5 space-y-2">
            <Button
              variant="danger"
              full
              disabled={typed !== 'DELETE'}
              onClick={async () => {
                try {
                  await actions.deleteAccount()
                  nav('/auth', { replace: true })
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Could not delete the account.')
                }
              }}
            >
              Delete permanently
            </Button>
            <Button variant="ghost" full onClick={() => setConfirmDelete(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      </Modal>
    </Screen>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-cream py-3">
      <p className="text-xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}
