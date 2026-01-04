'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    documentId: string
    title: string
    relevanceScore: number
  }>
}

export default function AsistenteEstudioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<'chat' | 'explain' | 'summarize'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function enviarMensaje() {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          conversationHistory: messages.slice(-6),
          topic: topic || undefined,
          action: mode
        })
      })

      const data = await res.json()

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          sources: data.sources
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'No se pudo procesar la consulta'}`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver al Dashboard
          </button>
          
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 shadow-2xl text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-6xl">🤖</div>
              <div>
                <h1 className="text-4xl font-bold">Asistente de Estudio IA</h1>
                <p className="text-purple-100 mt-2">
                  Pregúntame cualquier duda sobre el temario. Uso los documentos oficiales como fuente.
                </p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex gap-4 mt-6">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold"
              >
                <option value="chat">💬 Chat Normal</option>
                <option value="explain">📖 Explicar Concepto</option>
                <option value="summarize">📝 Resumir</option>
              </select>

              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Tema específico (opcional)"
                className="flex-1 px-4 py-2 rounded-lg bg-white text-gray-800"
              />

              <button
                onClick={() => setMessages([])}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-lg flex flex-col" style={{ height: 'calc(100vh - 400px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  ¿En qué puedo ayudarte?
                </h3>
                <p className="text-gray-600 mb-6">
                  Pregúntame sobre cualquier tema del temario oficial
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {[
                    '¿Qué dice la Constitución sobre los derechos fundamentales?',
                    'Explícame el artículo 14 de la Ley 39/2015',
                    '¿Cuáles son las prestaciones de la Seguridad Social?',
                    'Resume el Tema 1 del temario general'
                  ].map((ejemplo, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(ejemplo)}
                      className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 border border-gray-200"
                    >
                      {ejemplo}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-semibold mb-2">📚 Fuentes:</p>
                        <div className="space-y-1">
                          {msg.sources.map((source, j) => (
                            <div key={j} className="text-xs bg-white rounded p-2">
                              <span className="font-semibold">{source.title}</span>
                              <span className="text-gray-500 ml-2">
                                (Relevancia: {Math.round(source.relevanceScore)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">🤖</div>
                    <span className="text-gray-600">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  mode === 'chat'
                    ? 'Escribe tu pregunta...'
                    : mode === 'explain'
                    ? 'Escribe el concepto que quieres que explique...'
                    : 'Escribe qué quieres que resuma...'
                }
                rows={2}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading}
              />
              <button
                onClick={enviarMensaje}
                disabled={!input.trim() || loading}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳' : '📤'} Enviar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-blue-900 mb-2">ℹ️ Cómo funciona</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• El asistente busca en los documentos procesados información relevante</li>
            <li>• Solo responde basándose en los documentos oficiales del temario</li>
            <li>• Puedes especificar un tema para búsquedas más precisas</li>
            <li>• Las fuentes de información se muestran en cada respuesta</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
