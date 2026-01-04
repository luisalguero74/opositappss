'use client'

import { useState, useEffect } from 'react'

interface Topic {
  id: string
  topic: string
  count: number
}

interface TopicDifficultySelectorProps {
  onSelectionChange: (data: {
    generalTopics: string[]
    specificTopics: string[]
    difficulty: 'todas' | 'facil' | 'media' | 'dificil'
  }) => void
  showDifficulty?: boolean
}

export default function TopicDifficultySelector({ 
  onSelectionChange,
  showDifficulty = true 
}: TopicDifficultySelectorProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGeneral, setSelectedGeneral] = useState<string[]>([])
  const [selectedSpecific, setSelectedSpecific] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<'todas' | 'facil' | 'media' | 'dificil'>('todas')

  useEffect(() => {
    loadTopics()
  }, [])

  useEffect(() => {
    onSelectionChange({
      generalTopics: selectedGeneral,
      specificTopics: selectedSpecific,
      difficulty
    })
  }, [selectedGeneral, selectedSpecific, difficulty])

  const loadTopics = async () => {
    try {
      const res = await fetch('/api/custom-test/topics')
      if (res.ok) {
        const data = await res.json()
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.all)
            ? data.all
            : []
        setTopics(normalized)
      } else {
        console.error('Error en API:', res.status)
        // Mantener los temas previos si ya estaban cargados
      }
    } catch (error) {
      console.error('Error loading topics:', error)
      // Mantener los temas previos si ya estaban cargados
    } finally {
      setLoading(false)
    }
  }

  const generalTopics = Array.isArray(topics) ? topics.filter(t => t.id.toLowerCase().startsWith('g')) : []
  const specificTopics = Array.isArray(topics) ? topics.filter(t => t.id.toLowerCase().startsWith('e')) : []

  const toggleTopic = (topicId: string, isGeneral: boolean) => {
    if (isGeneral) {
      setSelectedGeneral(prev =>
        prev.includes(topicId)
          ? prev.filter(id => id !== topicId)
          : [...prev, topicId]
      )
    } else {
      setSelectedSpecific(prev =>
        prev.includes(topicId)
          ? prev.filter(id => id !== topicId)
          : [...prev, topicId]
      )
    }
  }

  const selectAllGeneral = () => {
    setSelectedGeneral(generalTopics.map(t => t.id))
  }

  const clearGeneral = () => {
    setSelectedGeneral([])
  }

  const selectAllSpecific = () => {
    setSelectedSpecific(specificTopics.map(t => t.id))
  }

  const clearSpecific = () => {
    setSelectedSpecific([])
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-2">⏳</div>
        <p className="text-gray-600">Cargando temas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Difficulty Selector */}
      {showDifficulty && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Nivel de Dificultad</h3>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg"
          >
            <option value="todas">Todas las dificultades</option>
            <option value="facil">🟢 Fácil</option>
            <option value="media">🟡 Media</option>
            <option value="dificil">🔴 Difícil</option>
          </select>
        </div>
      )}

      {/* General Topics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">📚 Temario General</h3>
          <div className="space-x-2">
            <button
              onClick={selectAllGeneral}
              className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Todos
            </button>
            <button
              onClick={clearGeneral}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Ninguno
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {generalTopics.map(topic => (
            <button
              key={topic.id}
              onClick={() => toggleTopic(topic.id, true)}
              className={`text-left p-3 rounded-lg border-2 transition ${
                selectedGeneral.includes(topic.id)
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">
                {topic.topic}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {topic.count} preguntas
              </div>
            </button>
          ))}
        </div>
        {selectedGeneral.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            ✓ {selectedGeneral.length} temas seleccionados
          </div>
        )}
      </div>

      {/* Specific Topics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🎓 Temario Específico</h3>
          <div className="space-x-2">
            <button
              onClick={selectAllSpecific}
              className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              Todos
            </button>
            <button
              onClick={clearSpecific}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Ninguno
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {specificTopics.map(topic => (
            <button
              key={topic.id}
              onClick={() => toggleTopic(topic.id, false)}
              className={`text-left p-3 rounded-lg border-2 transition ${
                selectedSpecific.includes(topic.id)
                  ? 'border-purple-500 bg-purple-50 text-purple-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">
                {topic.topic}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {topic.count} preguntas
              </div>
            </button>
          ))}
        </div>
        {selectedSpecific.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            ✓ {selectedSpecific.length} temas seleccionados
          </div>
        )}
      </div>
    </div>
  )
}
