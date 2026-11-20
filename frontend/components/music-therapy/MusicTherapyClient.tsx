'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Compass,
  Headphones,
  MessageCircleHeart,
  Music2,
  Pause,
  Play,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  FEELING_OPTIONS,
  type Feeling,
  type MusicTrack,
  type TherapySession,
} from './types'
import {
  deleteTherapySession,
  getSavedSessions,
  saveTherapySession,
} from './storage'

const SESSION_DURATION_SECONDS = 600 // 10 minutes

const GUIDED_PROMPTS = [
  { atSecond: 0, text: 'Settle into a comfortable position. Let your shoulders drop and take one slow, deep breath.' },
  { atSecond: 90, text: 'Notice the rhythm of the music. You don’t need to fix anything right now—just listen.' },
  { atSecond: 210, text: 'If a thought pulls you away, gently acknowledge it and bring your attention back to the sound.' },
  { atSecond: 330, text: 'Unclench your jaw, soften your gaze, and let your exhale be slightly longer than your inhale.' },
  { atSecond: 450, text: 'Notice how your body feels compared to when you started. Allow any remaining tension to soften.' },
  { atSecond: 540, text: 'We’re nearing the end of this session. Take a moment to appreciate giving yourself this pause.' },
]

const MOOD_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Great',
}

