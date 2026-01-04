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

export default function Practical() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])

  useEffect(() => {
    fetch('/api/questionnaires?type=practical')
      .then(res => res.json())
      .then(setQuestionnaires)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">      <HelpButton />      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <Link href="/dashboard" className="text-emerald-600 hover:text-emerald-700 font-semibold mb-4 inline-block">← Volver</Link>
          <h1 className="text-4xl font-bold text-gray-800 mt-2">💼 Supuestos Prácticos</h1>
          <p className="text-gray-600 mt-2">Resuelve casos reales para afianzar tus conocimientos</p>
        </div>
        {questionnaires.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">No hay cuestionarios disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionnaires.map(q => (
              <div key={q.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-24 flex items-center justify-center">
                  <div className="text-white text-4xl">💡</div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{q.title}</h2>
                  <p className="text-gray-600 mb-4">Total de {q.questions.length} pregunta{q.questions.length !== 1 ? 's' : ''}</p>
                  <Link href={`/practical-cases/${q.id}`} className="inline-block w-full text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-4 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition">
                    Comenzar Supuesto
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