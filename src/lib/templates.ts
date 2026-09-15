export interface InviteTemplate {
  id: string
  name: string
  emoji: string
  headline: string
  message: string
  /** Tailwind classes for the card background. */
  bg: string
  ink: string
}

export const TEMPLATES: InviteTemplate[] = [
  {
    id: 'sunset',
    name: 'Golden hour',
    emoji: '🌇',
    headline: 'Catch the sunset with me?',
    message: 'Clear skies, no plans after. Just walk with me until the lights come on.',
    bg: 'bg-gradient-to-br from-[#ffb88c] to-[#e8637a]',
    ink: 'text-white',
  },
  {
    id: 'coffee',
    name: 'Slow coffee',
    emoji: '☕️',
    headline: 'Coffee and nothing else to do',
    message: 'Two hours, one table, zero agenda. Bring the stories you forgot to tell me.',
    bg: 'bg-gradient-to-br from-[#f7e0c9] to-[#c9a07a]',
    ink: 'text-white',
  },
  {
    id: 'dinner',
    name: 'Dinner date',
    emoji: '🍝',
    headline: 'Dinner, properly this time',
    message: 'Nice shirt, real table, phones face down. I already know what you will order.',
    bg: 'bg-gradient-to-br from-[#6b5470] to-[#33203a]',
    ink: 'text-white',
  },
  {
    id: 'movie',
    name: 'Movie night',
    emoji: '🎬',
    headline: 'One movie, your pick',
    message: 'I will hold the popcorn and pretend I am not scared.',
    bg: 'bg-gradient-to-br from-[#8b6bd9] to-[#4b3a86]',
    ink: 'text-white',
  },
  {
    id: 'surprise',
    name: 'Surprise me',
    emoji: '🎁',
    headline: 'Say yes without asking where',
    message: 'I planned everything. You only have to show up and be on time. Please be on time.',
    bg: 'bg-gradient-to-br from-[#e8637a] to-[#8b6bd9]',
    ink: 'text-white',
  },
  {
    id: 'celebrate',
    name: 'Celebrate',
    emoji: '🥂',
    headline: 'This one deserves a celebration',
    message: 'A milestone is coming up and I refuse to let it pass quietly.',
    bg: 'bg-gradient-to-br from-[#4fb286] to-[#2f7a58]',
    ink: 'text-white',
  },
]

export function templateById(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
