import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppNotification,
  BusySlot,
  CalendarProvider,
  Couple,
  CustomCategory,
  DateEvent,
  FeedbackKind,
  FeedbackReport,
  Invitation,
  Milestone,
  Place,
  PlaceCategory,
  Review,
  Session,
  User,
  World,
} from './types'
import { emptyWorld } from './world'
import { generateBusy } from './calendar'
import { daysBetween, nextOccurrence } from './date-utils'
import {
  BUILTIN_MILESTONE_KINDS,
  BUILTIN_PLACE_CATEGORIES,
  type CategoryOption,
} from './categories'
import { APP_VERSION, hasSupabase } from './config'
import { authMessage } from './auth-error'
import * as cloud from './cloud'

const WORLD_KEY = 'std.world.v1'
const SESSION_KEY = 'std.session.v1'

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

function loadWorld(): World {
  try {
    const raw = localStorage.getItem(WORLD_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as World
      // Worlds saved by an older build can be missing newer collections.
      return { ...saved, categories: saved.categories ?? [], feedback: saved.feedback ?? [] }
    }
  } catch {
    /* corrupted store — start over rather than trap the user */
  }
  const fresh = emptyWorld()
  localStorage.setItem(WORLD_KEY, JSON.stringify(fresh))
  return fresh
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export class AppError extends Error {}

/** Rolls the world forward: past dates become completed, milestones fire reminders. */
function applyTime(w: World): World {
  const now = Date.now()
  let changed = false
  const next: World = { ...w }

  next.dates = w.dates.map((d) => {
    if (d.status === 'accepted' && new Date(d.end).getTime() < now) {
      changed = true
      return { ...d, status: 'completed' as const }
    }
    return d
  })

  const extra: AppNotification[] = []
  for (const m of w.milestones) {
    const when = nextOccurrence(m.date, m.yearly)
    const away = daysBetween(new Date(), when)
    if (away < 0 || away > m.remindDaysBefore) continue
    const couple = w.couples.find((c) => c.id === m.coupleId)
    if (!couple) continue
    const tag = `${m.id}@${when.toISOString().slice(0, 10)}`
    for (const userId of couple.memberIds) {
      const already = w.notifications.some((n) => n.kind === 'milestone' && n.refId === tag && n.userId === userId)
      if (already) continue
      extra.push({
        id: uid('no'),
        userId,
        kind: 'milestone',
        title: away === 0 ? `Today: ${m.title} 🎉` : `${m.title} in ${away} day${away === 1 ? '' : 's'}`,
        body:
          away === 0
            ? 'It is the day. Do something about it.'
            : 'Plenty of time to plan something good. Want to send an invitation?',
        refId: tag,
        read: false,
        popup: false,
        createdAt: new Date().toISOString(),
      })
    }
  }
  if (extra.length) {
    next.notifications = [...extra, ...w.notifications]
    changed = true
  }

  return changed ? next : w
}

interface Ctx {
  world: World
  session: Session | null
  me: User | null
  partner: User | null
  couple: Couple | null
  /** Places, dates, milestones scoped to the signed-in couple. */
  places: Place[]
  dates: DateEvent[]
  milestones: Milestone[]
  reviews: Review[]
  notifications: AppNotification[]
  unread: number
  popup: AppNotification | null
  myBusy: BusySlot[]
  partnerBusy: BusySlot[]
  /** Built-in categories plus the ones this couple added. */
  placeCategories: CategoryOption[]
  milestoneKinds: CategoryOption[]
  myFeedback: FeedbackReport[]
  /** 'loading' while the cloud snapshot is still on its way. */
  status: 'loading' | 'ready'
  /** True between opening a password-reset link and setting the new password. */
  recovery: boolean
  /** Set when a background save failed, so the UI can stop pretending. */
  syncError: string | null
  cloud: boolean
  actions: Actions
}

interface Actions {
  /**
   * Local mode signs in immediately. Cloud mode emails a link and resolves
   * with `emailed: true` — the session arrives when the user opens it.
   */
  signIn(email: string, name?: string): Promise<{ emailed: boolean; user: User | null }>
  /** Finish sign-in with the 6-digit code from the email. */
  verifyCode(email: string, code: string): Promise<void>
  /**
   * Sign in with a password — no email, so it is not subject to the mail
   * quota that limits the link and code flows. Cloud mode only.
   */
  signInWithPassword(email: string, password: string): Promise<void>
  /**
   * Create an account with a password. `confirmNeeded` is true when the
   * project still has "Confirm email" switched on, in which case Supabase
   * withholds the session until the address is verified.
   */
  signUpWithPassword(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ confirmNeeded: boolean }>
  /** Email a reset link for a forgotten password. */
  sendPasswordReset(email: string): Promise<void>
  /** Set a first password, or change the current one. Requires a session. */
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
  sendPairRequest(email: string): Promise<void>
  respondPairRequest(id: string, accept: boolean): Promise<void>
  connectCalendar(provider: CalendarProvider, accountEmail: string): Promise<void>
  disconnectCalendar(provider: CalendarProvider): Promise<void>
  addPlace(input: {
    name: string
    address: string
    category: PlaceCategory
    priceLevel: 1 | 2 | 3
    photo: string
    mapsUrl: string
    note?: string
  }): Place
  addNote(placeId: string, text: string): void
  toggleFavourite(placeId: string): void
  setPlaceCategory(placeId: string, category: PlaceCategory): void
  ratePlace(placeId: string, stars: number, dateEventId?: string | null): void
  removePlace(placeId: string): void
  createDate(input: {
    placeId: string | null
    start: string
    end: string
    invitation: Invitation
  }): DateEvent
  respondToDate(dateId: string, accept: boolean, message: string, provider: CalendarProvider | null): void
  cancelDate(dateId: string): void
  addReview(input: { dateEventId: string; placeStars: number; feeling: string; photo: string | null }): void
  addMilestone(input: Omit<Milestone, 'id' | 'coupleId' | 'createdBy'>): void
  removeMilestone(id: string): void
  addCategory(input: { scope: 'place' | 'milestone'; label: string; emoji: string }): string
  removeCategory(id: string): void
  submitFeedback(input: {
    kind: FeedbackKind
    message: string
    screen: string
  }): Promise<FeedbackReport>
  removeFeedback(id: string): Promise<void>
  markRead(id: string): void
  markAllRead(): void
  dismissPopup(id: string): void
  wipeLocalData(): void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [world, setWorldState] = useState<World>(() =>
    hasSupabase ? emptyWorld() : applyTime(loadWorld()),
  )
  const [session, setSessionState] = useState<Session | null>(() =>
    hasSupabase ? null : loadSession(),
  )
  const [status, setStatus] = useState<'loading' | 'ready'>(hasSupabase ? 'loading' : 'ready')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(false)

  // Cloud bookkeeping. Refs, not state: the flusher needs the latest values
  // without re-running on every keystroke.
  const worldRef = useRef(world)
  worldRef.current = world
  const spaceId = useRef<string | null>(null)
  const spaceVersion = useRef(0)
  const meId = useRef<string | null>(null)
  const pending = useRef<((w: World) => World)[]>([])
  const saving = useRef(false)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (hasSupabase) return
    localStorage.setItem(WORLD_KEY, JSON.stringify(world))
  }, [world])

  useEffect(() => {
    if (hasSupabase) return
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session])

  /**
   * Pull a fresh snapshot and replay anything we have not managed to save yet,
   * so a refresh never silently discards a local edit. The profile row is
   * created by a trigger, so it can trail the auth session on first sign-in.
   */
  const refresh = useCallback(async (me: string, tries = 4) => {
    meId.current = me
    for (let i = 0; i < tries; i++) {
      const snap = await cloud.loadWorld(me)
      if (snap.world.users.length === 0 && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 400))
        continue
      }

      spaceId.current = snap.spaceId
      spaceVersion.current = snap.spaceVersion

      let next = snap.world
      for (const fn of pending.current) next = fn(next)

      const rolled = applyTime(next)
      if (rolled !== next && snap.spaceId) {
        pending.current.push(applyTime)
        scheduleFlush()
      }

      setWorldState(rolled)
      worldRef.current = rolled
      return rolled
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flush = useCallback(async () => {
    if (!hasSupabase || saving.current) return
    if (!spaceId.current || pending.current.length === 0) {
      pending.current = []
      return
    }
    const me = meId.current
    if (!me) return

    saving.current = true
    const queued = pending.current.length
    try {
      let doc = cloud.toDoc(worldRef.current)
      for (let attempt = 0; ; attempt++) {
        try {
          spaceVersion.current = await cloud.saveSpace(
            spaceId.current,
            spaceVersion.current,
            doc,
          )
          pending.current.splice(0, queued)
          setSyncError(null)
          break
        } catch (e) {
          if (!(e instanceof cloud.ConflictError) || attempt >= 2) throw e
          // The partner saved first. Take their version, replay our queued
          // changes on top of it, and try again.
          const snap = await cloud.loadWorld(me)
          let replayed = snap.world
          for (const fn of pending.current) replayed = fn(replayed)
          spaceVersion.current = snap.spaceVersion
          setWorldState(replayed)
          worldRef.current = replayed
          doc = cloud.toDoc(replayed)
        }
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Could not save your changes.')
    } finally {
      saving.current = false
      if (pending.current.length) scheduleFlush()
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => void flush(), 350)
  }, [flush])

  const update = useCallback(
    (fn: (w: World) => World) => {
      setWorldState((w) => fn(w))
      if (hasSupabase) {
        pending.current.push(fn)
        scheduleFlush()
      }
    },
    [scheduleFlush],
  )

  // Follow the Supabase auth session and load the matching snapshot.
  useEffect(() => {
    if (!hasSupabase || !cloud.sb) return
    let alive = true

    const apply = async (userId: string | null) => {
      if (!alive) return
      if (!userId) {
        pending.current = []
        spaceId.current = null
        meId.current = null
        setSessionState(null)
        setWorldState(emptyWorld())
        setStatus('ready')
        return
      }
      setSessionState({ userId, signedInAt: new Date().toISOString() })
      try {
        await refresh(userId)
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : 'Could not reach the server.')
      }
      if (alive) setStatus('ready')
    }

    cloud.sb.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null))
    const { data: sub } = cloud.sb.auth.onAuthStateChange((event, s) => {
      // A reset link signs the user in, which would otherwise drop them
      // straight into the app without ever setting the new password.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
      return apply(s?.user.id ?? null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [refresh])

  // Live updates from the partner's device.
  useEffect(() => {
    if (!hasSupabase || !session) return
    const email = worldRef.current.users[0]?.email ?? ''
    return cloud.subscribe(spaceId.current, email, () => {
      if (saving.current || pending.current.length) return
      void refresh(session.userId, 1)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, world.couples.length, refresh])

  const me = useMemo(
    () => (session ? world.users.find((u) => u.id === session.userId) ?? null : null),
    [world.users, session],
  )
  const partner = useMemo(
    () => (me?.partnerId ? world.users.find((u) => u.id === me.partnerId) ?? null : null),
    [world.users, me],
  )
  const couple = useMemo(
    () => (me?.coupleId ? world.couples.find((c) => c.id === me.coupleId) ?? null : null),
    [world.couples, me],
  )

  const places = useMemo(
    () => (couple ? world.places.filter((p) => p.coupleId === couple.id) : []),
    [world.places, couple],
  )
  const dates = useMemo(
    () =>
      couple
        ? world.dates
            .filter((d) => d.coupleId === couple.id)
            .sort((a, b) => +new Date(a.start) - +new Date(b.start))
        : [],
    [world.dates, couple],
  )
  const milestones = useMemo(
    () => (couple ? world.milestones.filter((m) => m.coupleId === couple.id) : []),
    [world.milestones, couple],
  )
  const reviews = useMemo(
    () => (couple ? world.reviews.filter((r) => r.coupleId === couple.id) : []),
    [world.reviews, couple],
  )
  const notifications = useMemo(
    () =>
      me
        ? world.notifications
            .filter((n) => n.userId === me.id)
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        : [],
    [world.notifications, me],
  )
  const popup = useMemo(() => notifications.find((n) => n.popup && !n.read) ?? null, [notifications])
  const unread = notifications.filter((n) => !n.read).length

  const myBusy = useMemo(
    () => (me ? world.busy.filter((b) => b.userId === me.id) : []),
    [world.busy, me],
  )
  const partnerBusy = useMemo(
    () => (partner ? world.busy.filter((b) => b.userId === partner.id) : []),
    [world.busy, partner],
  )

  const myFeedback = useMemo(
    () =>
      me
        ? world.feedback
            .filter((f) => f.userId === me.id)
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        : [],
    [world.feedback, me],
  )

  const customFor = (scope: 'place' | 'milestone'): CategoryOption[] =>
    couple
      ? world.categories
          .filter((c) => c.coupleId === couple.id && c.scope === scope)
          .map((c) => ({ id: c.id, label: c.label, emoji: c.emoji, custom: true }))
      : []

  const placeCategories = useMemo(
    () => [...BUILTIN_PLACE_CATEGORIES, ...customFor('place')],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world.categories, couple],
  )
  const milestoneKinds = useMemo(
    () => [...BUILTIN_MILESTONE_KINDS, ...customFor('milestone')],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world.categories, couple],
  )

  const notify = (
    w: World,
    n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { read?: boolean },
  ): World => ({
    ...w,
    notifications: [
      { id: uid('no'), createdAt: new Date().toISOString(), read: false, ...n },
      ...w.notifications,
    ],
  })

  const actions: Actions = {
    async signIn(email, name) {
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new AppError('That email does not look right.')
      if (session) throw new AppError('This device is already signed in. Sign out first.')

      if (hasSupabase && cloud.sb) {
        const { error } = await cloud.sb.auth.signInWithOtp({
          email: clean,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: name?.trim() ? { name: name.trim() } : undefined,
          },
        })
        if (error) throw new AppError(authMessage(error))
        return { emailed: true, user: null }
      }

      let user = world.users.find((u) => u.email === clean)
      if (!user) {
        const palette = ['#e8637a', '#8b6bd9', '#4fb286', '#e9a23b', '#5aa9e6']
        user = {
          id: uid('u'),
          email: clean,
          name: name?.trim() || clean.split('@')[0].replace(/[._]/g, ' '),
          emoji: ['🌷', '🍀', '🌙', '⭐️', '🔥'][Math.floor(Math.random() * 5)],
          color: palette[Math.floor(Math.random() * palette.length)],
          partnerId: null,
          coupleId: null,
          calendars: [],
          createdAt: new Date().toISOString(),
        }
        const created = user
        update((w) => ({ ...w, users: [...w.users, created] }))
      }
      setSessionState({ userId: user.id, signedInAt: new Date().toISOString() })
      return { emailed: false, user }
    },

    async verifyCode(email, code) {
      if (!hasSupabase || !cloud.sb) throw new AppError('Codes are only used in cloud mode.')
      const { error } = await cloud.sb.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.replace(/\D/g, ''),
        type: 'email',
      })
      if (error) throw new AppError(authMessage(error))
    },

    async signInWithPassword(email, password) {
      if (!hasSupabase || !cloud.sb)
        throw new AppError('Passwords need the server. Local mode signs you in with an email alone.')
      if (session) throw new AppError('This device is already signed in. Sign out first.')
      const { error } = await cloud.sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw new AppError(authMessage(error))
    },

    async signUpWithPassword(email, password, name) {
      if (!hasSupabase || !cloud.sb)
        throw new AppError('Passwords need the server. Local mode signs you in with an email alone.')
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))
        throw new AppError('That email does not look right.')
      if (session) throw new AppError('This device is already signed in. Sign out first.')
      if (password.length < 8) throw new AppError('Use at least 8 characters for the password.')

      const { data, error } = await cloud.sb.auth.signUp({
        email: clean,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: name?.trim() ? { name: name.trim() } : undefined,
        },
      })
      if (error) throw new AppError(authMessage(error))
      // With user enumeration protection on, signing up an address that is
      // already taken succeeds quietly and returns a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        throw new AppError(authMessage({ message: '', code: 'user_already_exists' }))
      }
      return { confirmNeeded: !data.session }
    },

    async sendPasswordReset(email) {
      if (!hasSupabase || !cloud.sb)
        throw new AppError('Passwords need the server. Local mode signs you in with an email alone.')
      const { error } = await cloud.sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth`,
      })
      if (error) throw new AppError(authMessage(error))
    },

    async updatePassword(password) {
      if (!hasSupabase || !cloud.sb)
        throw new AppError('Passwords need the server. Local mode signs you in with an email alone.')
      if (password.length < 8) throw new AppError('Use at least 8 characters for the password.')
      const { error } = await cloud.sb.auth.updateUser({ password })
      if (error) throw new AppError(authMessage(error))
      setRecovery(false)
    },

    async signOut() {
      if (hasSupabase && cloud.sb) {
        await cloud.sb.auth.signOut()
        return
      }
      setSessionState(null)
    },

    async deleteAccount() {
      if (!me) return
      const myId = me.id

      if (hasSupabase && cloud.sb) {
        pending.current = []
        await cloud.deleteAccount()
        // The JWT now points at a row that no longer exists, so a failing
        // sign-out is expected — drop the local session either way.
        await cloud.sb.auth.signOut().catch(() => {})
        setSessionState(null)
        setWorldState(emptyWorld())
        return
      }

      update((w) => {
        const coupleId = me.coupleId
        const next: World = {
          ...w,
          users: w.users
            .filter((u) => u.id !== myId)
            .map((u) =>
              u.partnerId === myId ? { ...u, partnerId: null, coupleId: null } : u,
            ),
          couples: w.couples.filter((c) => c.id !== coupleId),
          places: w.places.filter((p) => p.coupleId !== coupleId),
          dates: w.dates.filter((d) => d.coupleId !== coupleId),
          reviews: w.reviews.filter((r) => r.coupleId !== coupleId),
          milestones: w.milestones.filter((m) => m.coupleId !== coupleId),
          categories: w.categories.filter((c) => c.coupleId !== coupleId),
          feedback: w.feedback.filter((f) => f.userId !== myId),
          notifications: w.notifications.filter((n) => n.userId !== myId),
          busy: w.busy.filter((b) => b.userId !== myId),
          pairRequests: w.pairRequests.filter((p) => p.fromUserId !== myId),
          calendarOwners: Object.fromEntries(
            Object.entries(w.calendarOwners).filter(([, ownerId]) => ownerId !== myId),
          ),
        }
        return next
      })
      setSessionState(null)
    },

    async sendPairRequest(email) {
      if (!me) return
      const clean = email.trim().toLowerCase()
      if (clean === me.email) throw new AppError('You cannot match with yourself 🙂')
      if (me.partnerId) throw new AppError('You are already matched. One account, one person.')

      if (hasSupabase) {
        try {
          await cloud.sendPairRequest(clean)
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not send that request.')
        }
        await refresh(me.id, 1)
        return
      }

      const target = world.users.find((u) => u.email === clean)
      if (target?.partnerId)
        throw new AppError(
          `${target.name} is already matched with someone else. Save the Dates allows one partner per account.`,
        )
      const existing = world.pairRequests.find(
        (p) => p.status === 'pending' && p.fromUserId === me.id && p.toEmail === clean,
      )
      if (existing) throw new AppError('You already have a pending request to this email.')

      update((w) => {
        let next: World = {
          ...w,
          pairRequests: [
            ...w.pairRequests,
            {
              id: uid('pr'),
              fromUserId: me.id,
              fromEmail: me.email,
              fromName: me.name,
              toEmail: clean,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        }
        if (target) {
          next = notify(next, {
            userId: target.id,
            kind: 'pair',
            title: `${me.name} wants to link with you`,
            body: 'Accept to share calendars, wishlist and date plans. This is permanent.',
            refId: null,
            popup: true,
          })
        }
        return next
      })
    },

    async respondPairRequest(id, accept) {
      if (!me) return

      if (hasSupabase) {
        try {
          await cloud.respondPairRequest(id, accept)
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not answer that request.')
        }
        await refresh(me.id, 1)
        return
      }

      update((w) => {
        const req = w.pairRequests.find((p) => p.id === id)
        if (!req) return w
        const from = w.users.find((u) => u.id === req.fromUserId)
        if (!from) return w
        if (!accept) {
          return notify(
            {
              ...w,
              pairRequests: w.pairRequests.map((p) =>
                p.id === id ? { ...p, status: 'declined' as const } : p,
              ),
            },
            {
              userId: from.id,
              kind: 'pair',
              title: `${me.name} declined your link request`,
              body: 'You can send a new request any time.',
              refId: null,
              popup: false,
            },
          )
        }
        if (from.partnerId || me.partnerId) return w

        const coupleId = uid('c')
        const newCouple: Couple = {
          id: coupleId,
          memberIds: [from.id, me.id],
          since: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        }
        let next: World = {
          ...w,
          couples: [...w.couples, newCouple],
          users: w.users.map((u) =>
            u.id === from.id
              ? { ...u, partnerId: me.id, coupleId }
              : u.id === me.id
                ? { ...u, partnerId: from.id, coupleId }
                : u,
          ),
          pairRequests: w.pairRequests.map((p) =>
            p.id === id ? { ...p, status: 'accepted' as const } : p,
          ),
        }
        next = notify(next, {
          userId: from.id,
          kind: 'pair',
          title: `You and ${me.name} are linked 💕`,
          body: 'Calendars, wishlist and date plans are now shared.',
          refId: null,
          popup: true,
        })
        return next
      })
    },

    async connectCalendar(provider, accountEmail) {
      if (!me) return
      const clean = accountEmail.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new AppError('Enter a valid calendar account.')
      const owner = world.calendarOwners[clean]
      if (owner && owner !== me.id)
        throw new AppError(
          'That calendar account is already linked to another Save the Dates account. One calendar account, one app account.',
        )
      if (me.calendars.some((c) => c.provider === provider))
        throw new AppError(
          `You already linked a ${provider === 'google' ? 'Google' : 'iPhone'} calendar. Disconnect it first.`,
        )

      const myId = me.id
      const scopes =
        provider === 'google'
          ? ['calendar.readonly', 'calendar.events']
          : ['EventKit.read', 'EventKit.write']

      if (hasSupabase) {
        // link_calendar() is the real gate; the checks above only save a round
        // trip when we already know the answer.
        try {
          await cloud.linkCalendar(provider, clean, scopes)
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not link that calendar.')
        }
        update((w) => ({
          ...w,
          busy: [
            ...w.busy.filter((b) => !(b.userId === myId && b.provider === provider)),
            ...generateBusy(myId, provider, clean.length * 977 + myId.length * 31),
          ],
        }))
        await refresh(myId, 1)
        return
      }

      update((w) => ({
        ...w,
        users: w.users.map((u) =>
          u.id === myId
            ? {
                ...u,
                calendars: [
                  ...u.calendars,
                  {
                    provider,
                    accountEmail: clean,
                    connectedAt: new Date().toISOString(),
                    scopes:
                      provider === 'google'
                        ? ['calendar.readonly', 'calendar.events']
                        : ['EventKit.read', 'EventKit.write'],
                  },
                ],
              }
            : u,
        ),
        calendarOwners: { ...w.calendarOwners, [clean]: myId },
        busy: [
          ...w.busy.filter((b) => !(b.userId === myId && b.provider === provider)),
          ...generateBusy(myId, provider, clean.length * 977 + myId.length * 31),
        ],
      }))
    },

    async disconnectCalendar(provider) {
      if (!me) return
      const myId = me.id
      const link = me.calendars.find((c) => c.provider === provider)

      if (hasSupabase) {
        if (link) {
          try {
            await cloud.unlinkCalendar(myId, provider)
          } catch (e) {
            throw new AppError(e instanceof Error ? e.message : 'Could not disconnect.')
          }
        }
        update((w) => ({
          ...w,
          busy: w.busy.filter((b) => !(b.userId === myId && b.provider === provider && !b.fromApp)),
        }))
        await refresh(myId, 1)
        return
      }

      // The same address usually holds both of your calendars, so the claim on
      // it only lifts once neither of them is using it.
      const stillMine = me.calendars.some(
        (c) => c.provider !== provider && c.accountEmail === link?.accountEmail,
      )

      update((w) => ({
        ...w,
        users: w.users.map((u) =>
          u.id === myId ? { ...u, calendars: u.calendars.filter((c) => c.provider !== provider) } : u,
        ),
        calendarOwners: stillMine
          ? w.calendarOwners
          : Object.fromEntries(
              Object.entries(w.calendarOwners).filter(([email]) => email !== link?.accountEmail),
            ),
        busy: w.busy.filter((b) => !(b.userId === myId && b.provider === provider && !b.fromApp)),
      }))
    },

    addPlace(input) {
      if (!me || !couple) throw new AppError('Link with your partner first.')
      const place: Place = {
        id: uid('p'),
        coupleId: couple.id,
        name: input.name,
        address: input.address,
        category: input.category,
        priceLevel: input.priceLevel,
        mapsUrl: input.mapsUrl,
        photo: input.photo,
        addedBy: me.id,
        createdAt: new Date().toISOString(),
        favourite: false,
        notes: input.note
          ? [{ id: uid('n'), userId: me.id, text: input.note, createdAt: new Date().toISOString() }]
          : [],
        ratings: [],
      }
      update((w) => ({ ...w, places: [place, ...w.places] }))
      return place
    },

    addNote(placeId, text) {
      if (!me) return
      const myId = me.id
      update((w) => ({
        ...w,
        places: w.places.map((p) =>
          p.id === placeId
            ? {
                ...p,
                notes: [
                  ...p.notes,
                  { id: uid('n'), userId: myId, text, createdAt: new Date().toISOString() },
                ],
              }
            : p,
        ),
      }))
    },

    toggleFavourite(placeId) {
      update((w) => ({
        ...w,
        places: w.places.map((p) => (p.id === placeId ? { ...p, favourite: !p.favourite } : p)),
      }))
    },

    setPlaceCategory(placeId, category) {
      update((w) => ({
        ...w,
        places: w.places.map((p) => (p.id === placeId ? { ...p, category } : p)),
      }))
    },

    ratePlace(placeId, stars, dateEventId = null) {
      if (!me) return
      const myId = me.id
      update((w) => ({
        ...w,
        places: w.places.map((p) =>
          p.id === placeId
            ? {
                ...p,
                ratings: [
                  ...p.ratings.filter((r) => !(r.userId === myId && r.dateEventId === dateEventId)),
                  { userId: myId, dateEventId, stars, createdAt: new Date().toISOString() },
                ],
              }
            : p,
        ),
      }))
    },

    removePlace(placeId) {
      update((w) => ({ ...w, places: w.places.filter((p) => p.id !== placeId) }))
    },

    createDate(input) {
      if (!me || !partner || !couple) throw new AppError('Link with your partner first.')
      const ev: DateEvent = {
        id: uid('d'),
        coupleId: couple.id,
        createdBy: me.id,
        invitedUserId: partner.id,
        placeId: input.placeId,
        start: input.start,
        end: input.end,
        status: 'invited',
        invitation: input.invitation,
        response: null,
        createdAt: new Date().toISOString(),
        calendarSynced: [],
      }
      update((w) =>
        notify({ ...w, dates: [...w.dates, ev] }, {
          userId: partner.id,
          kind: 'invitation',
          title: `${me.name} invited you on a date`,
          body: input.invitation.headline,
          refId: ev.id,
          popup: true,
        }),
      )
      return ev
    },

    respondToDate(dateId, accept, message, provider) {
      if (!me) return
      const myId = me.id
      update((w) => {
        const ev = w.dates.find((d) => d.id === dateId)
        if (!ev) return w
        const host = w.users.find((u) => u.id === ev.createdBy)
        const place = w.places.find((p) => p.id === ev.placeId)
        const title = `Date with ${host?.name ?? 'your partner'} 💕`

        const synced: DateEvent['calendarSynced'] = []
        const newBusy: BusySlot[] = []
        if (accept) {
          if (provider) {
            synced.push({ userId: myId, provider })
            newBusy.push({
              id: uid('busy'),
              userId: myId,
              provider,
              title: place ? `${title} — ${place.name}` : title,
              start: ev.start,
              end: ev.end,
              fromApp: true,
            })
          }
          const hostProvider = host?.calendars[0]?.provider
          if (host && hostProvider) {
            synced.push({ userId: host.id, provider: hostProvider })
            newBusy.push({
              id: uid('busy'),
              userId: host.id,
              provider: hostProvider,
              title: place ? `Date with ${me.name} 💕 — ${place.name}` : `Date with ${me.name} 💕`,
              start: ev.start,
              end: ev.end,
              fromApp: true,
            })
          }
        }

        let next: World = {
          ...w,
          busy: [...w.busy, ...newBusy],
          dates: w.dates.map((d) =>
            d.id === dateId
              ? {
                  ...d,
                  status: accept ? ('accepted' as const) : ('declined' as const),
                  response: {
                    message,
                    respondedAt: new Date().toISOString(),
                    calendarProvider: provider,
                  },
                  calendarSynced: synced,
                }
              : d,
          ),
        }
        if (host) {
          next = notify(next, {
            userId: host.id,
            kind: 'response',
            title: accept ? `${me.name} said yes 💕` : `${me.name} cannot make it`,
            body: message || (accept ? 'See you there.' : 'Maybe another time.'),
            refId: dateId,
            popup: true,
          })
        }
        return next
      })
    },

    cancelDate(dateId) {
      if (!me) return
      const myId = me.id
      update((w) => {
        const ev = w.dates.find((d) => d.id === dateId)
        if (!ev) return w
        const otherId = ev.createdBy === myId ? ev.invitedUserId : ev.createdBy
        const other = w.users.find((u) => u.id === otherId)
        let next: World = {
          ...w,
          dates: w.dates.map((d) => (d.id === dateId ? { ...d, status: 'cancelled' as const } : d)),
          busy: w.busy.filter(
            (b) => !(b.fromApp && b.start === ev.start && b.end === ev.end),
          ),
        }
        if (other) {
          next = notify(next, {
            userId: other.id,
            kind: 'response',
            title: `${me.name} cancelled the date`,
            body: ev.invitation.headline,
            refId: dateId,
            popup: false,
          })
        }
        return next
      })
    },

    addReview({ dateEventId, placeStars, feeling, photo }) {
      if (!me || !couple) return
      const myId = me.id
      const coupleId = couple.id
      update((w) => {
        const ev = w.dates.find((d) => d.id === dateEventId)
        const review: Review = {
          id: uid('r'),
          dateEventId,
          coupleId,
          userId: myId,
          placeStars,
          feeling,
          photo,
          createdAt: new Date().toISOString(),
        }
        let next: World = {
          ...w,
          reviews: [...w.reviews.filter((r) => !(r.dateEventId === dateEventId && r.userId === myId)), review],
          places: ev?.placeId
            ? w.places.map((p) =>
                p.id === ev.placeId
                  ? {
                      ...p,
                      ratings: [
                        ...p.ratings.filter(
                          (r) => !(r.userId === myId && r.dateEventId === dateEventId),
                        ),
                        {
                          userId: myId,
                          dateEventId,
                          stars: placeStars,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : p,
              )
            : w.places,
        }
        const otherId = ev ? (ev.createdBy === myId ? ev.invitedUserId : ev.createdBy) : null
        if (otherId) {
          next = notify(next, {
            userId: otherId,
            kind: 'review',
            title: `${me.name} added to your date diary`,
            body: feeling.slice(0, 80) || 'A new memory is waiting for you.',
            refId: dateEventId,
            popup: false,
          })
        }
        return next
      })
    },

    addMilestone(input) {
      if (!me || !couple) return
      const m: Milestone = { ...input, id: uid('m'), coupleId: couple.id, createdBy: me.id }
      update((w) => ({ ...w, milestones: [...w.milestones, m] }))
    },

    removeMilestone(id) {
      update((w) => ({ ...w, milestones: w.milestones.filter((m) => m.id !== id) }))
    },

    addCategory({ scope, label, emoji }) {
      if (!me || !couple) throw new AppError('Link with your partner first.')
      const clean = label.trim()
      if (!clean) throw new AppError('Give the category a name.')
      const taken = [...BUILTIN_PLACE_CATEGORIES, ...BUILTIN_MILESTONE_KINDS, ...customFor(scope)]
      if (taken.some((c) => c.label.toLowerCase() === clean.toLowerCase()))
        throw new AppError(`“${clean}” already exists.`)

      const cat: CustomCategory = {
        id: uid('cat'),
        coupleId: couple.id,
        scope,
        label: clean,
        emoji,
        createdBy: me.id,
        createdAt: new Date().toISOString(),
      }
      update((w) => ({ ...w, categories: [...w.categories, cat] }))
      return cat.id
    },

    async submitFeedback({ kind, message, screen }) {
      if (!me) throw new AppError('Sign in first.')
      const report: FeedbackReport = {
        id: hasSupabase ? crypto.randomUUID() : uid('fb'),
        userId: me.id,
        kind,
        message: message.trim(),
        screen,
        appVersion: APP_VERSION,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        createdAt: new Date().toISOString(),
      }
      if (hasSupabase) {
        try {
          await cloud.insertFeedback(report)
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not send that report.')
        }
      }
      // Feedback lives in its own table, so keep it out of the space document.
      setWorldState((w) => ({ ...w, feedback: [report, ...w.feedback] }))
      return report
    },

    async removeFeedback(id) {
      if (hasSupabase) {
        try {
          await cloud.deleteFeedback(id)
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not remove that report.')
        }
      }
      setWorldState((w) => ({ ...w, feedback: w.feedback.filter((f) => f.id !== id) }))
    },

    removeCategory(id) {
      const usedByPlace = world.places.some((p) => p.category === id)
      const usedByMilestone = world.milestones.some((m) => m.kind === id)
      if (usedByPlace || usedByMilestone)
        throw new AppError('Something still uses this category. Move those items first.')
      update((w) => ({ ...w, categories: w.categories.filter((c) => c.id !== id) }))
    },

    markRead(id) {
      update((w) => ({
        ...w,
        notifications: w.notifications.map((n) => (n.id === id ? { ...n, read: true, popup: false } : n)),
      }))
    },

    markAllRead() {
      if (!me) return
      const myId = me.id
      update((w) => ({
        ...w,
        notifications: w.notifications.map((n) =>
          n.userId === myId ? { ...n, read: true, popup: false } : n,
        ),
      }))
    },

    dismissPopup(id) {
      update((w) => ({
        ...w,
        notifications: w.notifications.map((n) => (n.id === id ? { ...n, popup: false } : n)),
      }))
    },

    /** Wipes this browser's copy of everything. No undo. */
    wipeLocalData() {
      const fresh = emptyWorld()
      localStorage.setItem(WORLD_KEY, JSON.stringify(fresh))
      setWorldState(fresh)
      setSessionState(null)
    },
  }

  const value: Ctx = {
    world,
    session,
    me,
    partner,
    couple,
    places,
    dates,
    milestones,
    reviews,
    notifications,
    unread,
    popup,
    myBusy,
    partnerBusy,
    placeCategories,
    milestoneKinds,
    myFeedback,
    status,
    recovery,
    syncError,
    cloud: hasSupabase,
    actions,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/** Average of every rating a place has collected, or null when unrated. */
export function placeScore(p: Place) {
  if (!p.ratings.length) return null
  return p.ratings.reduce((s, r) => s + r.stars, 0) / p.ratings.length
}
