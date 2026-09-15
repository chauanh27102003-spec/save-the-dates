import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from './config'
import type {
  BusySlot,
  CalendarProvider,
  DateEvent,
  FeedbackKind,
  FeedbackReport,
  Milestone,
  Place,
  Review,
  CustomCategory,
  AppNotification,
  PairRequest,
  User,
  World,
} from './types'
import { WORLD_VERSION, emptyWorld } from './world'

export const sb: SupabaseClient | null = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

function client(): SupabaseClient {
  if (!sb) throw new Error('Supabase is not configured')
  return sb
}

/** Raised when the partner saved first; the caller replays its change. */
export class ConflictError extends Error {}

/** Anything the server rejected, with the message it gave us. */
export class CloudError extends Error {}

interface ProfileRow {
  id: string
  email: string
  name: string
  emoji: string
  color: string
  partner_id: string | null
  space_id: string | null
  created_at: string
}

interface LinkRow {
  account_email: string
  user_id: string
  provider: CalendarProvider
  scopes: string[]
  connected_at: string
}

interface RequestRow {
  id: string
  from_user_id: string
  from_email: string
  from_name: string
  to_email: string
  status: PairRequest['status']
  created_at: string
}

interface FeedbackRow {
  id: string
  user_id: string
  kind: FeedbackKind
  message: string
  screen: string
  app_version: string
  user_agent: string
  viewport: string
  created_at: string
}

/** The shared payload, exactly the slices both partners can edit. */
export interface SpaceDoc {
  couple?: { since?: string }
  places?: Place[]
  dates?: DateEvent[]
  reviews?: Review[]
  milestones?: Milestone[]
  categories?: CustomCategory[]
  busy?: BusySlot[]
  notifications?: AppNotification[]
}

export interface Snapshot {
  world: World
  spaceId: string | null
  spaceVersion: number
}

function toUser(row: ProfileRow, links: LinkRow[]): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    partnerId: row.partner_id,
    coupleId: row.space_id,
    calendars: links
      .filter((l) => l.user_id === row.id)
      .map((l) => ({
        provider: l.provider,
        accountEmail: l.account_email,
        connectedAt: l.connected_at,
        scopes: l.scopes ?? [],
      })),
    createdAt: row.created_at,
  }
}

function fail(message: string, error: { message: string } | null): never | void {
  if (error) throw new CloudError(`${message}: ${error.message}`)
}

