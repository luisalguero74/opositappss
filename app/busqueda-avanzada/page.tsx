'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  temaCodigo: string
  temaNumero: number
  temaTitulo: string
}

export default function AdvancedSearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTema, setSelectedTema] = useState('')
  const [onlyFailed, setOnlyFailed] = useState(false)
  const [onlyMarked, setOnlyMarked] = useState(false)
  const [results, setResults] = useState<Question[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    setSearching(true)
    setSearched(true)

    const params = new URLSearchParams()
    if (searchQuery) params.append('q', searchQuery)
    if (selectedTema) params.append('tema', selectedTema)
    if (onlyFailed) params.append('failed', 'true')
    if (onlyMarked) params.append('marked', 'true')

    try {
      const response = await fetch(`/api/questions/search?${params}`)
      const data = await response.json()
      setResults(data.questions || [])
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔍</span>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Búsqueda Avanzada</h1>
            </div>
            <Link
              href="/dashboard"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Volver
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Encuentra preguntas específicas usando múltiples filtros
          </p>
        </div>

        {/* Search Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            {/* Text Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Buscar por texto
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escribe palabras clave..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Tema Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por tema
              </label>
              <input
                type="text"
                value={selectedTema}
                onChange={(e) => setSelectedTema(e.target.value)}
                placeholder="Ej: LGSS, RD, Ley 40/2015..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyFailed}
                  onChange={(e) => setOnlyFailed(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Solo preguntas falladas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyMarked}
                  onChange={(e) => setOnlyMarked(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Solo preguntas marcadas</span>
              </label>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50"
            >
              {searching ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Resultados: {results.length} {results.length === 1 ? 'pregunta encontrada' : 'preguntas encontradas'}
            </h2>

            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4">🔍</div>
                <p>No se encontraron preguntas con esos criterios</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          {question.temaNumero && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Tema {question.temaNumero}: {question.temaTitulo}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{question.text}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/question/${question.id}`)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
