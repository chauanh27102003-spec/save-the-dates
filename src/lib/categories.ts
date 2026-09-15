/**
 * Categories for wishlist places and for important dates. Each couple starts
 * from a built-in set and can add their own; custom ones live in the world so
 * both partners see the same list.
 */
export interface CategoryOption {
  id: string
  label: string
  emoji: string
  custom?: boolean
}

export const BUILTIN_PLACE_CATEGORIES: CategoryOption[] = [
  { id: 'cafe', label: 'Cafe', emoji: '☕️' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍝' },
  { id: 'cinema', label: 'Cinema', emoji: '🎬' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌿' },
  { id: 'culture', label: 'Culture', emoji: '🎨' },
  { id: 'activity', label: 'Activity', emoji: '🎳' },
  { id: 'bar', label: 'Bar', emoji: '🍸' },
]

export const BUILTIN_MILESTONE_KINDS: CategoryOption[] = [
  { id: 'anniversary', label: 'Anniversary', emoji: '💍' },
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'first-date', label: 'First time', emoji: '✨' },
  { id: 'custom', label: 'Something else', emoji: '🎯' },
]

const FALLBACK: CategoryOption = { id: 'other', label: 'Other', emoji: '📌' }

export function findCategory(list: CategoryOption[], id: string): CategoryOption {
  return list.find((c) => c.id === id) ?? FALLBACK
}

/** Offered when someone creates a category of their own. */
export const EMOJI_CHOICES = [
  '📌',
  '🍜',
  '🍰',
  '🍦',
  '🎤',
  '🎮',
  '📚',
  '🎡',
  '🏖️',
  '🏞️',
  '🛍️',
  '🏋️',
  '🧘',
  '🎭',
  '🐶',
  '🚗',
  '✈️',
  '🏡',
  '💐',
  '🎁',
  '💸',
  '🚩',
  '👶',
  '🎓',
]
