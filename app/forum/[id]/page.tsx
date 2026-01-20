'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Post {
  id: string
  content: string
  createdAt: string
  user?: { id: string; email: string } | null
}

interface Thread {
  id: string
  title: string
}

export default function ThreadDetail() {
  const params = useParams<{ id: string }>()
  const threadId = params?.id as string
  const [posts, setPosts] = useState<Post[]>([])
  const [thread, setThread] = useState<Thread | null>(null)
  const [content, setContent] = useState('')

  const load = async () => {
    const res = await fetch(`/api/forum/threads/${threadId}/posts`)
    const data = await res.json()
    setPosts(data)
    
    // Load thread info
    const threadRes = await fetch(`/api/forum/threads`)
    const threads = await threadRes.json()
    const currentThread = threads.find((t: Thread) => t.id === threadId)
    if (currentThread) setThread(currentThread)
  }

  useEffect(() => {
    if (threadId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (res.ok) {
      setContent('')
      await load()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/forum" className="text-sky-700 hover:text-sky-800 font-semibold">← Volver al foro</Link>
            {thread && (
              <Link 
                href={`/room/${thread.id}`}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 transition"
              >
                🎥 Unirse a videollamada
              </Link>
            )}
          </div>
          <Link href="/dashboard" className="text-sky-700 hover:text-sky-800 font-semibold">Dashboard</Link>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{thread?.title || 'Hilo'}</h1>
          <p className="text-gray-500 text-sm">Participa con tu duda o solución</p>
        </div>

        <div className="space-y-4 mb-8">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow p-5">
              <div className="text-gray-600 text-sm mb-2">
                <span className="font-semibold">{p.user?.email || 'Usuario desconocido'}</span> — {new Date(p.createdAt).toLocaleString()}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">{p.content}</div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-600">Sin respuestas aún. ¡Escribe la primera!</div>
          )}
        </div>

        <form onSubmit={send} className="bg-white rounded-2xl shadow p-6">
          <label className="block text-gray-700 font-semibold mb-2">Tu mensaje</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-sky-500 transition h-32"
            placeholder="Escribe aquí tu duda o aportación"
            required
          />
          <div className="mt-4 flex justify-end">
            <button className="px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-lg font-semibold hover:from-sky-700 hover:to-blue-800">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
