'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Recommendation {
  type: 'weak_theme' | 'failed_questions' | 'spaced_repetition' | 'streak' | 'new_content'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  actionUrl: string
  icon: string
  color: string
  estimatedTime?: number
  impact?: string
}

interface DailyPlan {
  date: string
  recommendations: Recommendation[]
  totalEstimatedTime: number
  goalProgress: number
}

export default function StudyRecommendationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      generateRecommendations()
    }
  }, [status, router])

  const generateRecommendations = async () => {
    try {
      // Obtener datos del usuario
      const [analyticsRes, streakRes, failedRes] = await Promise.all([
        fetch('/api/user/analytics'),
        fetch('/api/user/streak'),
        fetch('/api/admin/unified-questions/spaced-repetition?type=failed&limit=5')
      ])

      const analytics = analyticsRes.ok ? await analyticsRes.json() : null
      const streak = streakRes.ok ? await streakRes.json() : null
      const failed = failedRes.ok ? await failedRes.json() : null

      const recommendations: Recommendation[] = []

      // 1. Racha de estudio
      if (streak && streak.currentStreak === 0) {
        recommendations.push({
          type: 'streak',
          priority: 'high',
          title: '¡Comienza tu racha de estudio!',
          description: 'No has estudiado hoy. Mantener una racha diaria mejora significativamente tu aprendizaje.',
          action: 'Estudiar ahora',
          actionUrl: '/dashboard/theory',
          icon: '🔥',
          color: 'orange',
          estimatedTime: 15,
          impact: 'Alto impacto en retención'
        })
      } else if (streak && streak.currentStreak > 0 && streak.currentStreak < 7) {
        recommendations.push({
          type: 'streak',
          priority: 'medium',
          title: `¡Mantén tu racha de ${streak.currentStreak} días!`,
          description: 'Estás construyendo un buen hábito. Continúa estudiando cada día.',
          action: 'Continuar racha',
          actionUrl: '/dashboard/theory',
          icon: '🔥',
          color: 'orange',
          estimatedTime: 20,
          impact: 'Fortalece el hábito'
        })
      }

      // 2. Temas débiles (menos del 60%)
      if (analytics?.byTema) {
        const weakThemes = analytics.byTema
          .filter((t: any) => t.percentage < 60 && t.total > 0)
          .sort((a: any, b: any) => a.percentage - b.percentage)
          .slice(0, 3)

        weakThemes.forEach((theme: any, index: number) => {
          recommendations.push({
            type: 'weak_theme',
            priority: index === 0 ? 'high' : 'medium',
            title: `Refuerza: ${theme.titulo}`,
            description: `Tienes un ${theme.percentage}% de precisión. Este tema necesita más práctica.`,
            action: 'Practicar tema',
            actionUrl: `/dashboard/theory?tema=${theme.codigo}`,
            icon: '📚',
            color: 'red',
            estimatedTime: 30,
            impact: 'Mejora base de conocimientos'
          })
        })
      }

      // 3. Preguntas falladas recurrentes
      if (failed?.questions && failed.questions.length > 0) {
        recommendations.push({
          type: 'failed_questions',
          priority: 'high',
          title: `Revisa ${failed.questions.length} preguntas falladas`,
          description: 'Tienes preguntas que has fallado múltiples veces. Revisarlas es crucial.',
          action: 'Revisar errores',
          actionUrl: '/failed-questions',
          icon: '❌',
          color: 'red',
          estimatedTime: 20,
          impact: 'Corrige puntos débiles'
        })
      }

      // 4. Repaso espaciado
      const spacedRes = await fetch('/api/admin/unified-questions/spaced-repetition?type=spaced&limit=10')
      if (spacedRes.ok) {
        const spaced = await spacedRes.json()
        if (spaced.dueCount > 0) {
          recommendations.push({
            type: 'spaced_repetition',
            priority: 'high',
            title: `${spaced.dueCount} preguntas listas para repaso`,
            description: 'El repaso espaciado es el método más efectivo para memorización a largo plazo.',
            action: 'Repasar ahora',
            actionUrl: '/spaced-repetition',
            icon: '🧠',
            color: 'purple',
            estimatedTime: 15,
            impact: 'Máxima retención'
          })
        }
      }

      // 5. Si tiene buen rendimiento general, sugerir nuevos contenidos
      if (analytics?.general?.averageScore >= 75) {
        const masteredThemes = analytics.byTema?.filter((t: any) => t.percentage >= 80).length || 0
        const totalThemes = analytics.byTema?.length || 0
        
        if (masteredThemes < totalThemes) {
          recommendations.push({
            type: 'new_content',
            priority: 'low',
            title: 'Explora nuevos temas',
            description: `Has dominado ${masteredThemes} de ${totalThemes} temas. ¡Amplía tus conocimientos!`,
            action: 'Ver temas nuevos',
            actionUrl: '/dashboard/temario',
            icon: '🌟',
            color: 'blue',
            estimatedTime: 25,
            impact: 'Amplía conocimientos'
          })
        }
      }

      // 6. Si no ha hecho simulacros recientemente
      if (analytics?.recentAttempts) {
        const hasRecentExam = analytics.recentAttempts.some((a: any) => 
          a.type === 'exam' && 
          new Date(a.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )
        
        if (!hasRecentExam && analytics.general.totalAttempts >= 10) {
          recommendations.push({
            type: 'new_content',
            priority: 'medium',
            title: 'Prueba un simulacro de examen',
            description: 'No has hecho un simulacro esta semana. Los exámenes completos te preparan mejor.',
            action: 'Hacer simulacro',
            actionUrl: '/dashboard/exam-simulation',
            icon: '📝',
            color: 'indigo',
            estimatedTime: 120,
            impact: 'Preparación realista'
          })
        }
      }

      // Ordenar por prioridad
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      // Calcular tiempo total estimado
      const totalTime = recommendations.reduce((acc, r) => acc + (r.estimatedTime || 0), 0)

      // Calcular progreso hacia objetivo diario (60 minutos)
      const goalProgress = Math.min(100, Math.round((analytics?.general?.totalAttempts || 0) / 100 * 100))

      setPlan({
        date: new Date().toISOString(),
        recommendations: recommendations.slice(0, 6), // Máximo 6 recomendaciones
        totalEstimatedTime: totalTime,
        goalProgress
      })

    } catch (error) {
      console.error('Error generating recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === 'high') {
      return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Alta</span>
    } else if (priority === 'medium') {
      return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">Media</span>
    }
    return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Baja</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generando recomendaciones personalizadas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">🎯 Qué Estudiar Hoy</h1>
                <p className="text-blue-100">Plan personalizado basado en tu rendimiento</p>
              </div>
              <div className="text-6xl">🤖</div>
            </div>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Tiempo Estimado</h3>
              <span className="text-3xl">⏱️</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{plan?.totalEstimatedTime || 0}</p>
            <p className="text-sm text-gray-500 mt-2">minutos de estudio</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Recomendaciones</h3>
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{plan?.recommendations.length || 0}</p>
            <p className="text-sm text-gray-500 mt-2">actividades sugeridas</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Progreso</h3>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{plan?.goalProgress || 0}%</p>
            <p className="text-sm text-gray-500 mt-2">hacia tu objetivo</p>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📌 Plan de Estudio Recomendado</h2>
          
          {!plan || plan.recommendations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">{plan && plan.goalProgress > 0 ? '🎉' : '📚'}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {plan && plan.goalProgress > 0 ? '¡Excelente trabajo!' : '¡Comienza tu práctica!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {plan && plan.goalProgress > 0 
                  ? 'Estás al día con todas tus tareas. Puedes explorar nuevo contenido o hacer un simulacro.'
                  : 'Aún no has practicado. Comienza con un test rápido o explora el temario.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/dashboard/theory"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Practicar Más
                </Link>
                <Link
                  href="/dashboard/exam-simulation"
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  Hacer Simulacro
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {plan.recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="text-5xl">{rec.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-800 text-lg">{rec.title}</h3>
                          {getPriorityBadge(rec.priority)}
                        </div>
                        <p className="text-gray-600 mb-3">{rec.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {rec.estimatedTime && (
                            <span className="flex items-center gap-1">
                              <span>⏱️</span>
                              <span>{rec.estimatedTime} min</span>
                            </span>
                          )}
                          {rec.impact && (
                            <span className="flex items-center gap-1">
                              <span>💡</span>
                              <span>{rec.impact}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={rec.actionUrl}
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition ${
                      rec.priority === 'high'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {rec.action} →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consejos adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>✨</span> Método de Estudio Efectivo
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>Comienza con las tareas de alta prioridad</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>Haz descansos de 5-10 minutos cada 25-30 minutos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>Revisa tus errores antes de practicar nuevo contenido</span>
              </li>
              <li className="flex items-start gap-2">
                <span>4.</span>
                <span>Completa el repaso espaciado cada día</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎯</span> Objetivos Diarios
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Estudiar al menos 30-60 minutos al día</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Mantener la racha de estudio activa</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Completar todas las tareas de alta prioridad</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Revisar al menos 10 preguntas del repaso espaciado</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
