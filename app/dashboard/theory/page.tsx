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
  // Puede venir marcado desde el panel admin como "GENERAL" o "ESPECÍFICO"
  temaParte?: string | null
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
          <TheoryBlocks questionnaires={questionnaires} />
        )}
      </div>
    </div>
  )
}

function TheoryBlocks({ questionnaires }: { questionnaires: Questionnaire[] }) {
  const classifyParte = (q: Questionnaire): 'GENERAL' | 'ESPECÍFICO' => {
    const partes = (q.questions || [])
      .map(qq => (qq as any).temaParte as string | undefined | null)
      .filter(Boolean)
      .map(p => String(p).trim().toUpperCase())

    if (partes.length === 0) {
      // Por compatibilidad hacia atrás, si no hay marca lo tratamos como general
      return 'GENERAL'
    }

    const allGeneral = partes.every(p => p === 'GENERAL')
    const allEspecifico = partes.every(p => p === 'ESPECÍFICO' || p === 'ESPECIFICO')

    if (allEspecifico) return 'ESPECÍFICO'
    if (allGeneral) return 'GENERAL'

    // Si hay mezcla de marcas, lo mostramos en general por defecto
    return 'GENERAL'
  }

  const generalQuestionnaires = questionnaires.filter(q => classifyParte(q) === 'GENERAL')
  const specificQuestionnaires = questionnaires.filter(q => classifyParte(q) === 'ESPECÍFICO')

  const renderGrid = (items: Questionnaire[], variant: 'general' | 'specific') => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map(q => (
        <div
          key={q.id}
          className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105"
        >
          <div
            className={
              variant === 'general'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 h-24 flex items-center justify-center'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 h-24 flex items-center justify-center'
            }
          >
            <div className="text-white text-4xl">📖</div>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{q.title}</h2>
            <p className="text-gray-600 mb-4">
              Total de {q.questions.length} pregunta{q.questions.length !== 1 ? 's' : ''}
            </p>
            <Link
              href={`/quiz/${q.id}`}
              className={
                variant === 'general'
                  ? 'inline-block w-full text-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition'
                  : 'inline-block w-full text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-4 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition'
              }
            >
              Comenzar Cuestionario
            </Link>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Temario General</h2>
        {generalQuestionnaires.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600">No hay cuestionarios de temario general disponibles.</p>
          </div>
        ) : (
          renderGrid(generalQuestionnaires, 'general')
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Temario Específico</h2>
        {specificQuestionnaires.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600">No hay cuestionarios de temario específico disponibles.</p>
          </div>
        ) : (
          renderGrid(specificQuestionnaires, 'specific')
        )}
      </section>
    </div>
  )
}