import { NextRequest, NextResponse } from 'next/server'
import { FEELING_OPTIONS, type Feeling, type MusicTrack } from '@/components/music-therapy/types'

const CURATED_TRACKS: MusicTrack[] = [
  {
    id: 'curated-calm-1',
    title: 'Still Waters',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372,
    feeling: 'Calm',
    tags: ['calm', 'relaxation', 'breathing'],
    source: 'curated',
  },
  {
    id: 'curated-calm-2',
    title: 'Gentle Horizon',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 425,
    feeling: 'Calm',
    tags: ['calm', 'soft', 'ambient'],
    source: 'curated',
  },
  {
    id: 'curated-uplift-1',
    title: 'Morning Light',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 344,
    feeling: 'Uplift',
    tags: ['uplift', 'warm', 'hopeful'],
    source: 'curated',
  },
  {
    id: 'curated-uplift-2',
    title: 'Sunlit Steps',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 302,
    feeling: 'Uplift',
    tags: ['uplift', 'bright', 'acoustic'],
    source: 'curated',
  },
  {
    id: 'curated-focus-1',
    title: 'Deep Flow State',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: 353,
    feeling: 'Focus',
    tags: ['focus', 'study', 'ambient'],
    source: 'curated',
  },
  {
    id: 'curated-focus-2',
    title: 'Quiet Clarity',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: 280,
    feeling: 'Focus',
    tags: ['focus', 'minimal', 'instrumental'],
    source: 'curated',
  },
  {
    id: 'curated-sleep-1',
    title: 'Midnight Drift',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration: 420,
    feeling: 'Sleep',
    tags: ['sleep', 'night', 'slow'],
    source: 'curated',
  },
  {
    id: 'curated-sleep-2',
    title: 'Starlight Rest',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration: 325,
    feeling: 'Sleep',
    tags: ['sleep', 'lullaby', 'ambient'],
    source: 'curated',
  },
  {
    id: 'curated-confidence-1',
    title: 'Steady Ground',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration: 389,
    feeling: 'Confidence',
    tags: ['confidence', 'inspiring', 'grounding'],
    source: 'curated',
  },
  {
    id: 'curated-confidence-2',
    title: 'Rising Momentum',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    duration: 347,
    feeling: 'Confidence',
    tags: ['confidence', 'empowering', 'instrumental'],
    source: 'curated',
  },
  {
    id: 'curated-release-1',
    title: 'Letting Go',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    duration: 360,
    feeling: 'Release',
    tags: ['release', 'emotional', 'cathartic'],
    source: 'curated',
  },
  {
    id: 'curated-release-2',
    title: 'After the Rain',
    artist: 'ASA Soundscape',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    duration: 390,
    feeling: 'Release',
    tags: ['release', 'piano', 'reflective'],
    source: 'curated',
  },
]

interface JamendoTrack {
  id: string
  name: string
  artist_name: string
  audio: string
  image?: string
  duration: number
}

const JAMENDO_FILTERS: Record<Feeling, { tags: string; speed: string }> = {
  Calm: { tags: 'relaxation+ambient+meditation', speed: 'verylow+low' },
  Uplift: { tags: 'acoustic+piano+peaceful', speed: 'low+medium' },
  Focus: { tags: 'ambient+chillout+minimal', speed: 'low' },
  Sleep: { tags: 'sleep+meditation+lullaby', speed: 'verylow' },
  Confidence: { tags: 'piano+acoustic+inspiring', speed: 'low+medium' },
  Release: { tags: 'piano+sad+ambient', speed: 'verylow+low' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const feelingParam = searchParams.get('feeling') || 'all'
  const search = (searchParams.get('search') || '').trim().toLowerCase()

  const validFeeling = FEELING_OPTIONS.find(
    (f) => f.value.toLowerCase() === feelingParam.toLowerCase()
  )

  const clientId = process.env.JAMENDO_CLIENT_ID

  // 1. Try Jamendo API with strict soft/slow therapy filters
  if (clientId) {
    try {
      const jamendoUrl = new URL('https://api.jamendo.com/v3.0/tracks/')
      jamendoUrl.searchParams.set('client_id', clientId)
      jamendoUrl.searchParams.set('format', 'json')
      jamendoUrl.searchParams.set('limit', '18')
      jamendoUrl.searchParams.set('audioformat', 'mp32')
      jamendoUrl.searchParams.set('vocalinstrumental', 'instrumental')
      jamendoUrl.searchParams.set('order', 'popularity_total')

      if (validFeeling) {
        const filter = JAMENDO_FILTERS[validFeeling.value]
        jamendoUrl.searchParams.set('fuzzytags', filter.tags)
        jamendoUrl.searchParams.set('speed', filter.speed)
      } else {
        jamendoUrl.searchParams.set('fuzzytags', 'relaxation+meditation+piano')
        jamendoUrl.searchParams.set('speed', 'verylow+low')
      }

      if (search) {
        jamendoUrl.searchParams.set('search', search)
      }

      const res = await fetch(jamendoUrl.toString(), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const results: JamendoTrack[] = data.results || []

        if (results.length > 0) {
          const tracks: MusicTrack[] = results.map((t, idx) => ({
            id: `jamendo-${t.id}`,
            title: t.name,
            artist: t.artist_name,
            audioUrl: t.audio,
            imageUrl: t.image,
            duration: t.duration || 240,
            feeling:
              validFeeling?.value ??
              FEELING_OPTIONS[idx % FEELING_OPTIONS.length].value,
            tags: validFeeling ? [validFeeling.jamendoTag] : ['relaxation', 'instrumental'],
            source: 'jamendo',
          }))

          return NextResponse.json({ tracks, source: 'jamendo' })
        }
      }
    } catch {
      // Fall through cleanly to curated tracks
    }
  }

  // 2. Fallback to curated tracks
  let filtered = CURATED_TRACKS
  if (validFeeling) {
    filtered = filtered.filter((t) => t.feeling === validFeeling.value)
  }
  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.artist.toLowerCase().includes(search) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search))
    )
  }

  return NextResponse.json({ tracks: filtered, source: 'curated' })
}