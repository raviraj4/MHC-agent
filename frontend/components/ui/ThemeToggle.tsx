'use client'

import { useTheme } from "../providers/ThemeProvider"
import { Theme } from "@/types"
import { Moon, SunMedium, MonitorSmartphone, type LucideIcon } from "lucide-react"

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
    { value: "light", label: "Light", icon: SunMedium },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "Auto", icon: MonitorSmartphone },
]

export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()

    const handleThemeChange = (nextTheme: Theme) => {
        setTheme(nextTheme)
    }

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Theme
            </p>
            <div className="mt-3 flex items-center gap-2">
                {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isActive = theme === option.value
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleThemeChange(option.value)}
                            aria-pressed={isActive}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/80 ${
                                isActive
                                    ? 'border-[#0ea5e9] bg-gradient-to-br from-[#e0f2fe] via-white to-[#cffafe] text-[#0369a1] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-sky-100'
                                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#7dd3fc]/60 hover:text-[var(--foreground)]'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{option.label}</span>
                        </button>
                    )
                })}
            </div>
            <p className="mt-2 text-[0.7rem] text-[var(--muted-foreground)]">
                Active mode: <span className="font-medium text-[var(--foreground)]">{resolvedTheme}</span>
            </p>
        </div>
    )
}