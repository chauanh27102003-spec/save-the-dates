/**
 * The last few routes the user visited. A bug report opened from the profile
 * tab is useless without knowing where the problem actually happened.
 */
const trail: string[] = []

export function recordRoute(path: string) {
  if (trail[trail.length - 1] === path) return
  trail.push(path)
  if (trail.length > 8) trail.shift()
}

/** Most recent route that is not the one the report is being filed from. */
export function lastMeaningfulRoute(current: string) {
  for (let i = trail.length - 1; i >= 0; i--) {
    if (trail[i] !== current) return trail[i]
  }
  return current
}

export function routeTrail() {
  return [...trail]
}