type Stage = 'select' | 'browse' | 'session' | 'reflect'

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MusicTherapyClient({ userId }: { userId: string }) {
  const [stage, setStage] = useState<Stage>('select')
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | 'Explore Freely'>('Calm')
  const [filterFeeling, setFilterFeeling] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)

  // Selected track & pre-session check-in
  const [pendingTrack, setPendingTrack] = useState<MusicTrack | null>(null)
  const [activeTrack, setActiveTrack] = useState<MusicTrack | null>(null)
  const [moodBefore, setMoodBefore] = useState<number>(3)

  // Session player state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Reflection state
  const [moodAfter, setMoodAfter] = useState<number>(4)
  const [reliefRating, setReliefRating] = useState<number>(4)
  const [reflectionNote, setReflectionNote] = useState('')
  const [sessionSaved, setSessionSaved] = useState(false)

  // Saved history
  const [history, setHistory] = useState<TherapySession[]>([])

  useEffect(() => {
    setHistory(getSavedSessions(userId))
  }, [userId])

  // Fetch tracks whenever filter or search changes in browse stage
  useEffect(() => {
    if (stage !== 'browse') return
    const controller = new AbortController()

    const loadTracks = async () => {
      setLoadingTracks(true)
      try {
        const params = new URLSearchParams()
        if (filterFeeling !== 'all') params.set('feeling', filterFeeling)
        if (searchQuery.trim()) params.set('search', searchQuery.trim())
        const res = await fetch(`/api/music-therapy/tracks?${params.toString()}`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setTracks(data.tracks || [])
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Could not load tracks. Please try again.')
        }
      } finally {
        setLoadingTracks(false)
      }
    }

    const timer = setTimeout(loadTracks, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [stage, filterFeeling, searchQuery])

  // 10-minute session timer
  useEffect(() => {
    if (stage !== 'session' || !isPlaying) return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev + 1 >= SESSION_DURATION_SECONDS) {
          audioRef.current?.pause()
          setIsPlaying(false)
          setStage('reflect')
          return SESSION_DURATION_SECONDS
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [stage, isPlaying])

  // Current guided prompt based on elapsed time
  const currentPrompt = useMemo(() => {
    let active = GUIDED_PROMPTS[0]
    for (const prompt of GUIDED_PROMPTS) {
      if (elapsedSeconds >= prompt.atSecond) active = prompt
    }
    return active.text
  }, [elapsedSeconds])

  const handleChooseFeeling = (feeling: Feeling | 'Explore Freely') => {
    setSelectedFeeling(feeling)
    setFilterFeeling(feeling === 'Explore Freely' ? 'all' : feeling)
    setSearchQuery('')
    setPendingTrack(null)
    setStage('browse')
  }

  const handleStartSession = () => {
    if (!pendingTrack) return
    setActiveTrack(pendingTrack)
    setElapsedSeconds(0)
    setSessionSaved(false)
    setReflectionNote('')
    setMoodAfter(Math.min(5, moodBefore + 1))
    setReliefRating(4)
    setStage('session')
    setIsPlaying(true)
  }

  // Play/pause audio element when stage or isPlaying changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || stage !== 'session') return
    audio.muted = isMuted
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [stage, isPlaying, isMuted, activeTrack])

  const handleEndSession = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
    setStage('reflect')
  }

  const handleSaveSession = () => {
    if (!activeTrack) return
    const newSession: TherapySession = {
      id: crypto.randomUUID(),
      userId,
      desiredFeeling: selectedFeeling,
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      trackArtist: activeTrack.artist,
      durationSeconds: elapsedSeconds,
      moodBefore,
      moodAfter,
      reliefRating,
      reflectionNote: reflectionNote.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = saveTherapySession(newSession)
    setHistory(updated)
    setSessionSaved(true)
    toast.success('Music therapy session saved!')
  }

  const handleDeleteHistory = (id: string) => {
    setHistory(deleteTherapySession(userId, id))
    toast.success('Session removed')
  }

  const moodShift = moodAfter - moodBefore
  const progressPercent = Math.min(100, (elapsedSeconds / SESSION_DURATION_SECONDS) * 100)

  return (
    <section className="h-full overflow-y-auto px-4 py-8 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Top Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {stage !== 'select' && stage !== 'session' && (
            <button
              onClick={() => {
                setPendingTrack(null)
                setStage('select')
              }}
              className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--muted)]"
            >
              Change Intention
            </button>
          )}
        </div>

        {/* ── STAGE 1: SELECT FEELING OR EXPLORE FREELY ── */}
        {stage === 'select' && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                Music Therapy
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
                How would you like to feel?
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
                Pick an intention for a guided 10-minute listening session, or explore the full library freely.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEELING_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleChooseFeeling(item.value)}
                  className={`group rounded-2xl border bg-gradient-to-br p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.accent}`}
                >
                  <div className="text-2xl">{item.emoji}</div>
                  <h2 className="mt-3 text-base font-bold text-[var(--foreground)]">
                    {item.label}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Explore Freely Card */}
            <button
              onClick={() => handleChooseFeeling('Explore Freely')}
              className="flex items-center justify-between rounded-2xl bg-[var(--card)] p-5 text-left ring-1 ring-[var(--border)] transition-all hover:ring-[var(--primary)]/40 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Compass className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--foreground)]">
                    Explore Freely
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Not sure what you need? Browse and filter the entire music collection.
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-[var(--primary)]">Browse →</span>
            </button>

            {/* Recent Saved Sessions */}
            {history.length > 0 && (
              <div className="mt-2 rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Recent Listening Sessions
                </h3>
                <div className="mt-3 space-y-2.5">
                  {history.slice(0, 5).map((s) => {
                    const shift = s.moodAfter - s.moodBefore
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[var(--muted)]/50 px-4 py-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--foreground)]">
                            {s.trackTitle}{' '}
                            <span className="font-normal text-[var(--muted-foreground)]">
                              · {s.desiredFeeling}
                            </span>
                          </p>
                          <p className="mt-0.5 text-[var(--muted-foreground)]">
                            {formatTime(s.durationSeconds)} · Mood {s.moodBefore}→{s.moodAfter}{' '}
                            ({shift >= 0 ? `+${shift}` : shift}) · Relief {s.reliefRating}/5
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHistory(s.id)}
                          aria-label="Delete session"
                          className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STAGE 2: BROWSE TRACKS + PRE-SESSION MOOD CHECK-IN ── */}
        {stage === 'browse' && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                {selectedFeeling}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                Choose a soundscape
              </h1>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, moods, or tags..."
                  className="w-full rounded-xl bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', ...FEELING_OPTIONS.map((f) => f.value)].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterFeeling(tag)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    filterFeeling === tag
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {tag === 'all' ? 'All Music' : tag}
                </button>
              ))}
            </div>

            {/* Pre-session modal/panel when a track is selected */}
            {pendingTrack && (
              <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--card)] p-5 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--primary)]">Ready to listen</p>
                    <h2 className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                      {pendingTrack.title}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {pendingTrack.artist} · 10-minute guided session
                    </p>
                  </div>
                  <button
                    onClick={() => setPendingTrack(null)}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    Quick check-in: How are you feeling right now? ({MOOD_LABELS[moodBefore]})
                  </p>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setMoodBefore(num)}
                        className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                          moodBefore === num
                            ? 'bg-[var(--primary)] text-white shadow-sm'
                            : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartSession}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Headphones className="h-4 w-4" />
                  Start 10-Minute Session
                </button>
              </div>
            )}

            {/* Track List */}
            {loadingTracks ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-[var(--muted)]"
                  />
                ))}
              </div>
            ) : tracks.length === 0 ? (
              <div className="rounded-2xl bg-[var(--card)] p-8 text-center ring-1 ring-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No tracks matched your filter. Try clearing the search or selecting All Music.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tracks.map((track) => {
                  const isSelected = pendingTrack?.id === track.id
                  return (
                    <button
                      key={track.id}
                      onClick={() => setPendingTrack(track)}
                      className={`flex items-center justify-between gap-4 rounded-2xl bg-[var(--card)] p-4 text-left ring-1 transition-all hover:-translate-y-0.5 ${
                        isSelected
                          ? 'ring-2 ring-[var(--primary)] shadow-md'
                          : 'ring-[var(--border)] hover:ring-[var(--primary)]/40'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                          <Music2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-[var(--foreground)]">
                            {track.title}
                          </h3>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">
                            {track.artist} · {track.feeling}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--muted-foreground)]">
                        {formatTime(track.duration)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── STAGE 3: ACTIVE 10-MINUTE LISTENING SESSION ── */}
        {stage === 'session' && activeTrack && (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl bg-[var(--card)] p-8 text-center ring-1 ring-[var(--border)] shadow-lg">
            <audio ref={audioRef} src={activeTrack.audioUrl} loop preload="auto" />

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
              <Headphones className="h-8 w-8" />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              {selectedFeeling} Session
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
              {activeTrack.title}
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">{activeTrack.artist}</p>

            {/* Guided Therapeutic Prompt */}
            <div className="mt-6 w-full rounded-2xl bg-[var(--muted)]/60 p-5">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                Guided Prompt
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                {currentPrompt}
              </p>
            </div>

            {/* Session Progress */}
            <div className="mt-6 w-full">
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                <span>{formatTime(elapsedSeconds)}</span>
                <span>{formatTime(SESSION_DURATION_SECONDS)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="mt-7 flex items-center gap-4">
              <button
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="rounded-xl bg-[var(--muted)] p-3 text-[var(--foreground)] transition-colors hover:bg-[var(--border)]"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 transition-transform hover:scale-105"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
              </button>

              <button
                onClick={handleEndSession}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--muted)] px-4 py-3 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--border)]"
              >
                <Square className="h-3.5 w-3.5" />
                End Session
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 4: POST-SESSION REFLECTION ── */}
        {stage === 'reflect' && activeTrack && (
          <div className="mx-auto w-full max-w-2xl rounded-3xl bg-[var(--card)] p-6 sm:p-8 ring-1 ring-[var(--border)] shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Session Reflection
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
              How do you feel now?
            </h1>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              You listened to <strong>{activeTrack.title}</strong> for {formatTime(elapsedSeconds)}.
            </p>

            {/* After Mood */}
            <div className="mt-6">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Mood after listening ({MOOD_LABELS[moodAfter]})
              </label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setMoodAfter(num)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      moodAfter === num
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotional Shift Summary */}
            <div className="mt-5 rounded-2xl bg-[var(--muted)]/60 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Emotional Shift
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                {MOOD_LABELS[moodBefore]} ({moodBefore}) → {MOOD_LABELS[moodAfter]} ({moodAfter})
                <span
                  className={`ml-2 text-sm ${
                    moodShift > 0
                      ? 'text-emerald-500'
                      : moodShift < 0
                      ? 'text-amber-500'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {moodShift > 0 ? `+${moodShift} lighter` : moodShift === 0 ? 'Steady' : `${moodShift}`}
                </span>
              </p>
            </div>

            {/* Relief Rating */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                How much relief did this music give you? ({reliefRating}/5)
              </label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setReliefRating(num)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      reliefRating === num
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection Note */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Reflection note (optional)
              </label>
              <textarea
                rows={3}
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="What came up for you during the session?"
                className="mt-2 w-full rounded-xl bg-[var(--background)] p-3 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSaveSession}
                disabled={sessionSaved}
                className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {sessionSaved ? 'Saved ✓' : 'Save Session'}
              </button>

              <Link
                href={`/chat?from=music-therapy&feeling=${encodeURIComponent(selectedFeeling)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--border)]"
              >
                <MessageCircleHeart className="h-4 w-4 text-[var(--primary)]" />
                Talk to ASA
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}