import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store'
import { recordRoute } from './lib/trail'
import { PhoneFrame } from './components/Shell'
import { ToastHost } from './components/ui'
import { NotificationPopup } from './components/NotificationPopup'
import Auth from './screens/Auth'
import LinkPartner from './screens/LinkPartner'
import CalendarConnect from './screens/CalendarConnect'
import Home from './screens/Home'
import Dates from './screens/Dates'
import DateDetail from './screens/DateDetail'
import PlanDate from './screens/PlanDate'
import Wishlist from './screens/Wishlist'
import PlaceDetail from './screens/PlaceDetail'
import Review from './screens/Review'
import Milestones from './screens/Milestones'
import Notifications from './screens/Notifications'
import Profile from './screens/Profile'

/** Remembers where the user has been so a bug report can point at it. */
function RouteRecorder() {
  const { pathname } = useLocation()
  useEffect(() => recordRoute(pathname), [pathname])
  return null
}

/** Requires a signed-in account. */
function RequireAuth() {
  const { me } = useApp()
  if (!me) return <Navigate to="/auth" replace />
  return (
    <>
      <Outlet />
      <NotificationPopup />
    </>
  )
}

/** Cloud mode has to fetch before it can render anything truthful. */
function Splash() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <span className="anim-beat text-5xl">💕</span>
      <p className="text-sm font-semibold text-plum-soft">Loading your dates…</p>
    </div>
  )
}

/** A failed background save must never look like a successful one. */
function SyncBanner() {
  const { syncError } = useApp()
  if (!syncError) return null
  return (
    <div className="absolute inset-x-4 top-12 z-[90] rounded-2xl bg-[#c0392b] px-4 py-3 text-[13px] font-semibold text-white shadow-xl sm:top-14">
      Not saved: {syncError}
    </div>
  )
}

/** Requires a linked partner — most of the app is meaningless without one. */
function RequirePartner() {
  const { partner } = useApp()
  if (!partner) return <Navigate to="/link" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AppProvider>
      <PhoneFrame>
        <ToastHost>
          <Shell />
        </ToastHost>
      </PhoneFrame>
    </AppProvider>
  )
}

function Shell() {
  const { status } = useApp()
  if (status === 'loading') return <Splash />

  return (
    <>
      <RouteRecorder />
      <SyncBanner />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireAuth />}>
          <Route path="/link" element={<LinkPartner />} />
          <Route path="/calendar" element={<CalendarConnect />} />
          <Route path="/onboarding/calendar" element={<CalendarConnect onboarding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route element={<RequirePartner />}>
            <Route path="/home" element={<Home />} />
            <Route path="/dates" element={<Dates />} />
            <Route path="/dates/:id" element={<DateDetail />} />
            <Route path="/plan" element={<PlanDate />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/wishlist/:id" element={<PlaceDetail />} />
            <Route path="/review/:dateId" element={<Review />} />
            {/* The diary moved under Dates when the nav dropped to four tabs. */}
            <Route path="/memories" element={<Navigate to="/dates?view=diary" replace />} />
            <Route path="/milestones" element={<Milestones />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  )
}
