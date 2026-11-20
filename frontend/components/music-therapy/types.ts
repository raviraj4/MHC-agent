export type Feeling =
  | 'Calm'
  | 'Uplift'
  | 'Focus'
  | 'Sleep'
  | 'Confidence'
  | 'Release'

export interface MusicTrack {
  id: string
  title: string
  artist: string
  audioUrl: string
  imageUrl?: string
  duration: number // in seconds
  feeling: Feeling
  tags: string[]
  source: 'jamendo' | 'curated'
}

export interface TherapySession {
  id: string
  userId: string
  desiredFeeling: Feeling | 'Explore Freely'
  trackId: string
  trackTitle: string
  trackArtist: string
  durationSeconds: number
  moodBefore: number // 1-5
  moodAfter: number // 1-5
  reliefRating: number // 1-5
  reflectionNote: string
  createdAt: string
}

export const FEELING_OPTIONS: {
  value: Feeling
  label: string
  description: string
  emoji: string
  jamendoTag: string
  accent: string
}[] = [
  {
    value: 'Calm',
    label: 'Calm',
    description: 'Slow down a racing mind and ease tension',
    emoji: '🌊',
    jamendoTag: 'relaxation',
    accent: 'from-sky-500/15 to-cyan-500/10 border-sky-500/25',
  },
  {
    value: 'Uplift',
    label: 'Uplift',
    description: 'Gentle warmth to brighten a heavy mood',
    emoji: '☀️',
    jamendoTag: 'uplifting',
    accent: 'from-amber-500/15 to-orange-500/10 border-amber-500/25',
  },
  {
    value: 'Focus',
    label: 'Focus',
    description: 'Steady ambient rhythms for clear thinking',
    emoji: '🎯',
    jamendoTag: 'ambient',
    accent: 'from-indigo-500/15 to-blue-500/10 border-indigo-500/25',
  },
  {
    value: 'Sleep',
    label: 'Sleep',
    description: 'Soft, drifting soundscapes to unwind',
    emoji: '🌙',
    jamendoTag: 'sleep',
    accent: 'from-violet-500/15 to-purple-500/10 border-violet-500/25',
  },
  {
    value: 'Confidence',
    label: 'Confidence',
    description: 'Grounding, empowering instrumental energy',
    emoji: '✨',
    jamendoTag: 'inspiring',
    accent: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/25',
  },
  {
    value: 'Release',
    label: 'Release',
    description: 'Expressive melodies to let go of emotion',
    emoji: '🍃',
    jamendoTag: 'emotional',
    accent: 'from-rose-500/15 to-pink-500/10 border-rose-500/25',
  },
]