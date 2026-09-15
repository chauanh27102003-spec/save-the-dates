import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'

/* --------------------------------------------------------------- Phone frame */

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-0 sm:p-6">
      <div
        id="phone-root"
        className="relative h-[100dvh] w-full overflow-hidden bg-cream sm:h-[860px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-[46px] sm:border-[10px] sm:border-[#1d1520] sm:shadow-[0_40px_90px_-30px_rgba(51,32,58,0.6)]"
      >
        <StatusBar />
        {children}
      </div>
    </div>
  )
}

function StatusBar() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden h-11 items-center justify-between px-7 text-[13px] font-semibold text-plum sm:flex">
      <span>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      <span className="absolute left-1/2 top-1.5 h-7 w-[110px] -translate-x-1/2 rounded-full bg-[#1d1520]" />
      <span className="tracking-tighter">▮▮▮ ⌁</span>
    </div>
  )
}

/* ------------------------------------------------------------------- Screen */

export function Screen({
  children,
  padded = true,
  nav = true,
}: {
  children: ReactNode
  padded?: boolean
  nav?: boolean
}) {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('std-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <>
      <div
        id="std-scroll"
        className={`no-scrollbar absolute inset-0 overflow-y-auto pt-[env(safe-area-inset-top)] sm:pt-11 ${
          nav ? 'pb-32' : 'pb-8'
        } ${padded ? 'px-5' : ''}`}
      >
        <div key={pathname} className="anim-fade-up">
          {children}
        </div>
      </div>
      {nav && <BottomNav />}
    </>
  )
}

/* ---------------------------------------------------------------- Bottom nav */

/**
 * Four tabs, two per side, so the plan button lands exactly on the centre line.
 * Diary moved under Dates and Ranking under Wishlist to get there.
 */
const TABS = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/dates', label: 'Dates', icon: '📅' },
  { to: '/wishlist', label: 'Places', icon: '📍' },
  { to: '/profile', label: 'You', icon: '💗' },
]

function BottomNav() {
  const nav = useNavigate()
  const { partner } = useApp()

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="relative flex items-stretch rounded-[26px] border border-white/70 bg-white/90 px-2 py-2 shadow-[0_18px_40px_-20px_rgba(51,32,58,0.55)] backdrop-blur-xl">
        <div className="flex flex-1 items-stretch">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.to} {...t} />
          ))}
        </div>

        {/* Spacer keeps the two halves equal; the button itself is centred
            absolutely so it cannot drift with different label widths. */}
        <div className="w-16 shrink-0" aria-hidden />
        <button
          onClick={() => nav(partner ? '/plan' : '/link')}
          className="absolute bottom-2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-[18px] items-center justify-center rounded-full bg-rose text-2xl text-white shadow-[0_14px_26px_-8px_rgba(232,99,122,0.95)] transition active:scale-90"
          aria-label="Plan a date"
        >
          ✦
        </button>

        <div className="flex flex-1 items-stretch">
          {TABS.slice(2).map((t) => (
            <Tab key={t.to} {...t} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Tab({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold transition ${
          isActive ? 'text-rose' : 'text-muted'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`text-lg transition ${isActive ? 'scale-110' : 'grayscale opacity-70'}`}>
            {icon}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}
