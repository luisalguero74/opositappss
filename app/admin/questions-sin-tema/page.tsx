'use client'

import { useState, useEffect } from 'react'

import { ChevronLeft, ChevronRight, Save, AlertCircle, Sparkles } from 'lucide-react'

// Componentes simples inline
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>{children}</div>
)

const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: string, className?: string }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300 text-gray-700',
    secondary: 'bg-gray-100 text-gray-800'
  }
  return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>{children}</span>
}

const Button = ({ children, onClick, disabled, className = '' }: any) => (
  <button onClick={onClick} disabled={disabled} className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 ${className}`}>{children}</button>
)

const Select = ({ children, value, onValueChange }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange(e.target.value)
  }
  return <select value={value} onChange={handleChange} className="px-4 py-2 border rounded-lg w-full">{children}</select>
}

const SelectTrigger = ({ children }: any) => <>{children}</>
const SelectValue = ({ placeholder }: any) => <option value="">{placeholder}</option>
const SelectContent = ({ children }: any) => <>{children}</>
const SelectItem = ({ children, value }: any) => <option value={value}>{children}</option>

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
      
      // Validar que la respuesta tenga la estructura correcta
      if (questionsData.questions && Array.isArray(questionsData.questions)) {
        setQuestions(questionsData.questions)
        setTotal(questionsData.total || 0)
      } else {
        console.error('Respuesta inesperada del API:', questionsData)
        setQuestions([])
        setTotal(0)
      }

      // Cargar temas disponibles
      const temasRes = await fetch('/api/admin/temas-oficiales')
      const temasData = await temasRes.json()
      setTemas(Array.isArray(temasData) ? temasData : [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      setQuestions([])
      setTotal(0)
      setTemas([])
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

  const handleAutoClassify = async () => {
    if (!confirm('¿Clasificar automáticamente 100 preguntas con IA? Esto tomará ~2 minutos.')) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/auto-classify', { method: 'POST' })
      const data = await res.json()
      
      alert(`✅ Clasificadas: ${data.clasificadas}\n⚠️ Errores: ${data.errores}\n📝 Pendientes: ${data.pendientes}`)
      loadData() // Recargar
    } catch (error) {
      console.error(error)
      alert('Error en clasificación automática')
    } finally {
      setSaving(false)
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
      <div className="mb-6 flex items-center justify-between">
        <div>
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
        <Button 
          onClick={handleAutoClassify} 
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {saving ? 'Clasificando...' : 'Auto-Clasificar (100)'}
        </Button>
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
