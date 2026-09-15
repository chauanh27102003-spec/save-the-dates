export type CalendarProvider = 'google' | 'ios'

export interface CalendarLink {
  provider: CalendarProvider
  /** The calendar account that is bound to this app account. One app email <-> one calendar account. */
  accountEmail: string
  connectedAt: string
  scopes: string[]
}

export interface User {
  id: string
  email: string
  name: string
  emoji: string
  color: string
  /** Exactly one partner, ever. null until matched. */
  partnerId: string | null
  coupleId: string | null
  calendars: CalendarLink[]
  createdAt: string
}

export type PairRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface PairRequest {
  id: string
  fromUserId: string
  toEmail: string
  status: PairRequestStatus
  createdAt: string
}

/** Built-in id (see `categories.ts`) or the id of a couple's own category. */
export type MilestoneKind = string

export interface CustomCategory {
  id: string
  coupleId: string
  scope: 'place' | 'milestone'
  label: string
  emoji: string
  createdBy: string
  createdAt: string
}

export interface Milestone {
  id: string
  coupleId: string
  title: string
  /** ISO date (yyyy-mm-dd) */
  date: string
  kind: MilestoneKind
  /** Repeats every year (birthdays, anniversaries) */
  yearly: boolean
  remindDaysBefore: number
  createdBy: string
}

export interface PlaceNote {
  id: string
  userId: string
  text: string
  createdAt: string
}

export interface PlaceRating {
  userId: string
  dateEventId: string | null
  stars: number
  createdAt: string
}

/** Built-in id (see `categories.ts`) or the id of a couple's own category. */
export type PlaceCategory = string

export interface Place {
  id: string
  coupleId: string
  name: string
  address: string
  category: PlaceCategory
  priceLevel: 1 | 2 | 3
  mapsUrl: string
  photo: string
  addedBy: string
  createdAt: string
  notes: PlaceNote[]
  ratings: PlaceRating[]
  /** Manually set by either partner to pin favourites at the top. */
  favourite: boolean
}

export type DateStatus = 'invited' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export interface Invitation {
  templateId: string
  headline: string
  message: string
  /** data-url of the uploaded photo, optional */
  photo: string | null
}

export interface DateResponse {
  message: string
  respondedAt: string
  calendarProvider: CalendarProvider | null
}

export interface DateEvent {
  id: string
  coupleId: string
  createdBy: string
  invitedUserId: string
  placeId: string | null
  /** ISO datetime */
  start: string
  end: string
  status: DateStatus
  invitation: Invitation
  response: DateResponse | null
  createdAt: string
  /** Calendar entries that were auto-created on accept. */
  calendarSynced: { userId: string; provider: CalendarProvider }[]
}

export interface Review {
  id: string
  dateEventId: string
  coupleId: string
  userId: string
  placeStars: number
  /** Shared diary entry about the date itself. */
  feeling: string
  photo: string | null
  createdAt: string
}

export type NotificationKind =
  | 'invitation'
  | 'response'
  | 'milestone'
  | 'review'
  | 'pair'
  | 'system'

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  refId: string | null
  read: boolean
  /** Shown as a blocking pop-up the next time the user opens the app. */
  popup: boolean
  createdAt: string
}

export interface BusySlot {
  id: string
  userId: string
  provider: CalendarProvider
  title: string
  start: string
  end: string
  /** true when the app created it from an accepted date */
  fromApp?: boolean
}

export type FeedbackKind = 'bug' | 'idea' | 'other'

export interface FeedbackReport {
  id: string
  userId: string
  kind: FeedbackKind
  message: string
  /** Route the reporter was on, so a bug can be reproduced. */
  screen: string
  appVersion: string
  userAgent: string
  viewport: string
  createdAt: string
}

export interface Couple {
  id: string
  memberIds: string[]
  since: string
  createdAt: string
}

export interface World {
  version: number
  users: User[]
  couples: Couple[]
  pairRequests: PairRequest[]
  places: Place[]
  dates: DateEvent[]
  reviews: Review[]
  milestones: Milestone[]
  notifications: AppNotification[]
  busy: BusySlot[]
  /** Categories the couple added on top of the built-in ones. */
  categories: CustomCategory[]
  feedback: FeedbackReport[]
  /** calendar account email -> app user id. Enforces one calendar per account. */
  calendarOwners: Record<string, string>
}

export interface Session {
  userId: string
  signedInAt: string
}
