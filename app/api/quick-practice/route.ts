import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '5')
    
    // Limit to reasonable numbers
    const questionCount = Math.min(Math.max(count, 5), 20)

    // Get random questions from the database
    const totalQuestions = await prisma.question.count()
    
    if (totalQuestions === 0) {
      return NextResponse.json({ error: 'No hay preguntas disponibles' }, { status: 404 })
    }

    // Get random questions using a more efficient approach
    const skip = Math.max(0, Math.floor(Math.random() * (totalQuestions - questionCount)))
    
    const questions = await prisma.question.findMany({
      take: questionCount,
      skip,
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
      }
    })

    // Shuffle the selected questions for more randomness
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5)

    // BARAJAR OPCIONES DE CADA PREGUNTA y actualizar correctAnswer
    const finalQuestions = shuffledQuestions.map(q => {
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
        ...q,
        options: shuffledOptions,
        correctAnswer: newCorrectLetter
      }
    })

    return NextResponse.json({ questions: finalQuestions })

  } catch (error) {
    console.error('Error fetching quick practice questions:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}
