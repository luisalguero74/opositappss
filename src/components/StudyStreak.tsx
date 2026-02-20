'use client'

import { useEffect, useState } from 'react'

interface StreakData {
  streak: {
    currentStreak: number
    longestStreak: number
    lastStudyDate: Date | null
  }
}

export default function StudyStreak() {
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, lastStudyDate: null as Date | null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/streak')
      .then(res => res.json())
      .then((data: StreakData) => {
        setStreak(data.streak)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🔥</div>
        <h3 className="font-bold text-lg dark:text-white">Racha de Estudio</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{streak.currentStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Días actuales</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{streak.longestStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Récord personal</div>
        </div>
      </div>
      {streak.lastStudyDate && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
          Último estudio: {new Date(streak.lastStudyDate).toLocaleDateString('es-ES')}
        </div>
      )}
    </div>
  )
}
