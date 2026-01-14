'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHelpButton from '@/components/AdminHelpButton'

export default function Admin() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('theory')
  const [questionsJson, setQuestionsJson] = useState('')
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [showQuestionsSubmenu, setShowQuestionsSubmenu] = useState(false)
  const [showReviewSubmenu, setShowReviewSubmenu] = useState(false)

  useEffect(() => {
    if (session && session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const questions = JSON.parse(questionsJson)
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, questions, solution })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cuestionario subido exitosamente' })
        setTitle('')
        setQuestionsJson('')
        setSolution('')
      } else {
        setMessage({ type: 'error', text: 'Error al subir el cuestionario' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: JSON inválido o problema de conexión' })
    } finally {
      setLoading(false)
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">No autorizado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6">
      <AdminHelpButton />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">← Volver al Dashboard</Link>
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h1 className="text-4xl font-bold text-white">Panel de Administrador</h1>
              <p className="text-red-100 mt-2">Gestiona los cuestionarios de la plataforma</p>
            </div>
          </div>
        </div>

        {/* Tarjetas de acceso rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📄</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Crear Formulario Temario desde PDF</h2>
              <p className="text-gray-600 mb-4 text-sm">Carga un PDF con preguntas y genera automáticamente cuestionarios interactivos.</p>
              <Link href="/admin/create-formulario" className="inline-block bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-teal-600 hover:to-emerald-700 transition text-sm">
                Subir PDF →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📋</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Vista Previa de Formularios</h2>
              <p className="text-gray-600 mb-4 text-sm">Revisa y publica los cuestionarios creados antes de hacerlos visibles a los usuarios.</p>
              <Link href="/admin/preview-forms" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition text-sm">
                Ver Formularios →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">👥</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Gestión de Usuarios</h2>
              <p className="text-gray-600 mb-4 text-sm">Administra usuarios, cambia roles y visualiza el historial completo de actividad de cada usuario.</p>
              <Link href="/admin/users" className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition text-sm">
                Gestionar Usuarios →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📝</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Exámenes Oficiales</h2>
              <p className="text-gray-600 mb-4 text-sm">Gestiona exámenes con sistema de puntuación -0.25. 70 preguntas + supuesto práctico.</p>
              <Link href="/admin/exam-official" className="inline-block bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition text-sm">
                Gestionar Exámenes →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-slate-600 to-gray-800 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🔐</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Cambiar mi contraseña</h2>
              <p className="text-gray-600 mb-4 text-sm">Cambia tu contraseña de admin introduciendo la contraseña actual.</p>
              <Link href="/admin/users#change-password" className="inline-block bg-gradient-to-r from-slate-600 to-gray-800 text-white font-semibold px-5 py-2 rounded-lg hover:from-slate-700 hover:to-gray-900 transition text-sm">
                Cambiar contraseña →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-slate-700 to-gray-900 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">✉️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Probar envío de emails</h2>
              <p className="text-gray-600 mb-4 text-sm">Envía un correo de prueba para verificar Resend y el dominio.</p>
              <Link href="/admin/test-email" className="inline-block bg-gradient-to-r from-slate-700 to-gray-900 text-white font-semibold px-5 py-2 rounded-lg hover:from-slate-800 hover:to-black transition text-sm">
                Enviar prueba →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">💰</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Sistema de Monetización</h2>
              <p className="text-gray-600 mb-4 text-sm">Configura planes de suscripción, precios y controla el acceso de usuarios mediante pagos.</p>
              <Link href="/admin/monetization" className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-sm">
                Configurar Monetización →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🎯</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Monetización sin Suscripción</h2>
              <p className="text-gray-600 mb-4 text-sm">Activa anuncios, afiliados, donaciones y patrocinios sin que los usuarios paguen.</p>
              <Link href="/admin/monetization-free" className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold px-5 py-2 rounded-lg hover:from-amber-500 hover:to-orange-600 transition text-sm">
                Configurar Opciones →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📊</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Estadísticas del Sistema</h2>
              <p className="text-gray-600 mb-4 text-sm">Analiza el rendimiento global y por usuario. Identifica errores repetidos y patrones de aprendizaje.</p>
              <Link href="/admin/statistics" className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm">
                Ver Estadísticas →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🎥</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Panel de Moderación</h2>
              <p className="text-gray-600 mb-4 text-sm">Controla salas de videollamada activas. Silencia, expulsa participantes y modera el foro.</p>
              <Link href="/admin/rooms" className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition text-sm">
                Ir a Moderación →
              </Link>
            </div>
          </div>

          {/* NUEVAS FUNCIONALIDADES AVANZADAS */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📊</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Analytics Avanzado</h2>
              <p className="text-gray-600 mb-4 text-sm">Estadísticas completas: usuarios activos, preguntas difíciles, engagement y monetización.</p>
              <Link href="/admin/analytics" className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition text-sm">
                Ver Dashboard →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-slate-600 to-gray-900 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🔍</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Auditoría y Logs</h2>
              <p className="text-gray-600 mb-4 text-sm">Registro completo de acciones administrativas, cambios y accesos al sistema.</p>
              <Link href="/admin/audit-logs" className="inline-block bg-gradient-to-r from-slate-600 to-gray-900 text-white font-semibold px-5 py-2 rounded-lg hover:from-slate-700 hover:to-black transition text-sm">
                Ver Logs →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">💾</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Backups y Exportación</h2>
              <p className="text-gray-600 mb-4 text-sm">Crea backups manuales, descarga datos en JSON/CSV y gestiona restauraciones.</p>
              <Link href="/admin/backups" className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm">
                Gestionar Backups →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">✅</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Control de Calidad</h2>
              <p className="text-gray-600 mb-4 text-sm">Detecta preguntas duplicadas, incompletas, sin respuesta correcta o malformadas.</p>
              <Link href="/admin/quality-control" className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-sm">
                Validar Preguntas →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🎓</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Gestión de Aulas Virtuales</h2>
              <p className="text-gray-600 mb-4 text-sm">Crea y gestiona aulas virtuales con Jitsi Meet. Programa sesiones y envía invitaciones.</p>
              <Link href="/admin/classrooms" className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition text-sm">
                Gestionar Aulas →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🏆</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Celebración 100%</h2>
              <p className="text-gray-600 mb-4 text-sm">Vista previa de la celebración que ven los usuarios al conseguir el 100% de aciertos.</p>
              <Link href="/admin/celebration-preview" className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold px-5 py-2 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition text-sm">
                Ver Celebración →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📚</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Gestor de Temario Oficial</h2>
              <p className="text-gray-600 mb-4 text-sm">Gestiona los 36 temas del temario oficial. Sube documentación, PDFs y material de estudio.</p>
              <Link href="/admin/temario-manager" className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition text-sm">
                Gestionar Temario →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📄</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Conversor OCR de PDF</h2>
              <p className="text-gray-600 mb-4 text-sm">Extrae texto de PDFs con OCR y guarda en Temarios o Biblioteca Legal automáticamente.</p>
              <Link href="/admin/ocr-converter" className="inline-block bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold px-5 py-2 rounded-lg hover:from-orange-500 hover:to-red-600 transition text-sm">
                Convertir PDF →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">⚖️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Biblioteca Legal</h2>
              <p className="text-gray-600 mb-4 text-sm">Gestiona documentos legales compartidos. Evita duplicación asociando leyes a múltiples temas.</p>
              <Link href="/admin/biblioteca-legal" className="inline-block bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-violet-600 hover:to-purple-700 transition text-sm">
                Ir a Biblioteca →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📱✅</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Teléfonos Permitidos</h2>
              <p className="text-gray-600 mb-4 text-sm">Gestiona la lista de números autorizados para registro. Añade, edita o elimina teléfonos permitidos.</p>
              <Link href="/admin/allowed-phones" className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-sm">
                Gestionar Números →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📰</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Base de Datos de Preguntas</h2>
              <p className="text-gray-600 mb-4 text-sm">Visualiza, gestiona y corrige preguntas de tests y supuestos prácticos.</p>
              
              <button
                onClick={() => setShowQuestionsSubmenu(!showQuestionsSubmenu)}
                className="w-full inline-flex items-center justify-between bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition text-sm mb-3"
              >
                <span>Opciones</span>
                <span className="text-xl">{showQuestionsSubmenu ? '▲' : '▼'}</span>
              </button>

              {showQuestionsSubmenu && (
                <div className="space-y-2 mt-3 pl-2 border-l-4 border-amber-500">
                  <Link href="/admin/questions" className="block text-gray-700 hover:text-amber-600 font-medium text-sm py-2 px-3 hover:bg-amber-50 rounded transition">
                    📋 Ver Base de Datos
                  </Link>
                  <Link href="/admin/questions-quality" className="block text-gray-700 hover:text-amber-600 font-medium text-sm py-2 px-3 hover:bg-amber-50 rounded transition">
                    ✨ Control de Calidad
                  </Link>
                  <Link href="/admin/questions-review" className="block text-gray-700 hover:text-amber-600 font-medium text-sm py-2 px-3 hover:bg-amber-50 rounded transition">
                    ✏️ Revisar Preguntas
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🤖</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Generador de Preguntas IA</h2>
              <p className="text-gray-600 mb-4 text-sm">Sube documentos legales y genera preguntas automáticamente con Ollama (IA local y gratuita).</p>
              <Link href="/admin/ai-documents" className="inline-block bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-violet-600 hover:to-fuchsia-700 transition text-sm">
                Generar con IA →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🚀📚</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Generador Masivo de Preguntas</h2>
              <p className="text-gray-600 mb-4 text-sm">Genera preguntas automáticamente para TODO el temario general o específico con un solo clic.</p>
              <Link href="/admin/bulk-questions-generator" className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm">
                Generar Masivamente →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📋✏️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Revisar y Gestionar Preguntas</h2>
              <p className="text-gray-600 mb-4 text-sm">Edita, revisa y publica preguntas generadas. Controla qué aparece en el menú de usuario.</p>

              <button
                onClick={() => setShowReviewSubmenu(!showReviewSubmenu)}
                className="w-full inline-flex items-center justify-between bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition text-sm mb-3"
              >
                <span>Opciones</span>
                <span className="text-xl">{showReviewSubmenu ? '▲' : '▼'}</span>
              </button>

              {showReviewSubmenu && (
                <div className="space-y-2 mt-3 pl-2 border-l-4 border-cyan-500">
                  <Link href="/admin/questions-review" className="block text-gray-700 hover:text-cyan-700 font-medium text-sm py-2 px-3 hover:bg-cyan-50 rounded transition">
                    📋 Revisar y Gestionar
                  </Link>
                  <Link href="/admin/questions-quality" className="block text-gray-700 hover:text-cyan-700 font-medium text-sm py-2 px-3 hover:bg-cyan-50 rounded transition">
                    ✨ Revisión de Calidad
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📝</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Estadísticas de Simulacros</h2>
              <p className="text-gray-600 mb-4 text-sm">Analiza el rendimiento de los usuarios en simulacros de examen con 70+15 preguntas.</p>
              <Link href="/admin/exam-stats" className="inline-block bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-pink-600 hover:to-rose-700 transition text-sm">
                Ver Estadísticas →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📋</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Supuestos Prácticos Manual</h2>
              <p className="text-gray-600 mb-4 text-sm">Gestiona casos prácticos creados manualmente con seguimiento de intentos y análisis de errores.</p>
              <Link href="/admin/practical-cases" className="inline-block bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition text-sm">
                Gestionar Casos →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🎯</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Generador de Tests HTML</h2>
              <p className="text-gray-600 mb-4 text-sm">Crea tests interactivos descargables con corrección automática y celebración al 100%.</p>
              <Link href="/admin/test-generator" className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition text-sm">
                Generar Tests →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105 relative">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🤖📋</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Generador Supuestos IA</h2>
              <p className="text-gray-600 mb-4 text-sm">Crea y gestiona supuestos prácticos mediante IA basados en exámenes reales de administrativos de la SS.</p>
              <button
                onClick={() => setShowAISubmenu(!showAISubmenu)}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-fuchsia-600 hover:to-purple-700 transition text-sm flex items-center justify-between"
              >
                <span>Menú IA</span>
                <span className="text-xl">{showAISubmenu ? '▲' : '▼'}</span>
              </button>
              
              {showAISubmenu && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Link 
                    href="/admin/generate-practical-ai" 
                    className="block bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold px-4 py-3 rounded-lg transition text-sm border border-purple-200"
                  >
                    ✨ Generar Nuevo Supuesto
                  </Link>
                  <Link 
                    href="/admin/practical-cases" 
                    className="block bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 font-semibold px-4 py-3 rounded-lg transition text-sm border border-fuchsia-200"
                  >
                    📝 Editar Supuestos Existentes
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📝</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Formularios HTML Interactivos</h2>
              <p className="text-gray-600 mb-4 text-sm">Genera formularios HTML completos a partir de preguntas de IA con todas las funcionalidades.</p>
              <Link href="/admin/create-formulario" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-sm">
                Crear Formulario HTML →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📰🔔</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Monitor de Actualizaciones BOE</h2>
              <p className="text-gray-600 mb-4 text-sm">Monitoriza actualizaciones automáticas de leyes, RD y órdenes ministeriales desde el BOE oficial.</p>
              <Link href="/admin/actualizaciones-boe" className="inline-block bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 transition text-sm">
                Ver Actualizaciones →
              </Link>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 px-6 py-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Nuevo Cuestionario (Método Manual)</h2>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Título del Cuestionario</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition"
              placeholder="Ej: Cuestionario Tema 1 - Introducción"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Tipo de Cuestionario</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition"
            >
              <option value="theory">📚 Temario</option>
              <option value="practical">💼 Supuesto Práctico</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Preguntas (Formato JSON)</label>
            <textarea
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm h-64"
              placeholder='[{"text": "¿Pregunta?", "options": ["Opción A", "Opción B", "Opción C"], "correctAnswer": "Opción A", "explanation": "Explicación detallada"}]'
              required
            />
            <p className="text-xs text-gray-500 mt-2">Formato JSON con array de objetos. Cada pregunta debe tener: text, options, correctAnswer y explanation</p>
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-semibold mb-2">Solución (Opcional)</label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition h-32"
              placeholder="Texto con la solución completa del supuesto práctico (opcional)"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-4 rounded-lg hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Subiendo...' : '📤 Subir Cuestionario'}
          </button>
        </form>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-800 mb-2">💡 Consejos:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Asegúrate de que el JSON esté bien formateado antes de enviar</li>
            <li>• Las opciones deben ser un array de strings</li>
            <li>• La respuesta correcta debe coincidir exactamente con una de las opciones</li>
            <li>• Incluye explicaciones claras para ayudar al aprendizaje</li>
            <li>• Para crear formularios desde PDF, usa la nueva opción "Crear Formulario desde PDF"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
