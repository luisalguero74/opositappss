'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

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

  useEffect(() => {
    if (session && session.user && session.user.role?.toLowerCase() !== 'admin') {
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

  if (!session || !session.user || session.user.role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">No autorizado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Panel Administrador
              </h1>
              <p className="text-red-100 text-sm mt-1">Gestión completa de la plataforma</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-white hover:text-red-100 text-sm font-medium transition">
                ← Dashboard
              </Link>
              <Link href="/admin/monetization" className="text-white hover:text-red-100 text-sm font-medium transition">
                💎 Suscripciones
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* 1️⃣ SECCIÓN: GESTIÓN DE PREGUNTAS */}
          <div className="mb-6 mt-6">
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3 mb-3 border-l-4 border-indigo-600">
              <h2 className="text-xl font-bold text-indigo-900">1️⃣ Gestión de Preguntas</h2>
              <p className="text-indigo-700 text-sm">Sistema completo de revisión, validación y creación de cuestionarios</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {/* Gestor Unificado */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition border-2 border-indigo-500">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-3 flex flex-col items-center justify-center relative">
                  <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold">⭐ TOP</div>
                  <div className="text-white text-3xl mb-1">🎯</div>
                  <h2 className="text-xs font-bold text-white text-center">Gestor Unificado</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Explorar, filtrar, validar.</p>
                  <Link href="/admin/questions-manager" className="inline-block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-800 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📋</div>
                  <h2 className="text-xs font-bold text-white text-center">Revisar Preguntas</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Por cuestionarios.</p>
                  <Link href="/admin/questions-review" className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition text-xs">Revisar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">⭐</div>
                  <h2 className="text-xs font-bold text-white text-center">Control Calidad</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Análisis IA.</p>
                  <Link href="/admin/questions-quality" className="inline-block w-full text-center bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-rose-600 hover:to-pink-700 transition text-xs">Analizar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📰</div>
                  <h2 className="text-xs font-bold text-white text-center">Base Datos</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Todas las preguntas.</p>
                  <Link href="/admin/questions" className="inline-block w-full text-center bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📥</div>
                  <h2 className="text-xs font-bold text-white text-center">Importar JSON</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Ficheros JSON.</p>
                  <Link href="/admin/import-questions" className="inline-block w-full text-center bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-600 hover:to-violet-700 transition text-xs">Importar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">➕</div>
                  <h2 className="text-xs font-bold text-white text-center">Crear Manual</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Alta manual.</p>
                  <Link href="/admin/questions-create" className="inline-block w-full text-center bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-600 hover:to-violet-700 transition text-xs">Crear →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-cyan-500 to-sky-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🏷️</div>
                  <h2 className="text-xs font-bold text-white text-center">Revisar Temas</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Metadatos.</p>
                  <Link href="/admin/tema-metadata-review" className="inline-block w-full text-center bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-cyan-600 hover:to-sky-700 transition text-xs">Revisar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🧠</div>
                  <h2 className="text-xs font-bold text-white text-center">Prompt Helper</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Prompts IA.</p>
                  <Link href="/admin/ai-prompt-helper" className="inline-block w-full text-center bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-violet-600 hover:to-purple-700 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🗓️</div>
                  <h2 className="text-xs font-bold text-white text-center">Test Planner</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Planificación.</p>
                  <Link href="/admin/test-planner" className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🎯</div>
                  <h2 className="text-xs font-bold text-white text-center">Tests HTML</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Descargables.</p>
                  <Link href="/admin/test-generator" className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition text-xs">Generar →</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2️⃣ SECCIÓN: GENERACIÓN CON IA */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-purple-100 to-fuchsia-100 rounded-lg p-3 mb-3 border-l-4 border-purple-600">
              <h2 className="text-xl font-bold text-purple-900">2️⃣ Generación con Inteligencia Artificial</h2>
              <p className="text-purple-700 text-sm">Crea contenido automáticamente con IA avanzada</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🚀</div>
                  <h2 className="text-xs font-bold text-white text-center">Generador Masivo</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">TODO el temario.</p>
                  <Link href="/admin/bulk-questions-generator" className="inline-block w-full text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-xs">Generar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🤖</div>
                  <h2 className="text-xs font-bold text-white text-center">IA Documentos</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Sube y genera.</p>
                  <Link href="/admin/ai-documents" className="inline-block w-full text-center bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-violet-600 hover:to-fuchsia-700 transition text-xs">Generar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📋</div>
                  <h2 className="text-xs font-bold text-white text-center">Supuestos IA</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Casos prácticos.</p>
                  <Link href="/admin/generate-practical-ai" className="inline-block w-full text-center bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-fuchsia-600 hover:to-purple-700 transition text-xs">Generar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📝</div>
                  <h2 className="text-xs font-bold text-white text-center">Formularios HTML</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Interactivos.</p>
                  <Link href="/admin/create-formulario" className="inline-block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-xs">Crear →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📄</div>
                  <h2 className="text-xs font-bold text-white text-center">Desde PDF</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Auto-genera.</p>
                  <Link href="/admin/create-formulario" className="inline-block w-full text-center bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-teal-600 hover:to-emerald-700 transition text-xs">Subir →</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 3️⃣ SECCIÓN: CONTENIDO Y DOCUMENTACIÓN */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-3 mb-3 border-l-4 border-amber-600">
              <h2 className="text-xl font-bold text-amber-900">3️⃣ Contenido y Documentación</h2>
              <p className="text-amber-700 text-sm">Gestión de temarios, documentos legales y repositorio</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📚</div>
                  <h2 className="text-xs font-bold text-white text-center">Temario Oficial</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">36 temas oficiales.</p>
                  <Link href="/admin/temario-manager" className="inline-block w-full text-center bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">⚖️</div>
                  <h2 className="text-xs font-bold text-white text-center">Biblioteca Legal</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Docs legales.</p>
                  <Link href="/admin/biblioteca-legal" className="inline-block w-full text-center bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-violet-600 hover:to-purple-700 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-600 to-gray-800 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📁</div>
                  <h2 className="text-xs font-bold text-white text-center">Repositorio</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Gestión archivos.</p>
                  <Link href="/admin/repositorio" className="inline-block w-full text-center bg-gradient-to-r from-slate-600 to-gray-800 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-700 hover:to-gray-900 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-orange-400 to-red-500 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📄</div>
                  <h2 className="text-xs font-bold text-white text-center">OCR Converter</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Extrae texto.</p>
                  <Link href="/admin/ocr-converter" className="inline-block w-full text-center bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold px-3 py-2 rounded-lg hover:from-orange-500 hover:to-red-600 transition text-xs">Convertir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-600 to-gray-800 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🗄️</div>
                  <h2 className="text-xs font-bold text-white text-center">Backups</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Copias seguridad.</p>
                  <Link href="/admin/backups" className="inline-block w-full text-center bg-gradient-to-r from-slate-600 to-gray-800 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-700 hover:to-gray-900 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📋</div>
                  <h2 className="text-xs font-bold text-white text-center">Preview Forms</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Revisar antes.</p>
                  <Link href="/admin/preview-forms" className="inline-block w-full text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-stone-600 to-zinc-700 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🔄</div>
                  <h2 className="text-xs font-bold text-white text-center">Actualizar PDF</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Mant. PDF.</p>
                  <Link href="/admin/update-pdf-content" className="inline-block w-full text-center bg-gradient-to-r from-stone-600 to-zinc-700 text-white font-semibold px-3 py-2 rounded-lg hover:from-stone-700 hover:to-zinc-800 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📰</div>
                  <h2 className="text-xs font-bold text-white text-center">Monitor BOE</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Actualizaciones.</p>
                  <Link href="/admin/actualizaciones-boe" className="inline-block w-full text-center bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📝</div>
                  <h2 className="text-xs font-bold text-white text-center">Exámenes</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Oficiales.</p>
                  <Link href="/admin/exam-official" className="inline-block w-full text-center bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-amber-600 hover:to-orange-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">➕</div>
                  <h2 className="text-xs font-bold text-white text-center">Crear Examen</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Oficial nuevo.</p>
                  <Link href="/admin/exam-official/create" className="inline-block w-full text-center bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition text-xs">Crear →</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 4️⃣ SECCIÓN: USUARIOS Y MONETIZACIÓN */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-3 mb-3 border-l-4 border-emerald-600">
              <h2 className="text-xl font-bold text-emerald-900">4️⃣ Usuarios y Monetización</h2>
              <p className="text-emerald-700 text-sm">Gestión de usuarios, suscripciones y analíticas</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">👥</div>
                  <h2 className="text-xs font-bold text-white text-center">Usuarios</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Gestión completa.</p>
                  <Link href="/admin/users" className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">💳</div>
                  <h2 className="text-xs font-bold text-white text-center">Suscripciones</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Estado usuarios.</p>
                  <Link href="/admin/subscriptions" className="inline-block w-full text-center bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold px-3 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-800 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">💰</div>
                  <h2 className="text-xs font-bold text-white text-center">Monetización</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Planes y precios.</p>
                  <Link href="/admin/monetization" className="inline-block w-full text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-xs">Config →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🎯</div>
                  <h2 className="text-xs font-bold text-white text-center">Monet. Free</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Anuncios, afiliados.</p>
                  <Link href="/admin/monetization-free" className="inline-block w-full text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold px-3 py-2 rounded-lg hover:from-amber-500 hover:to-orange-600 transition text-xs">Config →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📱</div>
                  <h2 className="text-xs font-bold text-white text-center">Teléfonos</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Lista permitidos.</p>
                  <Link href="/admin/allowed-phones" className="inline-block w-full text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📊</div>
                  <h2 className="text-xs font-bold text-white text-center">Estadísticas</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Sistema global.</p>
                  <Link href="/admin/statistics" className="inline-block w-full text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📝</div>
                  <h2 className="text-xs font-bold text-white text-center">Stats Simulacros</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Rendimiento.</p>
                  <Link href="/admin/exam-stats" className="inline-block w-full text-center bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-pink-600 hover:to-rose-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📈</div>
                  <h2 className="text-xs font-bold text-white text-center">Analytics</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Métricas.</p>
                  <Link href="/admin/analytics" className="inline-block w-full text-center bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-indigo-600 hover:to-blue-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📇</div>
                  <h2 className="text-xs font-bold text-white text-center">Leads</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Contactos.</p>
                  <Link href="/admin/contact-leads" className="inline-block w-full text-center bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-red-500 to-orange-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🔐</div>
                  <h2 className="text-xs font-bold text-white text-center">Contraseñas</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Recuperación.</p>
                  <Link href="/admin/recover-password" className="inline-block w-full text-center bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-red-600 hover:to-orange-700 transition text-xs">Abrir →</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 5️⃣ SECCIÓN: SISTEMA Y HERRAMIENTAS */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-slate-100 to-gray-100 rounded-lg p-3 mb-3 border-l-4 border-slate-600">
              <h2 className="text-xl font-bold text-slate-900">5️⃣ Sistema y Herramientas</h2>
              <p className="text-slate-700 text-sm">Utilidades, moderación y diagnóstico del sistema</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🎓</div>
                  <h2 className="text-xs font-bold text-white text-center">Aulas Virtuales</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Jitsi Meet.</p>
                  <Link href="/admin/classrooms" className="inline-block w-full text-center bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🎥</div>
                  <h2 className="text-xs font-bold text-white text-center">Moderación</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Salas activas.</p>
                  <Link href="/admin/rooms" className="inline-block w-full text-center bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition text-xs">Moderar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">📋</div>
                  <h2 className="text-xs font-bold text-white text-center">Supuestos Manual</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Casos prácticos.</p>
                  <Link href="/admin/practical-cases" className="inline-block w-full text-center bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition text-xs">Gestionar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🏆</div>
                  <h2 className="text-xs font-bold text-white text-center">Celebración</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Vista previa 100%.</p>
                  <Link href="/admin/celebration-preview" className="inline-block w-full text-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold px-3 py-2 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🚨</div>
                  <h2 className="text-xs font-bold text-white text-center">Error Monitor</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Panel errores.</p>
                  <Link href="/admin/error-monitoring" className="inline-block w-full text-center bg-gradient-to-r from-red-600 to-rose-700 text-white font-semibold px-3 py-2 rounded-lg hover:from-red-700 hover:to-rose-800 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🧾</div>
                  <h2 className="text-xs font-bold text-white text-center">Audit Logs</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Trazabilidad.</p>
                  <Link href="/admin/audit-logs" className="inline-block w-full text-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🩺</div>
                  <h2 className="text-xs font-bold text-white text-center">Diagnóstico</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Verificación.</p>
                  <Link href="/admin/diagnostics" className="inline-block w-full text-center bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg hover:from-fuchsia-600 hover:to-purple-700 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-700 to-gray-900 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🧹</div>
                  <h2 className="text-xs font-bold text-white text-center">Control Calidad</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Limpieza.</p>
                  <Link href="/admin/quality-control" className="inline-block w-full text-center bg-gradient-to-r from-slate-700 to-gray-900 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-800 hover:to-black transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-gray-700 to-slate-800 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">⚙️</div>
                  <h2 className="text-xs font-bold text-white text-center">Ajustes</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Configuración.</p>
                  <Link href="/admin/settings" className="inline-block w-full text-center bg-gradient-to-r from-gray-700 to-slate-800 text-white font-semibold px-3 py-2 rounded-lg hover:from-gray-800 hover:to-slate-900 transition text-xs">Abrir →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-600 to-gray-800 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">✉️</div>
                  <h2 className="text-xs font-bold text-white text-center">Test Email</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Verificación.</p>
                  <Link href="/admin/test-email" className="inline-block w-full text-center bg-gradient-to-r from-slate-600 to-gray-800 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-700 hover:to-gray-900 transition text-xs">Probar →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-700 to-gray-900 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">🧾</div>
                  <h2 className="text-xs font-bold text-white text-center">Logs Repo</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Acceso repo.</p>
                  <Link href="/admin/repositorio/access-logs" className="inline-block w-full text-center bg-gradient-to-r from-slate-700 to-gray-900 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-800 hover:to-black transition text-xs">Ver →</Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gradient-to-r from-slate-700 to-gray-900 p-3 flex flex-col items-center justify-center">
                  <div className="text-white text-3xl mb-1">✅</div>
                  <h2 className="text-xs font-bold text-white text-center">Solicitudes</h2>
                </div>
                <div className="p-3">
                  <p className="text-gray-600 text-xs text-center mb-3">Repo acceso.</p>
                  <Link href="/admin/repositorio/access-requests" className="inline-block w-full text-center bg-gradient-to-r from-slate-700 to-gray-900 text-white font-semibold px-3 py-2 rounded-lg hover:from-slate-800 hover:to-black transition text-xs">Gestionar →</Link>
                </div>
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
    </div>
  )
}
