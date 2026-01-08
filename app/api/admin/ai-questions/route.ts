import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQuestions } from '@/lib/groq'

// POST - Generar preguntas desde un documento o sección
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { documentId, sectionId, count = 5, difficulty = 'medium' } = await req.json()

    if (!documentId) {
      return NextResponse.json({ 
        error: 'documentId es requerido' 
      }, { status: 400 })
    }

    // Obtener contenido y documento
    let content = ''
    let docTopic: string | null = null
    
    if (sectionId) {
      const section = await prisma.documentSection.findUnique({
        where: { id: sectionId },
        include: { document: true }
      })
      if (!section) {
        return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
      }
      if (!section.document) {
        return NextResponse.json({ error: 'Documento asociado no encontrado' }, { status: 404 })
      }
      content = section.content
      docTopic = section.document.topic
    } else {
      const document = await prisma.legalDocument.findUnique({
        where: { id: documentId }
      })
      if (!document) {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      }
      // Limitar contenido a 15000 caracteres (máximo recomendado con Groq)
      content = document.content.substring(0, 15000)
      docTopic = document.topic
    }

    // Obtener preguntas ya existentes del mismo documento para evitar duplicados
    const existingQuestions = await prisma.generatedQuestion.findMany({
      where: { documentId },
      select: { text: true }
    })
    
    const existingTexts = existingQuestions.map(q => q.text)

    // Generar preguntas con Groq IA (evitando duplicados)
    console.log(`[AI] Generando ${count} preguntas con dificultad ${difficulty}...`)
    const aiQuestions = await generateQuestions(content, count, difficulty as any, existingTexts)

    if (aiQuestions.length === 0) {
      return NextResponse.json({ 
        error: 'No se pudieron generar preguntas. Intenta con otro contenido.' 
      }, { status: 500 })
    }

    // Función para calcular similitud entre textos (0-1)
    const calculateSimilarity = (text1: string, text2: string): number => {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '').trim()
      const words1 = new Set(normalize(text1).split(/\s+/))
      const words2 = new Set(normalize(text2).split(/\s+/))
      const intersection = new Set([...words1].filter(x => words2.has(x)))
      const union = new Set([...words1, ...words2])
      return union.size === 0 ? 0 : intersection.size / union.size
    }

    // Filtrar preguntas duplicadas exactas y muy similares
    const SIMILARITY_THRESHOLD = 0.7 // 70% de palabras en común = duplicado
    const uniqueQuestions = aiQuestions.filter(q => {
      // Verificar duplicados exactos
      if (existingTexts.some(existing => 
        existing.toLowerCase().trim() === q.text.toLowerCase().trim()
      )) {
        console.log(`[AI] Pregunta duplicada exacta descartada: ${q.text.substring(0, 60)}...`)
        return false
      }
      
      // Verificar preguntas muy similares
      const hasSimilar = existingTexts.some(existing => {
        const similarity = calculateSimilarity(existing, q.text)
        if (similarity >= SIMILARITY_THRESHOLD) {
          console.log(`[AI] Pregunta muy similar descartada (${Math.round(similarity * 100)}%): ${q.text.substring(0, 60)}...`)
          return true
        }
        return false
      })
      
      return !hasSimilar
    })

    console.log(`[AI] ${uniqueQuestions.length} preguntas únicas de ${aiQuestions.length} generadas (filtradas ${aiQuestions.length - uniqueQuestions.length} duplicadas/similares)`)

    // Verificar duplicados dentro del mismo lote generado
    const finalQuestions: typeof uniqueQuestions = []
    for (const q of uniqueQuestions) {
      const isDuplicateInBatch = finalQuestions.some(existing => 
        calculateSimilarity(existing.text, q.text) >= SIMILARITY_THRESHOLD
      )
      if (!isDuplicateInBatch) {
        finalQuestions.push(q)
      } else {
        console.log(`[AI] Pregunta duplicada dentro del lote descartada: ${q.text.substring(0, 60)}...`)
      }
    }

    if (finalQuestions.length < uniqueQuestions.length) {
      console.log(`[AI] Eliminadas ${uniqueQuestions.length - finalQuestions.length} preguntas duplicadas dentro del mismo lote`)
    }

    // Guardar preguntas con el topic del documento
    const savedQuestions = await Promise.all(
      finalQuestions.map(q => 
        prisma.generatedQuestion.create({
          data: {
            documentId,
            sectionId: sectionId || null,
            text: q.text,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            difficulty: difficulty,
            topic: docTopic,
            reviewed: false,
            approved: false
          }
        })
      )
    )

    return NextResponse.json({ 
      questions: savedQuestions,
      message: `${savedQuestions.length} preguntas generadas exitosamente` 
    }, { status: 201 })
  } catch (error) {
    console.error('[AI Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al generar preguntas',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Listar preguntas generadas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')
    const reviewed = searchParams.get('reviewed')
    const approved = searchParams.get('approved')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const where: any = {}
    if (documentId) where.documentId = documentId
    if (reviewed !== null) where.reviewed = reviewed === 'true'
    if (approved !== null) where.approved = approved === 'true'
    if (status === 'approved') where.approved = true

    const questions = await prisma.generatedQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        section: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('[AI Questions] Error al listar:', error)
    return NextResponse.json({ error: 'Error al listar preguntas' }, { status: 500 })
  }
}
