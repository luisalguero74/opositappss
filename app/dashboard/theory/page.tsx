'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HelpButton from '@/components/HelpButton'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface Questionnaire {
  id: string
  title: string
  type: string
  questions: Question[]
}

export default function Theory() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])

  useEffect(() => {
    fetch('/api/questionnaires?type=theory')
      .then(res => res.json())
      .then(setQuestionnaires)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">      <HelpButton />      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold mb-4 inline-block">← Volver</Link>
          <h1 className="text-4xl font-bold text-gray-800 mt-2">📚 Cuestionarios de Temario</h1>
          <p className="text-gray-600 mt-2">Prepárate con nuestros cuestionarios basados en el temario oficial</p>
        </div>
        {questionnaires.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">No hay cuestionarios disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionnaires.map(q => (
              <div key={q.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24 flex items-center justify-center">
                  <div className="text-white text-4xl">📖</div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{q.title}</h2>
                  <p className="text-gray-600 mb-4">Total de {q.questions.length} pregunta{q.questions.length !== 1 ? 's' : ''}</p>
                  <Link href={`/quiz/${q.id}`} className="inline-block w-full text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-4 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition">
                    Comenzar Cuestionario
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}