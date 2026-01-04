'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Thread {
  id: string
  title: string
  updatedAt: string
  _count?: { posts: number }
}

export default function ForumList() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const res = await fetch('/api/forum/threads')
    const data = await res.json()
    setThreads(data)
  }

  useEffect(() => {
    load()
  }, [])

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/forum/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    if (res.ok) {
      setTitle('')
      await load()
    } else {
      const data = await res.json()
      setError(data.error || 'Error creando el hilo')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">Foro de Supuestos</h1>
            <p className="text-gray-600 mt-2">Crea hilos para dudas y comparte soluciones</p>
          </div>
          <Link href="/dashboard" className="text-sky-700 hover:text-sky-800 font-semibold">← Volver</Link>
        </div>

        {/* Canal de moderación */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🎥 Canal de Moderación</h2>
              <p className="text-emerald-100 mt-1">Únete al canal abierto por administración para resolver dudas en videollamada.</p>
            </div>
            <Link href="/room/moderation" className="px-5 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold">
              Unirse ahora →
            </Link>
          </div>
          <p className="text-sm text-emerald-100 mt-3">Al entrar, se habilitarán tu cámara y micrófono automáticamente. Podrás silenciarlos cuando quieras.</p>
        </div>

        <form onSubmit={createThread} className="bg-white rounded-2xl shadow p-6 mb-8">
          <label className="block text-gray-700 font-semibold mb-2">Nuevo hilo</label>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-3">{error}</div>}
          <div className="flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Duda en el supuesto práctico 3"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-sky-500 transition"
              required
            />
            <button className="px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-lg font-semibold hover:from-sky-700 hover:to-blue-800">Crear</button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-4">
          {threads.map(t => (
            <Link key={t.id} href={`/forum/${t.id}`} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
                  <p className="text-gray-500 text-sm mt-1">Actualizado {new Date(t.updatedAt).toLocaleString()}</p>
                </div>
                <div className="text-sky-700 font-semibold">{t._count?.posts ?? 0} respuestas →</div>
              </div>
            </Link>
          ))}
          {threads.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-600">No hay hilos aún. ¡Crea el primero!</div>
          )}
        </div>
      </div>
    </div>
  )
}
