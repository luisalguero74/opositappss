'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminExamOfficialPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      checkAdmin()
    }
  }, [status, router])

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/exam-official')
      if (res.status === 403) {
        alert('Acceso denegado: Solo administradores')
        router.push('/dashboard')
        return
      }
      if (!res.ok) throw new Error('Error al cargar exámenes')
      const data = await res.json()
      setExams(data.exams || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (examId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/exam-official', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, active: !currentActive })
      })
      if (!res.ok) throw new Error('Error al actualizar')
      await checkAdmin()
      alert(!currentActive ? 'Examen activado' : 'Examen desactivado')
    } catch (error) {
      alert('Error al actualizar examen')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestión de Exámenes Oficiales</h1>
              <p className="text-gray-600 mt-1">Crear y administrar exámenes con sistema de puntuación -0.25</p>
            </div>
            <Link
              href="/admin"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              ← Volver
            </Link>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Importante:</h3>
            <ul className="text-yellow-800 text-sm space-y-1">
              <li>• Para crear un examen, necesitas preparar un archivo JSON con 70 preguntas + supuesto práctico</li>
              <li>• Solo un examen puede estar activo a la vez</li>
              <li>• Las preguntas deben tener 4 opciones (A, B, C, D) y explicación</li>
              <li>• Formato esperado se describe en la documentación técnica</li>
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Examen</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm mb-4">
                Para crear un examen oficial, usa la API directamente o importa desde archivo JSON.
              </p>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-mono">POST /api/admin/exam-official</p>
                <p className="text-xs text-gray-500">Body: {'{ title, description, testQuestions: [...70], practicalCase: { statement, questions: [...15] } }'}</p>
              </div>
              <div className="mt-4">
                <Link
                  href="/admin/exam-official/create"
                  className="inline-block bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg"
                >
                  Crear Examen con Formulario →
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Exámenes Existentes ({exams.length})</h2>
            {exams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay exámenes oficiales creados todavía.
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => (
                  <div key={exam.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{exam.title}</h3>
                          {exam.active && (
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                              ACTIVO
                            </span>
                          )}
                          {!exam.published && (
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                              BORRADOR
                            </span>
                          )}
                        </div>
                        {exam.description && (
                          <p className="text-gray-600 text-sm mb-2">{exam.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📝 {exam._count.attempts} intentos</span>
                          <span>📅 Creado: {new Date(exam.createdAt).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(exam.id, exam.active)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                            exam.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {exam.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
