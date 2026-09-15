import type { World } from './types'

export const WORLD_VERSION = 2

/** A brand new, empty world. No demo couple, no sample places. */
export function emptyWorld(): World {
  return {
    version: WORLD_VERSION,
    users: [],
    couples: [],
    pairRequests: [],
    places: [],
    dates: [],
    reviews: [],
    milestones: [],
    notifications: [],
    busy: [],
    calendarOwners: {},
    categories: [],
    feedback: [],
  }
}
