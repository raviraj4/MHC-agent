'use client'

import { useState } from 'react'
import MoodCheckIn from '@/components/mood/MoodCheckIn'
import MoodGraph from '@/components/mood/MoodGraph'
import type { MoodCheckin } from '@/types'

interface Props {
  initialCheckins: MoodCheckin[]
  todayCheckin: MoodCheckin | null
  month: number
  year: number
}

export default function DashboardMoodSection({
  initialCheckins,
  todayCheckin: initialTodayCheckin,
  month,
  year,
}: Props) {
  const [checkins, setCheckins] = useState(initialCheckins)
  const [todayCheckin, setTodayCheckin] = useState(initialTodayCheckin)

  function handleCheckinComplete(newCheckin: MoodCheckin) {
    setTodayCheckin(newCheckin)
    setCheckins((prev) => [...prev, newCheckin])
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <MoodCheckIn
        todayCheckin={todayCheckin}
        onCheckinComplete={handleCheckinComplete}
      />
      <MoodGraph checkins={checkins} month={month} year={year} />
    </div>
  )
}
