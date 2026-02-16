'use client'

import { useMemo } from 'react'
import type { MoodCheckin } from '@/types'

const MOOD_EMOJIS = ['', '😞', '😔', '😐', '🙂', '😊']
const LABEL_MAP: Record<string, string> = {
  mood: 'Mood',
  energy: 'Energy',
  stress: 'Stress',
}
const COLOR_MAP: Record<string, string> = {
  mood: 'var(--primary)',
  energy: 'var(--warm)',
  stress: 'var(--destructive)',
}

interface Props {
  checkins: MoodCheckin[]
  month: number // 0-indexed
  year: number
}

export default function MoodGraph({ checkins, month, year }: Props) {
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Group by day → take the last entry of each day
  const dailyData = useMemo(() => {
    const byDay: Record<number, MoodCheckin> = {}
    for (const c of checkins) {
      const day = new Date(c.created_at).getDate()
      byDay[day] = c // last one wins
    }
    return byDay
  }, [checkins])

  const dayCount = Object.keys(dailyData).length

  // Not enough data placeholder
  if (dayCount < 3) {
    return (
      <div className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)] animate-fade-in-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
          {monthName} mood trends
        </p>
        <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
          <span className="text-4xl mb-3">📊</span>
          <p className="text-sm font-medium text-[var(--foreground)]">
            More insights when you log mood regularly
          </p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">
            Check in each time you visit — even a quick tap helps you see patterns over time.
            {dayCount > 0 && (
              <> You&apos;ve logged <strong>{dayCount}</strong> {dayCount === 1 ? 'day' : 'days'} so far this month!</>
            )}
          </p>
        </div>
      </div>
    )
  }

  // Build chart data
  const metrics: Array<'mood' | 'energy' | 'stress'> = ['mood', 'energy', 'stress']

  // SVG dimensions
  const W = 400
  const H = 140
  const PAD_L = 28
  const PAD_R = 8
  const PAD_T = 12
  const PAD_B = 24
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  // Get sorted days that have data
  const sortedDays = Object.keys(dailyData)
    .map(Number)
    .sort((a, b) => a - b)

  function getPoints(metric: 'mood' | 'energy' | 'stress') {
    return sortedDays.map((day) => {
      const x = PAD_L + ((day - 1) / (daysInMonth - 1)) * chartW
      const val = dailyData[day][metric]
      const y = PAD_T + chartH - ((val - 1) / 4) * chartH
      return { x, y, val, day }
    })
  }

  function pathD(points: Array<{ x: number; y: number }>) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  }

  // Averages
  const avgMood = (Object.values(dailyData).reduce((s, c) => s + c.mood, 0) / dayCount).toFixed(1)
  const avgEnergy = (Object.values(dailyData).reduce((s, c) => s + c.energy, 0) / dayCount).toFixed(1)
  const avgStress = (Object.values(dailyData).reduce((s, c) => s + c.stress, 0) / dayCount).toFixed(1)

  return (
    <div className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)] animate-fade-in-up">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
          {monthName} mood trends
        </p>
        <p className="text-[10px] text-[var(--muted-foreground)]">{dayCount} days logged</p>
      </div>

      {/* Mini averages */}
      <div className="flex gap-4 mb-3">
        {[
          { label: 'Mood', val: avgMood, emoji: MOOD_EMOJIS[Math.round(Number(avgMood))] },
          { label: 'Energy', val: avgEnergy, color: 'var(--warm)' },
          { label: 'Stress', val: avgStress, color: 'var(--destructive)' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {'emoji' in s && s.emoji ? (
              <span className="text-base">{s.emoji}</span>
            ) : (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
            )}
            <span className="text-xs text-[var(--muted-foreground)]">
              {s.label} <strong className="text-[var(--foreground)]">{s.val}</strong>
            </span>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 180 }}
        aria-label="Mood trends chart"
      >
        {/* Horizontal gridlines at 1..5 */}
        {[1, 2, 3, 4, 5].map((v) => {
          const y = PAD_T + chartH - ((v - 1) / 4) * chartH
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y}
                x2={PAD_L + chartW}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--muted-foreground)"
                fontSize={8}
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Lines */}
        {metrics.map((metric) => {
          const pts = getPoints(metric)
          const color = COLOR_MAP[metric]
          return (
            <g key={metric}>
              <path
                d={pathD(pts)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={metric === 'mood' ? 1 : 0.55}
              />
              {metric === 'mood' &&
                pts.map((p) => (
                  <circle
                    key={p.day}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={color}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                  />
                ))}
            </g>
          )
        })}

        {/* X-axis day labels (sparse) */}
        {sortedDays
          .filter((_, i, arr) => {
            if (arr.length <= 8) return true
            const step = Math.ceil(arr.length / 7)
            return i % step === 0 || i === arr.length - 1
          })
          .map((day) => {
            const x = PAD_L + ((day - 1) / (daysInMonth - 1)) * chartW
            return (
              <text
                key={day}
                x={x}
                y={H - 4}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={8}
              >
                {day}
              </text>
            )
          })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        {metrics.map((m) => (
          <div key={m} className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-4 rounded-full"
              style={{ backgroundColor: COLOR_MAP[m], opacity: m === 'mood' ? 1 : 0.55 }}
            />
            <span className="text-[10px] text-[var(--muted-foreground)]">{LABEL_MAP[m]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
