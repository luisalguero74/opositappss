'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalStudyDays: number
  lastStudyDate: string | null
  studyDates: string[]
}

export default function StudyStreakPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchStreak()
    }
  }, [status, router])

  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/user/streak')
      if (res.ok) {
        const data = await res.json()
        setStreak(data)
      }
    } catch (error) {
      console.error('Error fetching streak:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const isStudyDate = (date: Date) => {
    if (!streak?.studyDates) return false
    const dateString = date.toISOString().split('T')[0]
    return streak.studyDates.includes(dateString)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
    const days = []
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    // Headers de días de la semana
    const headers = weekDays.map(day => (
      <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
        {day}
      </div>
    ))

    // Días vacíos antes del primer día del mes
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isStudy = isStudyDate(date)
      const isTodayDate = isToday(date)
      const isFuture = date > new Date()

      days.push(
        <div
          key={day}
          className={`p-2 text-center rounded-lg transition-all ${
            isFuture
              ? 'text-gray-300 cursor-not-allowed'
              : isStudy
              ? 'bg-green-500 text-white font-bold shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="text-sm">{day}</div>
          {isStudy && <div className="text-xs mt-1">🔥</div>}
          {isTodayDate && !isStudy && <div className="text-xs mt-1">📍</div>}
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            ←
          </button>
          <h3 className="text-xl font-bold text-gray-800">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={currentMonth.getMonth() === new Date().getMonth()}
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {headers}
          {days}
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">Día estudiado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span className="text-gray-600">Sin estudio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-blue-500 rounded"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
        </div>
      </div>
    )
  }

  const getMotivationalMessage = () => {
    if (!streak) return ''
    
    if (streak.currentStreak === 0) {
      return '¡Comienza hoy tu racha de estudio! 💪'
    } else if (streak.currentStreak === 1) {
      return '¡Gran comienzo! Sigue así mañana 🌟'
    } else if (streak.currentStreak < 7) {
      return `¡Vas bien! ${7 - streak.currentStreak} días más para una semana completa 🔥`
    } else if (streak.currentStreak < streak.longestStreak) {
      return `¡Excelente! Falta poco para tu récord personal 🏆`
    } else if (streak.currentStreak === streak.longestStreak) {
      return '¡Increíble! Estás en tu mejor racha histórica 🎉'
    } else {
      return '¡NUEVO RÉCORD! Sigue superándote 🚀'
    }
  }

  const getStreakLevel = () => {
    if (!streak) return { level: 'Principiante', color: 'gray', icon: '🌱' }
    
    const days = streak.currentStreak
    if (days === 0) return { level: 'Sin racha', color: 'gray', icon: '💤' }
    if (days < 3) return { level: 'Iniciando', color: 'blue', icon: '🌱' }
    if (days < 7) return { level: 'Constante', color: 'green', icon: '🌿' }
    if (days < 14) return { level: 'Comprometido', color: 'yellow', icon: '🌳' }
    if (days < 30) return { level: 'Dedicado', color: 'orange', icon: '🔥' }
    return { level: 'Maestro', color: 'purple', icon: '👑' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando racha...</p>
        </div>
      </div>
    )
  }

  const streakLevel = getStreakLevel()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">🔥 Mi Racha de Estudio</h1>
                <p className="text-orange-100">Mantén la constancia y alcanza tus metas</p>
              </div>
              <div className="text-6xl">{streakLevel.icon}</div>
            </div>
          </div>
        </div>

        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-orange-500">
            <div className="text-5xl mb-4">🔥</div>
            <h3 className="text-gray-600 font-semibold mb-2">Racha Actual</h3>
            <p className="text-6xl font-bold text-orange-600 mb-2">
              {streak?.currentStreak || 0}
            </p>
            <p className="text-gray-500">días consecutivos</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-yellow-500">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-gray-600 font-semibold mb-2">Récord Personal</h3>
            <p className="text-6xl font-bold text-yellow-600 mb-2">
              {streak?.longestStreak || 0}
            </p>
            <p className="text-gray-500">mejor racha</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-purple-500">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-gray-600 font-semibold mb-2">Total de Días</h3>
            <p className="text-6xl font-bold text-purple-600 mb-2">
              {streak?.totalStudyDays || 0}
            </p>
            <p className="text-gray-500">días estudiados</p>
          </div>
        </div>

        {/* Nivel y Motivación */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Nivel: {streakLevel.level} {streakLevel.icon}
              </h2>
              <p className="text-lg text-blue-100">{getMotivationalMessage()}</p>
            </div>
          </div>
          
          {streak && streak.currentStreak > 0 && (
            <div className="mt-6 bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Progreso hacia el próximo nivel</span>
                <span>{streak.currentStreak % 7}/7 días</span>
              </div>
              <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${((streak.currentStreak % 7) / 7) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Calendario */}
        {renderCalendar()}

        {/* Consejos y Beneficios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💡</span> Beneficios de mantener tu racha
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Mejora la retención de información a largo plazo</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Crea un hábito de estudio sostenible</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Aumenta tu confianza y motivación</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">Desbloquea logros especiales</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📌</span> Consejos para mantener tu racha
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">•</span>
                <span className="text-gray-700">Estudia a la misma hora cada día</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">•</span>
                <span className="text-gray-700">Aunque sea poco, estudia todos los días</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">•</span>
                <span className="text-gray-700">Usa recordatorios en tu calendario</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 font-bold">•</span>
                <span className="text-gray-700">Celebra cada hito alcanzado</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        {(!streak || streak.currentStreak === 0) && (
          <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-center text-white shadow-xl">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-3">¡Comienza tu racha hoy!</h3>
            <p className="mb-6 text-green-100">
              Responde aunque sea un cuestionario para iniciar tu camino hacia el éxito
            </p>
            <Link
              href="/dashboard/theory"
              className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
            >
              Empezar Ahora
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
