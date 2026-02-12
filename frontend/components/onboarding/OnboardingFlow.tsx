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
  4: "Support contact",
  5: "All set",
} as const

const TOTAL_STEPS = 5

const highlightText = "text-[var(--primary)]"
const gradientPrimary = "bg-gradient-to-r from-sky-500 to-cyan-400"

type Step = 0 | 1 | 2 | 3 | 4 | 5

interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email: string
  consent: boolean
}

interface OnboardingFlowProps {
  initialName?: string
  initialGoals?: string[]
  initialActivities?: string[]
  initialEmergencyContact?: Partial<EmergencyContact>
}

const chipStyles = (
  isActive: boolean,
) => `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all ${
  isActive
    ? `${gradientPrimary} text-white`
    : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
}`

export function OnboardingFlow({
  initialName = "",
  initialGoals = [],
  initialActivities = [],
  initialEmergencyContact = {},
}: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState(initialName)
  const [goals, setGoals] = useState<string[]>(initialGoals)
  const [activities, setActivities] = useState<string[]>(initialActivities)
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: initialEmergencyContact.name || "",
    relationship: initialEmergencyContact.relationship || "",
    phone: initialEmergencyContact.phone || "",
    email: initialEmergencyContact.email || "",
    consent: initialEmergencyContact.consent ?? false,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const summary = useMemo(
    () => ({
      name: name.trim() || "Friend",
      goals,
      activities,
      emergencyContact: {
        name: emergencyContact.name.trim(),
        relationship: emergencyContact.relationship.trim(),
        phone: emergencyContact.phone.trim(),
        email: emergencyContact.email.trim(),
        consent: emergencyContact.consent,
      },
    }),
    [name, goals, activities, emergencyContact],
  )

  const validateEmergencyContact = () => {
    const trimmedName = emergencyContact.name.trim()
    const trimmedPhone = emergencyContact.phone.trim()

    if (!trimmedName || !trimmedPhone) {
      setError("Please provide a name and phone number for your emergency contact.")
      setStep(4)
      return false
    }

    if (!emergencyContact.consent) {
      setError("Please confirm you have permission to list this emergency contact.")
      setStep(4)
      return false
    }

    return true
  }

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
    if (step === 4 && !validateEmergencyContact()) {
      return
    }

    setError(null)
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS) as Step)
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

    if (!validateEmergencyContact()) {
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding({
        name: name.trim(),
        goals,
        activities,
        emergencyContact,
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
        {step}/{TOTAL_STEPS}
      </div>
    </div>
  )

  const renderIntro = () => (
    <div className="text-center space-y-5">
      <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>
        Start Conversation
      </p>
      <h2 className="text-2xl font-semibold">
        Ready to meet Asa?
      </h2>
      <p className="mx-auto max-w-lg text-sm text-[var(--muted-foreground)]">
        Before we dive into your wellbeing journey, let&apos;s personalize Asa with a few quick
        questions. It takes less than a minute.
      </p>
      <button
        onClick={handleContinue}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 ${gradientPrimary}`}
      >
        Start conversation
      </button>
    </div>
  )

  const renderNameStep = () => (
    <div className="space-y-5">
      {renderStepHeader()}
      <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>Step 1</p>
        <h3 className="mt-2 text-xl font-semibold">
          Welcome to Asa
        </h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Let&apos;s personalise your experience. What should we call you?
        </p>

        <label className="mt-5 block text-sm font-medium">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Sam"
          className="mt-1.5 w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
        />
      </div>
    </div>
  )

  const renderGoalsStep = () => (
    <div className="space-y-5">
      {renderStepHeader()}
      <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>Step 2</p>
        <h3 className="mt-2 text-xl font-semibold">
          What are your wellbeing goals?
        </h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Select all that resonate with you. You can always change these later.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
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
    <div className="space-y-5">
      {renderStepHeader()}
      <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>Step 3</p>
        <h3 className="mt-2 text-xl font-semibold">
          What activities energise you?
        </h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Pick a few favorites—we&apos;ll use them to tailor prompts and check-ins.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
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

  const renderEmergencyContactStep = () => (
    <div className="space-y-5">
      {renderStepHeader()}
      <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>Step 4</p>
        <h3 className="mt-2 text-xl font-semibold">
          Who should we reach out to in a crisis?
        </h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          This stays private and is only used if you ask Asa to escalate for safety support.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Full name</label>
            <input
              type="text"
              value={emergencyContact.name}
              onChange={(event) => setEmergencyContact((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Jordan Smith"
              className="mt-1.5 w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Relationship</label>
            <input
              type="text"
              value={emergencyContact.relationship}
              onChange={(event) => setEmergencyContact((prev) => ({ ...prev, relationship: event.target.value }))}
              placeholder="Partner, sibling, therapist..."
              className="mt-1.5 w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone number</label>
            <input
              type="tel"
              value={emergencyContact.phone}
              onChange={(event) => setEmergencyContact((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Include country code"
              className="mt-1.5 w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email (optional)</label>
            <input
              type="email"
              value={emergencyContact.email}
              onChange={(event) => setEmergencyContact((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="contact@example.com"
              className="mt-1.5 w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-xl bg-[var(--muted)]/50 p-3 text-sm">
          <input
            type="checkbox"
            checked={emergencyContact.consent}
            onChange={(event) => setEmergencyContact((prev) => ({ ...prev, consent: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--ring)]"
          />
          <span className="text-[var(--muted-foreground)]">
            I confirm this person knows they&apos;re my safety contact and consented to being contacted if needed.
          </span>
        </label>
      </div>
    </div>
  )

  const renderSummaryStep = () => (
    <div className="space-y-5">
      {renderStepHeader()}
      <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${highlightText}`}>Step 5</p>
        <h3 className="mt-2 text-xl font-semibold">
          All set, {summary.name}!
        </h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Here&apos;s a quick snapshot of your preferences. You can update them anytime from
          your profile.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-[var(--muted)]/50 p-4">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Goals</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(summary.goals.length ? summary.goals : ["Not specified yet"]).map((goal) => (
                <span key={goal} className="rounded-lg bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--foreground)]">
                  {goal}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--muted)]/50 p-4">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Activities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(summary.activities.length ? summary.activities : ["Not specified yet"]).map((activity) => (
                <span key={activity} className="rounded-lg bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--foreground)]">
                  {activity}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--muted)]/50 p-4">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Emergency contact</p>
            {summary.emergencyContact.name && summary.emergencyContact.phone ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted-foreground)]">Name</dt>
                  <dd>{summary.emergencyContact.name}</dd>
                </div>
                {summary.emergencyContact.relationship && (
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--muted-foreground)]">Relationship</dt>
                    <dd>{summary.emergencyContact.relationship}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--muted-foreground)]">Phone</dt>
                  <dd>{summary.emergencyContact.phone}</dd>
                </div>
                {summary.emergencyContact.email && (
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--muted-foreground)]">Email</dt>
                    <dd>{summary.emergencyContact.email}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">Not specified yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderNavigation = () => (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={handleBack}
        disabled={step === 0 || isPending}
        className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40"
      >
        Back
      </button>
      {step < TOTAL_STEPS ? (
        <button
          type="button"
          onClick={handleContinue}
          disabled={
            (step === 1 && !name.trim()) ||
            (step === 4 && (!emergencyContact.name.trim() || !emergencyContact.phone.trim() || !emergencyContact.consent)) ||
            isPending
          }
          className={`inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 ${gradientPrimary}`}
        >
          Continue
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={`inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 ${gradientPrimary}`}
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
      {step === 4 && renderEmergencyContactStep()}
      {step === 5 && renderSummaryStep()}

      {step > 0 && renderNavigation()}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </section>
  )
}
