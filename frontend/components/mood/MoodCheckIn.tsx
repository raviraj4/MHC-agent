'use client'

import { useState, useTransition } from 'react'
import { logMoodCheckin } from '@/app/dashboard/actions'
import type { MoodCheckin } from '@/types'

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Awful' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
]

const ENERGY_OPTIONS = [
  { value: 1, emoji: '🪫', label: 'Drained' },
  { value: 2, emoji: '😴', label: 'Tired' },
  { value: 3, emoji: '⚡', label: 'Moderate' },
  { value: 4, emoji: '💪', label: 'Energized' },
  { value: 5, emoji: '🔥', label: 'Pumped' },
]

const STRESS_OPTIONS = [
  { value: 1, emoji: '😌', label: 'Calm' },
  { value: 2, emoji: '🌤️', label: 'Slight' },
  { value: 3, emoji: '😬', label: 'Moderate' },
  { value: 4, emoji: '😰', label: 'High' },
  { value: 5, emoji: '🤯', label: 'Overwhelming' },
]

const QUICK_TAGS = ['work', 'sleep', 'exercise', 'social', 'family', 'health', 'creative', 'rest']

type Step = 'mood' | 'energy' | 'stress' | 'note' | 'done'
const STEPS: Step[] = ['mood', 'energy', 'stress', 'note']

interface Props {
  todayCheckin: MoodCheckin | null
  onCheckinComplete: (checkin: MoodCheckin) => void
}

export default function MoodCheckIn({ todayCheckin, onCheckinComplete }: Props) {
  const [step, setStep] = useState<Step>(todayCheckin ? 'done' : 'mood')
  const [mood, setMood] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [stress, setStress] = useState(0)
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const stepIndex = STEPS.indexOf(step)

  function nextStep() {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1])
    }
  }

  function prevStep() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1])
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit() {
    startTransition(async () => {
      setError('')
      const result = await logMoodCheckin({
        mood,
        energy,
        stress,
        note: note.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setStep('done')
        onCheckinComplete(result.data)
      }
    })
  }

  // Already checked in today
  if (step === 'done' || todayCheckin) {
    const checkin = todayCheckin
    const moodInfo = MOOD_OPTIONS.find((m) => m.value === checkin?.mood)
    const energyInfo = ENERGY_OPTIONS.find((e) => e.value === checkin?.energy)
    const stressInfo = STRESS_OPTIONS.find((s) => s.value === checkin?.stress)

    return (
      <div className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)] animate-fade-in-up">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{moodInfo?.emoji ?? '✅'}</span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Today&apos;s check-in
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {moodInfo ? (
                <>Feeling {moodInfo.label.toLowerCase()}</>
              ) : (
                'Logged for today'
              )}
            </p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex gap-2">
          {[
            { label: 'Mood', info: moodInfo, color: 'var(--primary)' },
            { label: 'Energy', info: energyInfo, color: 'var(--warm)' },
            { label: 'Stress', info: stressInfo, color: 'var(--destructive)' },
          ].map(({ label, info }) => (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-[var(--muted)]/50 py-2"
            >
              <span className="text-lg">{info?.emoji}</span>
              <span className="text-[10px] font-semibold text-[var(--foreground)]">{info?.label}</span>
              <span className="text-[9px] text-[var(--muted-foreground)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Note */}
        {checkin?.note && (
          <p className="mt-3 rounded-lg bg-[var(--muted)]/30 px-3 py-2 text-xs leading-relaxed text-[var(--muted-foreground)] italic">
            &ldquo;{checkin.note}&rdquo;
          </p>
        )}

        {/* Tags */}
        {checkin?.tags && checkin.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {checkin.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const stepTitle: Record<Step, string> = {
    mood: 'How are you feeling?',
    energy: 'How\'s your energy?',
    stress: 'How stressed are you?',
    note: 'Any quick thoughts?',
    done: '',
  }

  const currentOptions =
    step === 'mood' ? MOOD_OPTIONS
      : step === 'energy' ? ENERGY_OPTIONS
        : step === 'stress' ? STRESS_OPTIONS
          : null

  const currentValue = step === 'mood' ? mood : step === 'energy' ? energy : stress
  const currentSetter = step === 'mood' ? setMood : step === 'energy' ? setEnergy : setStress

  return (
    <div className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)] animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Daily check-in
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{stepTitle[step]}</p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex
                  ? 'w-5 bg-[var(--primary)]'
                  : 'w-1.5 bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Emoji selector */}
      {currentOptions && (
        <div className="flex justify-between gap-2">
          {currentOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                currentSetter(option.value)
              }}
              className={`group flex flex-1 flex-col items-center gap-1 rounded-xl py-3 transition-all duration-200 ${
                currentValue === option.value
                  ? 'bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] scale-105'
                  : 'hover:bg-[var(--muted)]/60'
              }`}
            >
              <span className={`text-2xl transition-transform duration-200 ${
                currentValue === option.value ? 'scale-110' : 'group-hover:scale-110'
              }`}>
                {option.emoji}
              </span>
              <span className={`text-[10px] font-medium ${
                currentValue === option.value
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'
              }`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Note step */}
      {step === 'note' && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A few words about how you're doing... (optional)"
            maxLength={280}
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {/* Quick tags */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-[var(--destructive)]">{error}</p>
      )}

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={stepIndex === 0}
          className="text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-0"
        >
          Back
        </button>

        {step === 'note' ? (
          <button
            onClick={handleSubmit}
            disabled={isPending || mood === 0 || energy === 0 || stress === 0}
            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save check-in'}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={currentValue === 0}
            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
