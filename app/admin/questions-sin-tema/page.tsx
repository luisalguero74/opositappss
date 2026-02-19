'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  difficulty: string
  reviewStatus: string
  temaCodigo: string | null
  temaId: string | null
}

interface Tema {
  id: string
  numero: number
  titulo: string
  categoria: string
}

export default function QuestionsSinTemaPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [temas, setTemas] = useState<Tema[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedTema, setSelectedTema] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar preguntas sin tema
      const questionsRes = await fetch('/api/admin/questions-sin-tema')
      const questionsData = await questionsRes.json()
      setQuestions(questionsData.questions)
      setTotal(questionsData.total)

      // Cargar temas disponibles
      const temasRes = await fetch('/api/admin/temas-oficiales')
      const temasData = await temasRes.json()
      setTemas(temasData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentIndex]

  const handleSave = async () => {
    if (!selectedTema || !currentQuestion) return

    setSaving(true)
    try {
      const tema = temas.find(t => t.id === selectedTema)
      if (!tema) return

      const temaCodigo = `${tema.categoria === 'general' ? 'G' : 'E'}${tema.numero}`

      await fetch(`/api/admin/questions/${currentQuestion.id}/assign-tema`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temaId: selectedTema,
          temaCodigo: temaCodigo
        })
      })

      // Remover de la lista y avanzar
      const newQuestions = questions.filter((_, i) => i !== currentIndex)
      setQuestions(newQuestions)
      setTotal(total - 1)
      setSelectedTema('')
      
      if (currentIndex >= newQuestions.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    } catch (error) {
      console.error('Error guardando:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedTema('')
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedTema('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando preguntas...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">✅ Todas las preguntas clasificadas</h1>
          <p className="text-gray-600">No hay preguntas pendientes de asignar tema.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clasificar Preguntas sin Tema</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-1">
            {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            Total pendientes: {total}
          </Badge>
        </div>
      </div>

      {currentQuestion && (
        <Card className="p-6 mb-6">
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">{currentQuestion.text}</h2>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded ${
                        idx === currentQuestion.correctAnswer
                          ? 'bg-green-50 border-2 border-green-500'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4">
              <div>Dificultad: <Badge>{currentQuestion.difficulty}</Badge></div>
              <div>Estado: <Badge variant="outline">{currentQuestion.reviewStatus}</Badge></div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Asignar a tema:</label>
              <Select value={selectedTema} onValueChange={setSelectedTema}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tema..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="font-semibold px-2 py-1 text-sm text-gray-500">TEMAS GENERALES</div>
                  {temas.filter(t => t.categoria === 'general').map(tema => (
                    <SelectItem key={tema.id} value={tema.id}>
                      G{tema.numero} - {tema.titulo}
                    </SelectItem>
                  ))}
                  <div className="font-semibold px-2 py-1 text-sm text-gray-500 mt-2">TEMAS ESPECÍFICOS</div>
                  {temas.filter(t => t.categoria === 'especifico').map(tema => (
                    <SelectItem key={tema.id} value={tema.id}>
                      E{tema.numero} - {tema.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              
              <Button
                onClick={handleSkip}
                disabled={currentIndex === questions.length - 1}
                variant="outline"
                className="flex-1"
              >
                Saltar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                onClick={handleSave}
                disabled={!selectedTema || saving}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar y Siguiente'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
