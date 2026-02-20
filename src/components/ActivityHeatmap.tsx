'use client'

import { useEffect, useState } from 'react'

interface DayActivity {
  date: string
  count: number
}

export default function ActivityHeatmap() {
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/activity')
      .then(res => res.json())
      .then(data => {
        setActivities(data.activities || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count <= 2) return 'bg-green-200 dark:bg-green-900'
    if (count <= 5) return 'bg-green-400 dark:bg-green-700'
    if (count <= 10) return 'bg-green-600 dark:bg-green-500'
    return 'bg-green-800 dark:bg-green-400'
  }

  // Generate last 84 days (12 weeks)
  const generateDays = () => {
    const days = []
    const today = new Date()
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const activity = activities.find(a => a.date === dateStr)
      days.push({
        date: dateStr,
        count: activity?.count || 0,
        day: date.getDay()
      })
    }
    return days
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 84 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const days = generateDays()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">📅</div>
        <h3 className="font-bold text-lg dark:text-white">Actividad (últimos 3 meses)</h3>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {days.map((day, i) => (
          <div
            key={i}
            className={`h-3 rounded-sm ${getIntensityClass(day.count)} transition-colors`}
            title={`${day.date}: ${day.count} actividades`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-800 dark:bg-green-400 rounded-sm"></div>
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
