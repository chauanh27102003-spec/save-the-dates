import type { PlaceCategory } from './types'
import { BUILTIN_PLACE_CATEGORIES, findCategory } from './categories'

export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  category: PlaceCategory
  priceLevel: 1 | 2 | 3
  photo: string
  googleRating: number
}

/**
 * Stand-in for the Google Places API. The real app swaps this module for a
 * Places Autocomplete + Place Details call; everything downstream is unchanged.
 */
const CATALOG: PlaceSuggestion[] = [
  {
    id: 'g-1',
    name: 'The Note Coffee',
    address: '64 Luong Van Can, Hoan Kiem, Hanoi',
    category: 'cafe',
    priceLevel: 1,
    photo: '☕️',
    googleRating: 4.6,
  },
  {
    id: 'g-2',
    name: 'Sky Deck Rooftop Bar',
    address: 'Lotte Center, 54 Lieu Giai, Ba Dinh, Hanoi',
    category: 'bar',
    priceLevel: 3,
    photo: '🌇',
    googleRating: 4.4,
  },
  {
    id: 'g-3',
    name: 'Pizza 4P’s Trang Tien',
    address: '24 Trang Tien, Hoan Kiem, Hanoi',
    category: 'restaurant',
    priceLevel: 2,
    photo: '🍕',
    googleRating: 4.7,
  },
  {
    id: 'g-4',
    name: 'CGV Vincom Ba Trieu',
    address: '191 Ba Trieu, Hai Ba Trung, Hanoi',
    category: 'cinema',
    priceLevel: 2,
    photo: '🎬',
    googleRating: 4.2,
  },
  {
    id: 'g-5',
    name: 'West Lake Sunset Walk',
    address: 'Nhat Chieu, Tay Ho, Hanoi',
    category: 'outdoor',
    priceLevel: 1,
    photo: '🌅',
    googleRating: 4.8,
  },
  {
    id: 'g-6',
    name: 'Vietnam Museum of Fine Arts',
    address: '66 Nguyen Thai Hoc, Ba Dinh, Hanoi',
    category: 'culture',
    priceLevel: 1,
    photo: '🖼️',
    googleRating: 4.5,
  },
  {
    id: 'g-7',
    name: 'Bowling Center Royal City',
    address: '72A Nguyen Trai, Thanh Xuan, Hanoi',
    category: 'activity',
    priceLevel: 2,
    photo: '🎳',
    googleRating: 4.1,
  },
  {
    id: 'g-8',
    name: 'Cong Caphe Dien Bien Phu',
    address: '27 Dien Bien Phu, Ba Dinh, Hanoi',
    category: 'cafe',
    priceLevel: 1,
    photo: '🥥',
    googleRating: 4.3,
  },
  {
    id: 'g-9',
    name: 'Home Hanoi Restaurant',
    address: '34 Chau Long, Ba Dinh, Hanoi',
    category: 'restaurant',
    priceLevel: 3,
    photo: '🍲',
    googleRating: 4.6,
  },
  {
    id: 'g-10',
    name: 'Ceramic Painting Studio',
    address: '15 Ngo Huyen, Hoan Kiem, Hanoi',
    category: 'activity',
    priceLevel: 2,
    photo: '🏺',
    googleRating: 4.9,
  },
  {
    id: 'g-11',
    name: 'Train Street Coffee',
    address: 'Tran Phu, Hoan Kiem, Hanoi',
    category: 'cafe',
    priceLevel: 1,
    photo: '🚆',
    googleRating: 4.4,
  },
  {
    id: 'g-12',
    name: 'Botanical Garden Picnic Lawn',
    address: 'Hoang Hoa Tham, Ba Dinh, Hanoi',
    category: 'outdoor',
    priceLevel: 1,
    photo: '🧺',
    googleRating: 4.5,
  },
  {
    id: 'g-13',
    name: 'Beta Cinemas My Dinh',
    address: 'Tran Binh, Nam Tu Liem, Hanoi',
    category: 'cinema',
    priceLevel: 1,
    photo: '🍿',
    googleRating: 4.0,
  },
  {
    id: 'g-14',
    name: 'Hidden Gem Cocktail Bar',
    address: '3B Hang Tre, Hoan Kiem, Hanoi',
    category: 'bar',
    priceLevel: 2,
    photo: '🍸',
    googleRating: 4.7,
  },
  {
    id: 'g-15',
    name: 'Long Bien Bridge Night View',
    address: 'Long Bien Bridge, Hanoi',
    category: 'outdoor',
    priceLevel: 1,
    photo: '🌉',
    googleRating: 4.6,
  },
]

export function searchPlaces(query: string): PlaceSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return CATALOG.slice(0, 6)
  return CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      findCategory(BUILTIN_PLACE_CATEGORIES, p.category).label.toLowerCase().includes(q),
  )
}

export function mapsUrl(name: string, address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name} ${address}`,
  )}`
}
