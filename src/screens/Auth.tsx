import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppError, useApp } from '../lib/store'
import { hasSupabase } from '../lib/config'
import { clearAuthError, readAuthError } from '../lib/auth-error'
import { Button, Field, Input } from '../components/ui'

type Method = 'password' | 'link'

export default function Auth() {
  const { actions, session, me, world, recovery } = useApp()
  const nav = useNavigate()
  const [params] = useSearchParams()

  // A shared invite link carries the address the request was sent to, so the
  // partner does not have to remember which of their emails to use.
  const [email, setEmail] = useState(() => params.get('invite')?.trim().toLowerCase() ?? '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [method, setMethod] = useState<Method>('password')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [emailed, setEmailed] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The magic link lands back here; as soon as the session resolves, move on.
  // A reset link also creates a session, so hold still until the new password
  // has actually been set.
  useEffect(() => {
    if (recovery) return
    if (session && me) nav(me.partnerId ? '/home' : '/link', { replace: true })
  }, [session, me, nav, recovery])

  // A link that failed comes back with the reason in the URL. Say so.
  useEffect(() => {
    const failure = readAuthError()
    if (!failure) return
    setError(failure.message)
    clearAuthError()
  }, [])

  function reset() {
    setError(null)
    setNotice(null)
  }

  async function run(fn: () => Promise<void>, fallback: string) {
    reset()
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof AppError ? e.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  const verify = () =>
    run(async () => {
      if (!emailed) return
      await actions.verifyCode(emailed, code)
    }, 'That code did not work.')

  const known = world.users.find((u) => u.email === email.trim().toLowerCase())
  const isNew = email.includes('@') && !known

  /** Local mode, and the cloud magic-link flow. */
  const submitLink = () =>
    run(async () => {
      const result = await actions.signIn(email, name)
      if (result.emailed) setEmailed(email.trim().toLowerCase())
      else if (result.user) nav(result.user.partnerId ? '/home' : '/link', { replace: true })
    }, 'Something went wrong.')

  const submitPassword = () =>
    run(async () => {
      if (creating) {
        const { confirmNeeded } = await actions.signUpWithPassword(email, password, name)
        if (confirmNeeded) {
          setNotice(
            `Account created. Confirm ${email.trim().toLowerCase()} from the email we just sent, then sign in with your password.`,
          )
          setPassword('')
        }
        return
      }
      await actions.signInWithPassword(email, password)
    }, 'Something went wrong.')

  const forgot = () =>
    run(async () => {
      await actions.sendPasswordReset(email)
      setNotice(`Reset link sent to ${email.trim().toLowerCase()}. Open it to choose a new password.`)
    }, 'Could not send that reset link.')

  const setNewPassword = () =>
    run(async () => {
      await actions.updatePassword(password)
      setPassword('')
    }, 'Could not save that password.')

  const errorBox = error && (
    <p className="rounded-2xl bg-[#fdf0ee] px-4 py-3 text-sm font-medium text-[#c0392b]">{error}</p>
  )
  const noticeBox = notice && (
    <p className="rounded-2xl bg-[#eef7f1] px-4 py-3 text-sm font-medium text-[#2f7d54]">{notice}</p>
  )

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

      {recovery ? (
        <div className="anim-fade-up mt-8 space-y-3 rounded-card bg-white p-5">
          <div className="text-4xl">🔑</div>
          <h2 className="text-lg font-extrabold">Choose a new password</h2>
          <p className="text-[14px] leading-relaxed text-plum-soft">
            You opened a reset link. Set a password now and you can sign in without waiting for an
            email next time.
          </p>
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {errorBox}
          <Button full size="lg" disabled={password.length < 8 || busy} onClick={() => void setNewPassword()}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
        </div>
      ) : emailed ? (
        <div className="anim-fade-up mt-8 rounded-card bg-white p-5 text-center">
          <div className="text-4xl">📬</div>
          <h2 className="mt-3 text-lg font-extrabold">Check your inbox</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-plum-soft">
            We sent a sign-in link to <b className="text-plum">{emailed}</b>. Open it on this device
            and you are in.
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
              reset()
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
      ) : !hasSupabase ? (
        <>
          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submitLink()
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

            {isNew && (
              <div className="anim-fade-up">
                <Field label="Your name" hint="This is what your partner sees on invitations.">
                  <Input placeholder="Linh" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
              </div>
            )}

            {errorBox}

            <Button type="submit" size="lg" full disabled={!email.trim() || busy}>
              {busy ? 'Just a moment…' : 'Continue with email'}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-[#fdf0dc] px-4 py-3 text-[12px] leading-relaxed text-[#a2701f]">
            <b>Local mode.</b> No backend is configured, so accounts and data live only in this
            browser. Fine for trying the interface; two people on two phones will not see each other.
          </div>
        </>
      ) : (
        <>
          <div className="mt-8 flex gap-1 rounded-2xl bg-white p-1">
            {(
              [
                ['password', 'Password'],
                ['link', 'Email link'],
              ] as [Method, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value)
                  reset()
                }}
                className={`h-10 flex-1 rounded-[14px] text-[14px] font-bold transition ${
                  method === value ? 'bg-rose text-white' : 'text-plum-soft active:scale-95'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {method === 'password' ? (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void submitPassword()
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

              {creating && (
                <div className="anim-fade-up">
                  <Field label="Your name" hint="This is what your partner sees on invitations.">
                    <Input placeholder="Linh" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                </div>
              )}

              <Field label="Password" hint={creating ? 'At least 8 characters.' : undefined}>
                <Input
                  type="password"
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {errorBox}
              {noticeBox}

              <Button
                type="submit"
                size="lg"
                full
                disabled={!email.trim() || password.length < (creating ? 8 : 1) || busy}
              >
                {busy ? 'Just a moment…' : creating ? 'Create account' : 'Sign in'}
              </Button>

              <div className="flex items-center justify-between pt-1 text-[13px] font-semibold">
                <button
                  type="button"
                  className="text-plum-soft underline underline-offset-4"
                  onClick={() => {
                    setCreating((c) => !c)
                    reset()
                  }}
                >
                  {creating ? 'I already have an account' : 'Create an account'}
                </button>
                {!creating && (
                  <button
                    type="button"
                    disabled={!email.trim() || busy}
                    className="text-plum-soft underline underline-offset-4 disabled:opacity-40"
                    onClick={() => void forgot()}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submitLink()
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

                <Field
                  label="Your name (first time only)"
                  hint="This is what your partner sees on invitations."
                >
                  <Input placeholder="Linh" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>

                {errorBox}
                {noticeBox}

                <Button type="submit" size="lg" full disabled={!email.trim() || busy}>
                  {busy ? 'Just a moment…' : 'Email me a sign-in link'}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs leading-relaxed text-muted">
                Links and codes come out of a shared mail quota. If it says too many emails have
                gone out, switch to <b>Password</b> — that flow sends nothing.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
