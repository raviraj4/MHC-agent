"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import type { Dispatch, SetStateAction } from "react"
import { completeOnboarding } from "@/app/start-conversation/actions"

const GOALS = [
  "Build emotional awareness",
  "Reduce stress & anxiety",
  "Improve sleep quality",
  "Cultivate mindful habits",
  "Boost confidence",
  "Strengthen relationships",
]

const ACTIVITIES = [
  "Gaming",
  "Socialising",
  "Watching movies",
  "Reading",
  "Journaling",
  "Fitness & movement",
  "Music & podcasts",
  "Spending time outdoors",
]

const STEP_LABELS = {
  1: "Welcome",
  2: "Wellbeing goals",
  3: "Activities",
  4: "All set",
} as const

const highlightText = "text-[#38bdf8]"
const gradientPrimary = "bg-gradient-to-r from-[#3b82f6] via-[#0284c7] to-[#06b6d4]"

type Step = 0 | 1 | 2 | 3 | 4

interface OnboardingFlowProps {
  initialName?: string
  initialGoals?: string[]
  initialActivities?: string[]
}

const chipStyles = (
  isActive: boolean,
) => `flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all ${
  isActive
    ? `${gradientPrimary} border-transparent text-white shadow-sm`
    : "border-[var(--border)] text-[var(--foreground)]/80 hover:border-[#38bdf8]"
}`

export function OnboardingFlow({
  initialName = "",
  initialGoals = [],
  initialActivities = [],
}: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState(initialName)
  const [goals, setGoals] = useState<string[]>(initialGoals)
  const [activities, setActivities] = useState<string[]>(initialActivities)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const summary = useMemo(
    () => ({
      name: name.trim() || "Friend",
      goals,
      activities,
    }),
    [name, goals, activities],
  )

  const toggleSelection = (item: string, list: string[], setter: Dispatch<SetStateAction<string[]>>) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item],
    )
  }

  const handleContinue = () => {
    if (step === 0) {
      setStep(1)
      return
    }

    if (step === 1 && !name.trim()) {
      setError("Please let us know what to call you.")
      return
    }

    setError(null)
    setStep((prev) => Math.min(prev + 1, 4) as Step)
  }

  const handleBack = () => {
    if (step === 0) return
    setError(null)
    setStep((prev) => Math.max(prev - 1, 0) as Step)
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Please enter a name to continue.")
      setStep(1)
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding({
        name: name.trim(),
        goals,
        activities,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      router.push("/dashboard")
    })
  }

  const renderStepHeader = () => (
    <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
      <div className={`uppercase tracking-[0.2em] ${highlightText}`}>
        Step {step} · {STEP_LABELS[step as keyof typeof STEP_LABELS]}
      </div>
      <div>
        {step}/4
      </div>
    </div>
  )

  const renderIntro = () => (
    <div className="text-center space-y-6">
      <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${highlightText}`}>
        Start Conversation
      </p>
      <h2 className="text-3xl font-semibold">
        Ready to meet Asa?
      </h2>
      <p className="mx-auto max-w-2xl text-base text-[var(--muted-foreground)]">
        Before we dive into your wellbeing journey, let&apos;s personalize Asa with a few quick
        questions. It takes less than a minute.
      </p>
      <button
        onClick={handleContinue}
        className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-95 ${gradientPrimary}`}
      >
        Start conversation
      </button>
    </div>
  )

  const renderNameStep = () => (
    <div className="space-y-6">
      {renderStepHeader()}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg shadow-sky-500/5">
        <p className={`text-sm font-medium ${highlightText}`}>Step 1</p>
        <h3 className="mt-2 text-2xl font-semibold">
          Welcome to Asa
        </h3>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Let&apos;s personalise your experience. We&apos;re here to support you on your wellbeing
          journey. What should we call you?
        </p>

        <label className="mt-8 block text-sm font-medium">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Sam"
          className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 text-base focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
        />
      </div>
    </div>
  )

  const renderGoalsStep = () => (
    <div className="space-y-6">
      {renderStepHeader()}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg shadow-sky-500/5">
        <p className={`text-sm font-medium ${highlightText}`}>Step 2</p>
        <h3 className="mt-2 text-2xl font-semibold">
          What are your wellbeing goals?
        </h3>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Select all that resonate with you. You can always change these later.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleSelection(goal, goals, setGoals)}
              className={chipStyles(goals.includes(goal))}
            >
              <span>{goal}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderActivitiesStep = () => (
    <div className="space-y-6">
      {renderStepHeader()}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg shadow-sky-500/5">
        <p className={`text-sm font-medium ${highlightText}`}>Step 3</p>
        <h3 className="mt-2 text-2xl font-semibold">
          What activities energise you?
        </h3>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Pick a few favorites—we&apos;ll use them to tailor prompts and check-ins.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ACTIVITIES.map((activity) => (
            <button
              key={activity}
              type="button"
              onClick={() => toggleSelection(activity, activities, setActivities)}
              className={chipStyles(activities.includes(activity))}
            >
              <span>{activity}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSummaryStep = () => (
    <div className="space-y-6">
      {renderStepHeader()}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg shadow-sky-500/5">
        <p className={`text-sm font-medium ${highlightText}`}>Step 4</p>
        <h3 className="mt-2 text-2xl font-semibold">
          All set, {summary.name}!
        </h3>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Here&apos;s a quick snapshot of your preferences. You can update them anytime from
          your profile.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-4">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Goals</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(summary.goals.length ? summary.goals : ["Not specified yet"]).map((goal) => (
                <span key={goal} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--foreground)]">
                  {goal}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-4">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Activities</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(summary.activities.length ? summary.activities : ["Not specified yet"]).map((activity) => (
                <span key={activity} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--foreground)]">
                  {activity}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderNavigation = () => (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={handleBack}
        disabled={step === 0 || isPending}
        className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40"
      >
        Back
      </button>
      {step < 4 ? (
        <button
          type="button"
          onClick={handleContinue}
          disabled={(step === 1 && !name.trim()) || isPending}
          className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 hover:opacity-95 disabled:opacity-60 ${gradientPrimary}`}
        >
          Continue
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 hover:opacity-95 disabled:opacity-60 ${gradientPrimary}`}
        >
          {isPending ? "Saving..." : "Get started"}
        </button>
      )}
    </div>
  )

  return (
    <section className="space-y-6">
      {step === 0 && renderIntro()}
      {step === 1 && renderNameStep()}
      {step === 2 && renderGoalsStep()}
      {step === 3 && renderActivitiesStep()}
      {step === 4 && renderSummaryStep()}

      {step > 0 && renderNavigation()}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </section>
  )
}
