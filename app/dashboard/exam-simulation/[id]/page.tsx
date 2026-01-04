'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

const TOTAL_TIME = 120 // 120 minutos
const WARNING_TIME = 30 // alarma a los 30 minutos restantes

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  
  const [theoryQuestions, setTheoryQuestions] = useState<any[]>([])
  const [practicalCase, setPracticalCase] = useState<any>(null)
  const [theoryAnswers, setTheoryAnswers] = useState<string[]>([])
  const [practicalAnswers, setPracticalAnswers] = useState<string[]>([])
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME * 60) // en segundos
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState<'theory' | 'practical'>('theory')
  const [alarmPlayed, setAlarmPlayed] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadExam()
    
    // Crear elemento de audio para la alarma
    audioRef.current = new Audio()
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0v3IgBT2V2fPDeSYGKH7J8dqOPwgZaLvt' // Base64 de un beep corto
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Iniciar contador
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          handleSubmit(true) // Auto-submit cuando se acaba el tiempo
          return 0
        }
        
        // Alarma a los 30 minutos
        if (prev === WARNING_TIME * 60 && !alarmPlayed) {
          playAlarm()
          setAlarmPlayed(true)
        }
        
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [alarmPlayed])

  const loadExam = async () => {
    try {
      const res = await fetch(`/api/exam-simulation/${id}`)
      if (res.ok) {
        const simulation = await res.json()
        const theory = JSON.parse(simulation.theoryQuestions)
        const practical = JSON.parse(simulation.practicalCase)
        
        setTheoryQuestions(theory)
        setPracticalCase(practical)
        setTheoryAnswers(new Array(70).fill(''))
        setPracticalAnswers(new Array(15).fill(''))
      } else {
        alert('Error al cargar el examen')
        router.push('/dashboard/exam-simulation')
      }
    } catch (error) {
      console.error('Error loading exam:', error)
      alert('Error de conexión')
      router.push('/dashboard/exam-simulation')
    } finally {
      setLoading(false)
    }
  }

  const playAlarm = () => {
    if (audioRef.current) {
      // Triple beep
      audioRef.current.play()
      setTimeout(() => audioRef.current?.play(), 300)
      setTimeout(() => audioRef.current?.play(), 600)
    }
  }

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const confirmed = confirm('¿Estás seguro de que quieres enviar el examen? No podrás volver a modificar las respuestas.')
      if (!confirmed) return
    }

    setSubmitting(true)
    
    const timeSpent = TOTAL_TIME - Math.floor(timeRemaining / 60)

    try {
      const res = await fetch(`/api/exam-simulation/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theoryAnswers,
          practicalAnswers,
          timeSpent
        })
      })

      if (res.ok) {
        const result = await res.json()
        router.push(`/dashboard/exam-simulation/results/${id}?score=${result.score}&theory=${result.theoryScore}&practical=${result.practicalScore}`)
      } else {
        alert('Error al enviar respuestas')
      }
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isWarningTime = timeRemaining <= WARNING_TIME * 60

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando examen...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Timer Header - Sticky */}
        <div className={`sticky top-0 z-50 rounded-xl shadow-lg p-6 mb-6 ${
          isWarningTime 
            ? 'bg-gradient-to-r from-red-600 to-pink-600 animate-pulse' 
            : 'bg-gradient-to-r from-purple-600 to-indigo-600'
        }`}>
          <div className="flex items-center justify-between text-white">
            <div>
              <h1 className="text-2xl font-bold">📝 Simulacro de Examen</h1>
              <p className="text-sm opacity-90">
                {currentSection === 'theory' ? 'Parte 1: Test de Temario (70 preguntas)' : 'Parte 2: Supuesto Práctico (15 preguntas)'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{formatTime(timeRemaining)}</div>
              <p className="text-sm opacity-90">
                {isWarningTime ? '⚠️ ÚLTIMOS 30 MINUTOS' : 'Tiempo restante'}
              </p>
            </div>
          </div>
        </div>

        {/* Navegación de secciones */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex gap-4">
          <button
            onClick={() => setCurrentSection('theory')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              currentSection === 'theory'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Parte 1: Teoría (70)
          </button>
          <button
            onClick={() => setCurrentSection('practical')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              currentSection === 'practical'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💼 Parte 2: Práctico (15)
          </button>
        </div>

        {/* Teoría */}
        {currentSection === 'theory' && (
          <div className="space-y-6">
            {theoryQuestions.map((q, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg p-6">
                <p className="font-bold text-lg text-gray-900 mb-4">
                  {idx + 1}. {q.text}
                </p>
                <div className="space-y-3">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label key={optIdx} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition">
                      <input
                        type="radio"
                        name={`theory-${idx}`}
                        value={opt}
                        checked={theoryAnswers[idx] === opt}
                        onChange={(e) => {
                          const newAnswers = [...theoryAnswers]
                          newAnswers[idx] = e.target.value
                          setTheoryAnswers(newAnswers)
                        }}
                        className="mt-1 w-5 h-5"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Práctico */}
        {currentSection === 'practical' && practicalCase && (
          <div className="space-y-6">
            {/* Enunciado */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-lg p-8 border-2 border-orange-200">
              <h2 className="text-2xl font-bold text-orange-900 mb-4">📄 Enunciado del Caso Práctico</h2>
              <div className="text-gray-800 whitespace-pre-wrap">{practicalCase.enunciado}</div>
            </div>

            {/* Preguntas */}
            {practicalCase.questions.map((q: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg p-6">
                <p className="font-bold text-lg text-gray-900 mb-4">
                  {idx + 1}. {q.text}
                </p>
                <div className="space-y-3">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label key={optIdx} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition">
                      <input
                        type="radio"
                        name={`practical-${idx}`}
                        value={opt}
                        checked={practicalAnswers[idx] === opt}
                        onChange={(e) => {
                          const newAnswers = [...practicalAnswers]
                          newAnswers[idx] = e.target.value
                          setPracticalAnswers(newAnswers)
                        }}
                        className="mt-1 w-5 h-5"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white rounded-xl shadow-lg p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-gray-700">
              <p className="font-semibold">Progreso:</p>
              <p className="text-sm">
                Teoría: {theoryAnswers.filter(a => a).length}/70 | 
                Práctico: {practicalAnswers.filter(a => a).length}/15
              </p>
            </div>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : '✅ Finalizar y Enviar Examen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
