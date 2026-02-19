import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface DuplicateCandidate {
  id1: string
  id2: string
  texto1: string
  texto2: string
  similaridad: number
  justificacion: string
}

export async function GET() {
  try {
    // Obtener todas las preguntas validadas del banco
    const preguntas = await prisma.question.findMany({
      where: {
        questionnaireId: null,
        reviewStatus: 'VALIDATED',
        NOT: { temaCodigo: 'SIN_TEMA' }
      },
      select: {
        id: true,
        text: true,
        temaCodigo: true
      },
      take: 500 // Limitar para no saturar
    })

    // Agrupar por tema
    const porTema = preguntas.reduce((acc, p) => {
      const codigo = p.temaCodigo || 'SIN_TEMA'
      if (!acc[codigo]) acc[codigo] = []
      acc[codigo].push(p)
      return acc
    }, {} as Record<string, typeof preguntas>)

    const duplicados: DuplicateCandidate[] = []

    // Analizar cada tema
    for (const [tema, preguntasTema] of Object.entries(porTema)) {
      console.log(`Analizando ${preguntasTema.length} preguntas del tema ${tema}`)
      
      // Comparar en lotes de 10
      for (let i = 0; i < preguntasTema.length; i += 10) {
        const lote = preguntasTema.slice(i, Math.min(i + 10, preguntasTema.length))
        
        const prompt = `Analiza estas preguntas y detecta DUPLICADOS o VARIANTES MENORES (no sinónimos).

CRITERIOS DUPLICADO:
- Misma pregunta con palabras diferentes
- Diferencias mínimas (artículos, preposiciones, orden)
- Significado idéntico aunque frases distintas

NO ES DUPLICADO:
- Preguntas sobre conceptos similares pero diferentes
- Diferentes aspectos del mismo tema
- Sinónimos que preguntan cosas distintas

PREGUNTAS:
${lote.map((p, idx) => `${idx + 1}. ${p.text}`).join('\n\n')}

Responde SOLO con JSON array:
[
  {
    "indices": [1, 3],
    "similaridad": 95,
    "justificacion": "Misma pregunta, solo cambia orden de palabras"
  }
]

Si NO hay duplicados, responde: []`

        try {
          const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 1000
          })

          const respuesta = completion.choices[0]?.message?.content?.trim() || '[]'
          const matches = JSON.parse(respuesta)

          for (const match of matches) {
            if (match.indices && match.indices.length === 2) {
              const [idx1, idx2] = match.indices
              duplicados.push({
                id1: lote[idx1 - 1].id,
                id2: lote[idx2 - 1].id,
                texto1: lote[idx1 - 1].text,
                texto2: lote[idx2 - 1].text,
                similaridad: match.similaridad,
                justificacion: match.justificacion
              })
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Error procesando lote:`, error)
        }
      }
    }

    // Ordenar por similaridad descendente
    duplicados.sort((a, b) => b.similaridad - a.similaridad)

    return NextResponse.json({
      total: duplicados.length,
      duplicados: duplicados.slice(0, 50) // Top 50
    })
  } catch (error) {
    console.error('Error detectando duplicados:', error)
    return NextResponse.json({ error: 'Error al detectar duplicados' }, { status: 500 })
  }
}
