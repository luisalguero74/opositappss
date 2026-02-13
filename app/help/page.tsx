'use client'

import Link from 'next/link'
import { HELP_TOPICS, type HelpTopic } from '@/components/HelpModal'

function groupByCategory(topics: HelpTopic[]): Record<string, HelpTopic[]> {
  return topics.reduce((acc, topic) => {
    acc[topic.category] = acc[topic.category] || []
    acc[topic.category].push(topic)
    return acc
  }, {} as Record<string, HelpTopic[]>)
}

export default function HelpPage() {
  const grouped = groupByCategory(HELP_TOPICS)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-6">
              <h1 className="text-3xl font-bold">❓ Centro de ayuda</h1>
              <p className="text-indigo-100 mt-1">Guías rápidas y preguntas frecuentes</p>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {Object.entries(grouped).map(([category, topics]) => (
                  <section key={category} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">{category}</h2>
                    <div className="space-y-3">
                      {topics.map((t) => (
                        <details key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                          <summary className="cursor-pointer font-semibold text-gray-900">
                            {t.question}
                          </summary>
                          <div className="mt-3 text-gray-700 text-sm space-y-3">
                            <p>{t.answer}</p>
                            {t.steps && t.steps.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-900">Pasos</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  {t.steps.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {t.tips && t.tips.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-900">Consejos</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  {t.tips.map((tip, idx) => (
                                    <li key={idx}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/account"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-800 font-semibold transition"
                >
                  ⚙️ Configuración de cuenta
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition"
                >
                  💳 Ver planes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
