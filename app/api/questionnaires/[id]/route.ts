import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Función para barajar arrays de forma aleatoria
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { 
      questionnaireQuestions: {
        include: {
          question: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })
  if (!questionnaire) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Mapear las preguntas a la estructura esperada por el frontend
  let questions = questionnaire.questionnaireQuestions.map(qq => qq.question)
  
  // BARAJAR PREGUNTAS
  questions = shuffleArray(questions)
  
  // BARAJAR OPCIONES DE CADA PREGUNTA y actualizar correctAnswer
  const shuffledQuestions = questions.map(q => {
    const options: string[] = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    
    // Encontrar índice de la respuesta correcta ANTES de barajar
    let correctIndex = -1
    const ca = q.correctAnswer?.toLowerCase()
    
    if (['a', 'b', 'c', 'd'].includes(ca)) {
      // Si ya es letra, convertir a índice
      correctIndex = ca.charCodeAt(0) - 97
    } else {
      // Si es el texto de la opción, buscar su índice
      correctIndex = options.findIndex((opt: string) => opt === q.correctAnswer)
    }
    
    // Validar que tengamos un índice válido
    if (correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0 // fallback a primera opción
    }
    
    // Guardar la opción correcta
    const correctOption = options[correctIndex]
    
    // BARAJAR las opciones
    const shuffledOptions: string[] = shuffleArray(options)
    
    // Encontrar el NUEVO índice de la respuesta correcta después de barajar
    const newCorrectIndex = shuffledOptions.findIndex((opt: string) => opt === correctOption)
    
    // Convertir el nuevo índice a letra
    const newCorrectLetter = String.fromCharCode(97 + newCorrectIndex)
    
    return {
      id: q.id,
      text: q.text,
      options: shuffledOptions,
      correctAnswer: newCorrectLetter,
      explanation: q.explanation,
      temaCodigo: q.temaCodigo,
      temaNumero: q.temaNumero,
      temaParte: q.temaParte,
      temaTitulo: q.temaTitulo
    }
  })
  
  // Extraer información del tema de las preguntas (si tiene)
  let temaInfo = null
  if (shuffledQuestions.length > 0) {
    const firstQuestion = shuffledQuestions[0]
    if (firstQuestion.temaCodigo && firstQuestion.temaNumero) {
      temaInfo = {
        codigo: firstQuestion.temaCodigo,
        numero: firstQuestion.temaNumero,
        parte: firstQuestion.temaParte,
        titulo: firstQuestion.temaTitulo
      }
    }
  }
  
  return NextResponse.json({ ...questionnaire, questions: shuffledQuestions, temaInfo })
}