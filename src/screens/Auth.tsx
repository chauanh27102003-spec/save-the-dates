import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import { hasSupabase } from '../lib/config'
import { clearAuthError, readAuthError } from '../lib/auth-error'
import { Button, Field, Input } from '../components/ui'

export default function Auth() {
  const { actions, session, me, world } = useApp()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [emailed, setEmailed] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // The magic link lands back here; as soon as the session resolves, move on.
  useEffect(() => {
    if (session && me) nav(me.partnerId ? '/home' : '/link', { replace: true })
  }, [session, me, nav])

  // A link that failed comes back with the reason in the URL. Say so.
  useEffect(() => {
    const failure = readAuthError()
    if (!failure) return
    setError(failure.message)
    clearAuthError()
  }, [])

  async function verify() {
    if (!emailed) return
    setError(null)
    setBusy(true)
    try {
      await actions.verifyCode(emailed, code)
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'That code did not work.')
    } finally {
      setBusy(false)
    }
  }

  const known = world.users.find((u) => u.email === email.trim().toLowerCase())
  const isNew = email.includes('@') && !known

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      const result = await actions.signIn(email, name)
      if (result.emailed) setEmailed(email.trim().toLowerCase())
      else if (result.user) nav(result.user.partnerId ? '/home' : '/link', { replace: true })
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-scrollbar absolute inset-0 flex flex-col overflow-y-auto px-6 pb-10 pt-16 sm:pt-20">
      <div className="anim-fade-up">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-rose text-3xl shadow-[0_16px_30px_-14px_rgba(232,99,122,0.9)]">
          💕
        </div>
        <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-tight">
          Save
          <br />
          the Dates
        </h1>
        <p className="mt-3 max-w-[290px] text-[15px] leading-relaxed text-plum-soft">
          One account, one person. Plan your dates around the calendars you both actually keep.
        </p>
      </div>

      {emailed ? (
        <div className="anim-fade-up mt-8 rounded-card bg-white p-5 text-center">
          <div className="text-4xl">📬</div>
          <h2 className="mt-3 text-lg font-extrabold">Check your inbox</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-plum-soft">
            We sent a sign-in link to <b className="text-plum">{emailed}</b>. Open it on this device
            and you are in — no password to remember.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            The link only works in this browser and only once.
          </p>

          <div className="mt-5 border-t border-line pt-4 text-left">
            <p className="text-[13px] font-semibold text-plum-soft">
              Link not working? Enter the 6-digit code from the same email.
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={8}
                className="text-center tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button disabled={code.replace(/\D/g, '').length < 6 || busy} onClick={() => void verify()}>
                Verify
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-[#fdf0ee] px-4 py-3 text-left text-sm font-medium text-[#c0392b]">
              {error}
            </p>
          )}

          <Button
            variant="ghost"
            full
            className="mt-3"
            disabled={busy}
            onClick={() => {
              setEmailed(null)
              setError(null)
              setCode('')
            }}
          >
            Use a different email
          </Button>
        </div>
      ) : session ? (
        <div className="mt-8 rounded-card bg-white p-5">
          <p className="text-sm text-plum-soft">
            This device is already signed in. Save the Dates allows one account per device — sign out
            from the profile tab to switch.
          </p>
          <Button full className="mt-4" onClick={() => nav('/home', { replace: true })}>
            Continue
          </Button>
        </div>
      ) : (
        <>
          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <Field label="Email">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            {(hasSupabase || isNew) && (
              <div className="anim-fade-up">
                <Field
                  label={hasSupabase ? 'Your name (first time only)' : 'Your name'}
                  hint="This is what your partner sees on invitations."
                >
                  <Input placeholder="Linh" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
              </div>
            )}

            {error && (
              <p className="rounded-2xl bg-[#fdf0ee] px-4 py-3 text-sm font-medium text-[#c0392b]">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" full disabled={!email.trim() || busy}>
              {busy ? 'Just a moment…' : hasSupabase ? 'Email me a sign-in link' : 'Continue with email'}
            </Button>
          </form>

          {hasSupabase ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-muted">
              No passwords. We email you a link that signs you in on this device.
            </p>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#fdf0dc] px-4 py-3 text-[12px] leading-relaxed text-[#a2701f]">
              <b>Local mode.</b> No backend is configured, so accounts and data live only in this
              browser. Fine for trying the interface; two people on two phones will not see each
              other.
            </div>
          )}
        </>
      )}
    </div>
  )
}
