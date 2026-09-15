import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import type { CalendarProvider } from '../lib/types'
import { Button, Card, Field, Input, Modal, ScreenHeader, Tag, useToast } from '../components/ui'

const PROVIDERS: {
  id: CalendarProvider
  name: string
  icon: string
  blurb: string
  permission: string
  scopes: string[]
}[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📆',
    blurb: 'Reads your busy blocks and writes accepted dates back.',
    permission: '“Save the Dates” wants to access your Google Account',
    scopes: [
      'See the events on all your calendars',
      'Add events to your primary calendar',
    ],
  },
  {
    id: 'ios',
    name: 'iPhone Calendar',
    icon: '🍎',
    blurb: 'Uses the calendars already on your device.',
    permission: '“Save the Dates” Would Like to Access Your Calendar',
    scopes: ['Read your events to find free time', 'Add dates you accept'],
  },
]

export default function CalendarConnect({ onboarding = false }: { onboarding?: boolean }) {
  const { me, actions } = useApp()
  const nav = useNavigate()
  const toast = useToast()
  const [asking, setAsking] = useState<CalendarProvider | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [stage, setStage] = useState<'permission' | 'account'>('permission')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!me) return <Navigate to="/auth" replace />

  const current = PROVIDERS.find((p) => p.id === asking)

  function open(id: CalendarProvider) {
    setAsking(id)
    setStage('permission')
    setError(null)
    setAccountEmail(id === 'google' ? '' : me?.email ?? '')
  }

  async function confirm() {
    if (!asking) return
    setBusy(true)
    try {
      await actions.connectCalendar(asking, accountEmail)
      toast('Calendar connected ✅')
      setAsking(null)
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Could not connect.')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect(id: CalendarProvider) {
    setBusy(true)
    try {
      await actions.disconnectCalendar(id)
      toast('Calendar disconnected')
    } catch (e) {
      toast(e instanceof AppError ? e.message : 'Could not disconnect.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-10 pt-14 sm:pt-16">
      <ScreenHeader
        title="Connect a calendar"
        subtitle="We only read free/busy — never the event details of your partner."
        back={!onboarding}
      />

      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const link = me.calendars.find((c) => c.provider === p.id)
          return (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold">{p.name}</h3>
                    {link && <Tag tone="mint">Linked</Tag>}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-plum-soft">
                    {link ? link.accountEmail : p.blurb}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {link ? (
                  <Button variant="outline" full disabled={busy} onClick={() => void disconnect(p.id)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button full variant="soft" disabled={busy} onClick={() => open(p.id)}>
                    Connect {p.name}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4 bg-lilac">
        <p className="text-[13px] font-bold uppercase tracking-widest text-violet">
          Why only one account
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-plum">
          A calendar account can belong to exactly one Save the Dates account. If the calendar is
          already linked somewhere else, connecting here fails — so a second, parallel date life
          cannot be planned from the same calendar.
        </p>
      </Card>

      {onboarding && (
        <div className="mt-6 space-y-2">
          <Button size="lg" full disabled={!me.calendars.length} onClick={() => nav('/home', { replace: true })}>
            Continue
          </Button>
          <Button variant="ghost" full onClick={() => nav('/home', { replace: true })}>
            Skip for now
          </Button>
        </div>
      )}

      <Modal open={!!asking} onClose={() => setAsking(null)}>
        {current && stage === 'permission' && (
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-3xl">
              {current.icon}
            </div>
            <h3 className="text-[17px] font-extrabold leading-snug">{current.permission}</h3>
            <ul className="mx-auto mt-4 max-w-[280px] space-y-2 text-left text-[13px] text-plum-soft">
              {current.scopes.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-mint">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <Button full onClick={() => setStage('account')}>
                Allow
              </Button>
              <Button variant="ghost" full onClick={() => setAsking(null)}>
                Don’t allow
              </Button>
            </div>
          </div>
        )}

        {current && stage === 'account' && (
          <div className="p-6">
            <h3 className="text-lg font-extrabold">Choose an account</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-plum-soft">
              This account is bound to <b>{me.email}</b> and cannot be reused on another Save the
              Dates account.
            </p>
            <div className="mt-4">
              <Field label={current.id === 'google' ? 'Google account' : 'iCloud account'}>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder={current.id === 'google' ? 'you@gmail.com' : 'you@icloud.com'}
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                />
              </Field>
            </div>
            {error && (
              <p className="mt-3 rounded-2xl bg-[#fdf0ee] px-4 py-3 text-sm font-medium text-[#c0392b]">
                {error}
              </p>
            )}
            <div className="mt-5 space-y-2">
              <Button full disabled={!accountEmail.trim() || busy} onClick={() => void confirm()}>
                {busy ? 'Linking…' : 'Link this calendar'}
              </Button>
              <Button variant="ghost" full onClick={() => setAsking(null)}>
                Cancel
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              If this calendar is already linked to another Save the Dates account, linking here
              will fail.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
