'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Questionnaire = {
  id: string
  title: string
  type: string
  category: string | null
  published: boolean
  createdAt: string
  updatedAt: string
  _count: {
    questionnaireQuestions: number
  }
}

type Stats = {
  totalPublicados: number
  totalBorradores: number
  preguntasPublicadas: number
  preguntasBorradores: number
}

export default function ManageQuestionnaires() {
  const router = useRouter()
  const [publicados, setPublicados] = useState<Questionnaire[]>([])
  const [borradores, setBorradores] = useState<Questionnaire[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/questionnaires/manage')
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setPublicados(data.publicados || [])
      setBorradores(data.borradores || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error cargando cuestionarios:', error)
      alert('Error al cargar los cuestionarios')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (id: string, category: string) => {
    if (!confirm('¿Publicar este cuestionario?')) return
    
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/questionnaires/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true, category })
      })
      
      if (res.ok) {
        await loadData()
        alert('✅ Cuestionario publicado')
      } else {
        alert('❌ Error al publicar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setProcessing(null)
    }
  }

  const handleUnpublish = async (id: string) => {
    if (!confirm('¿Despublicar este cuestionario?')) return
    
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/questionnaires/${id}/unpublish`, {
        method: 'POST'
      })
      
      if (res.ok) {
        await loadData()
        alert('✅ Cuestionario despublicado')
      } else {
        alert('❌ Error al despublicar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿ELIMINAR permanentemente "${title}"?\n\nEsta acción NO se puede deshacer.`)) return
    
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/questionnaires/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await loadData()
        alert('✅ Cuestionario eliminado')
      } else {
        alert('❌ Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteAllEmpty = async () => {
    const emptyQuestionnaires = [...publicados, ...borradores].filter(q => q._count.questionnaireQuestions === 0)
    
    if (emptyQuestionnaires.length === 0) {
      alert('No hay cuestionarios vacíos para eliminar')
      return
    }

    if (!confirm(`¿ELIMINAR ${emptyQuestionnaires.length} cuestionarios VACÍOS (0 preguntas)?\n\nEsta acción NO se puede deshacer.`)) return
    
    setDeleting(true)
    let deleted = 0
    let errors = 0

    for (const q of emptyQuestionnaires) {
      try {
        const res = await fetch(`/api/admin/questionnaires/${q.id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          deleted++
        } else {
          errors++
        }
      } catch (error) {
        console.error('Error eliminando:', q.id, error)
        errors++
      }
    }

    setDeleting(false)
    await loadData()
    alert(`✅ Eliminados: ${deleted}\n${errors > 0 ? `❌ Errores: ${errors}` : ''}`)
  }

  const getCategoryBadge = (category: string | null) => {
    if (category === 'general') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">📗 General</span>
    }
    if (category === 'especifico') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">📘 Específico</span>
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Sin categoría</span>
  }

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      theory: { label: '📚 Teoría', color: 'bg-purple-100 text-purple-800' },
      practice: { label: '⚡ Práctica', color: 'bg-orange-100 text-orange-800' },
      simulation: { label: '🎯 Simulación', color: 'bg-red-100 text-red-800' },
      mixed: { label: '🔀 Mixto', color: 'bg-indigo-100 text-indigo-800' }
    }
    const typeInfo = types[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
  }

  const QuestionnaireCard = ({ q, showPublishButton }: { q: Questionnaire; showPublishButton: boolean }) => {
    const isEmpty = q._count.questionnaireQuestions === 0
    
    return (
      <div className={`rounded-lg shadow-md hover:shadow-lg transition p-4 border-2 ${
        isEmpty 
          ? 'bg-red-50 border-red-400' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {isEmpty && (
              <div className="mb-2">
                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                  ⚠️ VACÍO - 0 preguntas
                </span>
              </div>
            )}
            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{q.title}</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {getCategoryBadge(q.category)}
              {getTypeBadge(q.type)}
            </div>
            <p className={`text-sm ${isEmpty ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              📝 {q._count.questionnaireQuestions} preguntas
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Creado: {new Date(q.createdAt).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
          {!isEmpty && (
            <Link
              href={`/admin/questionnaires/${q.id}/preview`}
              className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition"
            >
              👁️ Vista Previa
            </Link>
          )}
          
          {!isEmpty && showPublishButton && (
            <button
              onClick={() => {
                const category = q.category || 'general'
                handlePublish(q.id, category)
              }}
              disabled={processing === q.id}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50"
            >
              {processing === q.id ? '...' : '✅ Publicar'}
            </button>
          )}
          
          {!isEmpty && !showPublishButton && (
            <button
              onClick={() => handleUnpublish(q.id)}
              disabled={processing === q.id}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50"
            >
              {processing === q.id ? '...' : '📤 Despublicar'}
            </button>
          )}
          
          <button
            onClick={() => handleDelete(q.id, q.title)}
            disabled={processing === q.id}
            className={`${isEmpty ? 'flex-1' : ''} bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50`}
          >
            {processing === q.id ? '...' : '🗑️ Eliminar'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cuestionarios...</p>
        </div>
      </div>
    )
  }

  const emptyCount = [...publicados, ...borradores].filter(q => q._count.questionnaireQuestions === 0).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <span>📋</span> Gestión de Cuestionarios
              </h1>
              <p className="text-blue-100 mt-1">Vista previa, publicación y edición de cuestionarios</p>
            </div>
            <Link
              href="/admin"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              ← Volver al Panel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.totalPublicados}</div>
              <div className="text-sm text-gray-600">Cuestionarios Publicados</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">{stats.totalBorradores}</div>
              <div className="text-sm text-gray-600">Borradores</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{stats.preguntasPublicadas}</div>
              <div className="text-sm text-gray-600">Preguntas Publicadas</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{emptyCount}</div>
              <div className="text-sm text-gray-600">Cuestionarios Vacíos</div>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <Link
            href="/admin/questionnaires/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition"
          >
            <span>➕</span> Crear Nuevo Cuestionario
          </Link>

          <button
            onClick={() => setShowOnlyEmpty(!showOnlyEmpty)}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg transition ${
              showOnlyEmpty 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
            }`}
          >
            <span>{showOnlyEmpty ? '📋' : '⚠️'}</span> 
            {showOnlyEmpty ? 'Mostrar Todos' : 'Solo Vacíos'}
          </button>

          {emptyCount > 0 && (
            <button
              onClick={handleDeleteAllEmpty}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition disabled:opacity-50"
            >
              <span>🗑️</span> 
              {deleting ? 'Eliminando...' : `Eliminar Todos los Vacíos (${emptyCount})`}
            </button>
          )}
        </div>

        {/* BORRADORES */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 mb-4 border-l-4 border-yellow-500">
            <h2 className="text-2xl font-bold text-yellow-900 flex items-center gap-2">
              <span>📝</span> Borradores ({showOnlyEmpty ? borradores.filter(q => q._count.questionnaireQuestions === 0).length : borradores.length})
              {showOnlyEmpty && borradores.filter(q => q._count.questionnaireQuestions === 0).length > 0 && (
                <span className="text-sm bg-red-500 text-white px-3 py-1 rounded-full ml-2">
                  {borradores.filter(q => q._count.questionnaireQuestions === 0).length} vacíos
                </span>
              )}
            </h2>
            <p className="text-yellow-700 text-sm mt-1">
              {showOnlyEmpty ? 'Cuestionarios vacíos (0 preguntas)' : 'Cuestionarios pendientes de publicación'}
            </p>
          </div>
          
          {(showOnlyEmpty ? borradores.filter(q => q._count.questionnaireQuestions === 0) : borradores).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
              <p className="text-gray-500">{showOnlyEmpty ? 'No hay borradores vacíos' : 'No hay borradores'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(showOnlyEmpty ? borradores.filter(q => q._count.questionnaireQuestions === 0) : borradores).map(q => (
                <QuestionnaireCard key={q.id} q={q} showPublishButton={true} />
              ))}
            </div>
          )}
        </div>

        {/* PUBLICADOS */}
        <div>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 mb-4 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
              <span>✅</span> Publicados ({showOnlyEmpty ? publicados.filter(q => q._count.questionnaireQuestions === 0).length : publicados.length})
              {showOnlyEmpty && publicados.filter(q => q._count.questionnaireQuestions === 0).length > 0 && (
                <span className="text-sm bg-red-500 text-white px-3 py-1 rounded-full ml-2">
                  {publicados.filter(q => q._count.questionnaireQuestions === 0).length} vacíos
                </span>
              )}
            </h2>
            <p className="text-green-700 text-sm mt-1">
              {showOnlyEmpty ? 'Cuestionarios vacíos (0 preguntas)' : 'Cuestionarios disponibles para los usuarios'}
            </p>
          </div>
          
          {(showOnlyEmpty ? publicados.filter(q => q._count.questionnaireQuestions === 0) : publicados).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
              <p className="text-gray-500">{showOnlyEmpty ? 'No hay cuestionarios publicados vacíos' : 'No hay cuestionarios publicados'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(showOnlyEmpty ? publicados.filter(q => q._count.questionnaireQuestions === 0) : publicados).map(q => (
                <QuestionnaireCard key={q.id} q={q} showPublishButton={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
