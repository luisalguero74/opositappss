'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from 'next-auth'

interface QualityIssue {
  id: string
  type: 'duplicate' | 'no_correct' | 'incomplete' | 'malformed'
  severity: 'low' | 'medium' | 'high'
  questionId: string
  questionText: string
  details: string
}

export default function AdminQualityControl() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (session && session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/quality-control')
      if (res.ok) {
        const data = await res.json()
        setIssues(data.issues || [])
      }
    } catch (error) {
      console.error('Error fetching quality issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    try {
      setAnalyzing(true)
      const res = await fetch('/api/admin/quality-control', {
        method: 'POST'
      })
      if (res.ok) {
        fetchIssues()
      }
    } catch (error) {
      console.error('Error running analysis:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'duplicate':
        return '📋'
      case 'no_correct':
        return '❌'
      case 'incomplete':
        return '⚠️'
      case 'malformed':
        return '🔧'
      default:
        return '❓'
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'duplicate':
        return 'Pregunta Duplicada'
      case 'no_correct':
        return 'Sin Respuesta Correcta'
      case 'incomplete':
        return 'Incompleta'
      case 'malformed':
        return 'Formato Incorrecto'
      default:
        return 'Desconocido'
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-green-600 hover:text-green-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl mb-3">✅</div>
                <h1 className="text-4xl font-bold text-white">Control de Calidad</h1>
                <p className="text-green-100 mt-2">Validación automática de preguntas</p>
              </div>
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition disabled:opacity-50"
              >
                {analyzing ? '🔄 Analizando...' : '🔍 Ejecutar Análisis'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Alta Severidad</p>
            <p className="text-3xl font-bold text-red-600">
              {issues.filter(i => i.severity === 'high').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Media Severidad</p>
            <p className="text-3xl font-bold text-yellow-600">
              {issues.filter(i => i.severity === 'medium').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Baja Severidad</p>
            <p className="text-3xl font-bold text-blue-600">
              {issues.filter(i => i.severity === 'low').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Problemas</p>
            <p className="text-3xl font-bold text-gray-900">{issues.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Cargando problemas...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Problemas Detectados</h2>

            {issues.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-xl font-semibold">¡Todo perfecto!</p>
                <p className="text-sm mt-2">No se encontraron problemas de calidad</p>
              </div>
            ) : (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getTypeIcon(issue.type)}</span>
                          <h3 className="font-bold text-lg">{getTypeName(issue.type)}</h3>
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-white">
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm mb-2 font-medium">{issue.questionText}</p>
                        <p className="text-sm opacity-75">{issue.details}</p>
                      </div>
                      <Link
                        href={`/admin/preview-forms?highlight=${issue.questionId}`}
                        className="bg-white px-4 py-2 rounded-lg font-semibold hover:shadow-md transition whitespace-nowrap"
                      >
                        🔧 Revisar
                      </Link>
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