/** Builds the in-memory world the rest of the app already knows how to use. */
export async function loadWorld(userId: string): Promise<Snapshot> {
  const db = client()

  const { data: meRow, error: meErr } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  fail('Could not load your profile', meErr)

  // The sign-up trigger may not have committed yet on the very first load.
  if (!meRow) return { world: emptyWorld(), spaceId: null, spaceVersion: 0 }
  const me = meRow as ProfileRow

  const [links, requests, feedback, space] = await Promise.all([
    db.from('calendar_links').select('*'),
    db.from('pair_requests').select('*'),
    db.from('feedback').select('*').order('created_at', { ascending: false }),
    me.space_id
      ? db.from('spaces').select('*').eq('id', me.space_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  fail('Could not load calendars', links.error)
  fail('Could not load link requests', requests.error)
  fail('Could not load your reports', feedback.error)
  fail('Could not load your shared data', space.error)

  const linkRows = (links.data ?? []) as LinkRow[]
  const partnerRow = me.partner_id
    ? ((
        await db.from('profiles').select('*').eq('id', me.partner_id).maybeSingle()
      ).data as ProfileRow | null)
    : null

  const spaceRow = space.data as { id: string; version: number; data: SpaceDoc; created_at: string } | null
  const doc: SpaceDoc = spaceRow?.data ?? {}

  const world: World = {
    version: WORLD_VERSION,
    users: [toUser(me, linkRows), ...(partnerRow ? [toUser(partnerRow, linkRows)] : [])],
    couples:
      spaceRow && me.partner_id
        ? [
            {
              id: spaceRow.id,
              memberIds: [me.id, me.partner_id],
              since: doc.couple?.since ?? spaceRow.created_at.slice(0, 10),
              createdAt: spaceRow.created_at,
            },
          ]
        : [],
    pairRequests: ((requests.data ?? []) as RequestRow[]).map((r) => ({
      id: r.id,
      fromUserId: r.from_user_id,
      toEmail: r.to_email,
      status: r.status,
      createdAt: r.created_at,
    })),
    places: doc.places ?? [],
    dates: doc.dates ?? [],
    reviews: doc.reviews ?? [],
    milestones: doc.milestones ?? [],
    notifications: doc.notifications ?? [],
    busy: doc.busy ?? [],
    categories: doc.categories ?? [],
    calendarOwners: Object.fromEntries(linkRows.map((l) => [l.account_email, l.user_id])),
    feedback: ((feedback.data ?? []) as FeedbackRow[]).map((f) => ({
      id: f.id,
      userId: f.user_id,
      kind: f.kind,
      message: f.message,
      screen: f.screen,
      appVersion: f.app_version,
      userAgent: f.user_agent,
      viewport: f.viewport,
      createdAt: f.created_at,
    })),
  }

  return { world, spaceId: spaceRow?.id ?? null, spaceVersion: spaceRow?.version ?? 0 }
}

/** Everything in the world that lives in the shared document. */
export function toDoc(world: World): SpaceDoc {
  return {
    couple: { since: world.couples[0]?.since },
    places: world.places,
    dates: world.dates,
    reviews: world.reviews,
    milestones: world.milestones,
    categories: world.categories,
    busy: world.busy,
    notifications: world.notifications,
  }
}

export async function saveSpace(spaceId: string, version: number, doc: SpaceDoc): Promise<number> {
  const { data, error } = await client().rpc('save_space', {
    p_id: spaceId,
    p_version: version,
    p_data: doc,
  })
  if (error) {
    if (error.code === '40001' || error.message.includes('conflict')) throw new ConflictError()
    throw new CloudError(error.message)
  }
  return data as number
}

export async function sendPairRequest(email: string) {
  const { error } = await client().rpc('send_pair_request', { p_email: email })
  if (error) throw new CloudError(humanise(error.message))
}

export async function respondPairRequest(id: string, accept: boolean) {
  const { error } = await client().rpc('respond_pair_request', { p_id: id, p_accept: accept })
  if (error) throw new CloudError(humanise(error.message))
}

export async function linkCalendar(
  userId: string,
  provider: CalendarProvider,
  accountEmail: string,
  scopes: string[],
) {
  const { error } = await client().from('calendar_links').insert({
    account_email: accountEmail,
    user_id: userId,
    provider,
    scopes,
  })
  if (!error) return
  // 23505 = unique violation. Either the address or the slot is already taken,
  // and we deliberately do not say who holds it.
  if (error.code === '23505') {
    throw new CloudError(
      error.message.includes('user_id')
        ? `You already linked a ${provider === 'google' ? 'Google' : 'iPhone'} calendar. Disconnect it first.`
        : 'That calendar account is already linked to another Save the Dates account. One calendar, one account.',
    )
  }
  throw new CloudError(error.message)
}

export async function unlinkCalendar(accountEmail: string) {
  const { error } = await client().from('calendar_links').delete().eq('account_email', accountEmail)
  if (error) throw new CloudError(error.message)
}

export async function insertFeedback(report: FeedbackReport) {
  const { error } = await client().from('feedback').insert({
    id: report.id,
    user_id: report.userId,
    kind: report.kind,
    message: report.message,
    screen: report.screen,
    app_version: report.appVersion,
    user_agent: report.userAgent,
    viewport: report.viewport,
  })
  if (error) throw new CloudError(error.message)
}

export async function deleteFeedback(id: string) {
  const { error } = await client().from('feedback').delete().eq('id', id)
  if (error) throw new CloudError(error.message)
}

export async function deleteAccount() {
  const { error } = await client().rpc('delete_my_account')
  if (error) throw new CloudError(error.message)
}

/** Fires whenever the partner writes to the shared space, or a request arrives. */
export function subscribe(spaceId: string | null, email: string, onChange: () => void) {
  const db = client()
  const channel = db.channel(`std:${spaceId ?? email}`)

  if (spaceId) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'spaces', filter: `id=eq.${spaceId}` },
      onChange,
    )
  }
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'pair_requests' },
    onChange,
  )
  channel.subscribe()

  return () => {
    db.removeChannel(channel)
  }
}

/** Postgres exception text is fine to show, minus the plpgsql decoration. */
function humanise(message: string) {
  return message.replace(/^.*?(?:ERROR|error):\s*/i, '').trim()
}
