import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs/promises'
import * as path from 'path'
import { processDocument } from '@/lib/document-processor'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

// Funciones para parsear diferentes formatos de archivo
async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Crear archivo temporal
    const tempPath = path.join('/tmp', `temp_${Date.now()}_${filename}`)
    await fs.writeFile(tempPath, buffer)
    
    // Usar processDocument que maneja PDFs, DOCX, TXT, EPUB correctamente
    const processed = await processDocument(tempPath, filename)
    
    // Limpiar archivo temporal
    await fs.unlink(tempPath).catch(() => {})
    
    return processed.content
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error)
    throw new Error(`Error al procesar el archivo ${filename}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY no configurada. Define la clave de API en el archivo .env' 
      }, { status: 500 })
    }

    const contentType = req.headers.get('content-type') || ''
    let title: string
    let combinedContent = ''

    // Detectar si es FormData (archivos subidos) o JSON (temas predefinidos)
    if (contentType.includes('multipart/form-data')) {
      // Modo: Archivos subidos
      const formData = await req.formData()
      title = formData.get('title') as string
      const files = formData.getAll('files') as File[]

      if (!title || files.length === 0) {
        return NextResponse.json({ 
          error: 'Título y al menos un archivo son requeridos' 
        }, { status: 400 })
      }

      // Procesar cada archivo
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await parseFile(buffer, file.name)
        combinedContent += `\n\n=== ${file.name} ===\n${text}`
      }

    } else {
      // Modo: Temas predefinidos
      const body = await req.json()
      title = body.title
      const topicIds = body.topicIds

      if (!title || !topicIds || topicIds.length === 0) {
        return NextResponse.json({ 
          error: 'Título y al menos un tema son requeridos' 
        }, { status: 400 })
      }

      // Buscar documentos relacionados con los temas en la base de datos
      const documents = await prisma.legalDocument.findMany({
        where: {
          OR: [
            { type: 'temario_general' },
            { type: 'temario_especifico' }
          ]
        },
        select: {
          title: true,
          content: true,
          type: true
        }
      })

      console.log('📚 Documentos encontrados:', documents.length)

      if (documents.length === 0) {
        return NextResponse.json({ 
          error: 'No hay documentos del temario en la base de datos. Por favor, sube documentos primero.' 
        }, { status: 400 })
      }

      // Combinar el contenido de todos los documentos del temario
      for (const doc of documents) {
        if (doc.content) {
          combinedContent += `\n\n=== ${doc.title} ===\n${doc.content}`
        }
      }
      
      console.log('📝 Longitud del contenido combinado:', combinedContent.length)
    }

    if (!combinedContent.trim()) {
      return NextResponse.json({ 
        error: 'No se pudo leer el contenido de los documentos seleccionados' 
      }, { status: 500 })
    }

    // Generar el supuesto práctico con Groq
    const practicalCase = await generatePracticalCaseWithGroq(combinedContent, title)

    if (!practicalCase) {
      return NextResponse.json({ 
        error: 'Error al generar el supuesto práctico con IA' 
      }, { status: 500 })
    }

    // Crear el supuesto práctico en la base de datos
    const createdCase = await prisma.questionnaire.create({
      data: {
        title,
        type: 'practical',
        theme: 'Contenido personalizado',
        statement: practicalCase.statement,
        published: false, // Por defecto no publicado, el admin debe revisar
        questions: {
          create: practicalCase.questions.map((q: any, index: number) => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || 'Pendiente de añadir motivación técnica'
          }))
        }
      },
      include: {
        questions: true
      }
    })

    return NextResponse.json({
      success: true,
      practicalCase: createdCase,
      questionCount: practicalCase.questions.length
    })

  } catch (error) {
    console.error('[Generate Practical AI] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error inesperado al generar supuesto práctico' 
    }, { status: 500 })
  }
}

async function generatePracticalCaseWithGroq(content: string, caseTitle: string) {
  const prompt = `Eres un experto examinador senior de oposiciones para el Cuerpo General Administrativo de la Administración del Estado (Subgrupo C1) especializado en la Seguridad Social española, con 20 años de experiencia diseñando exámenes oficiales.

Tu tarea es crear un SUPUESTO PRÁCTICO COMPLETO Y PROFESIONAL de nivel C1 sobre Seguridad Social, similar a los utilizados en exámenes oficiales reales.

CONTENIDO LEGAL BASE:
${content.substring(0, 12000)}

ESTRUCTURA REQUERIDA DEL SUPUESTO PRÁCTICO:

1. ENUNCIADO DEL SUPUESTO (200-400 palabras):
   - Plantea un caso real y profesional relacionado con la Seguridad Social
   - Debe ser técnico, específico y basado en los temas proporcionados
   - Incluye datos concretos: fechas, importes, situaciones administrativas
   - Usa lenguaje jurídico-administrativo formal
   - El caso debe requerir conocimiento profundo de la normativa
   - Puede incluir varios personajes o situaciones interrelacionadas
   - Debe ser un caso que requiera análisis y aplicación normativa

2. 15 PREGUNTAS TIPO TEST SOBRE EL SUPUESTO:
   - Todas las preguntas DEBEN ESTAR RELACIONADAS con el enunciado planteado
   - 4 opciones de respuesta (A, B, C, D) por cada pregunta
   - Solo UNA opción completamente correcta
   - **DISTRIBUCIÓN ALEATORIA:** Las respuestas correctas DEBEN estar distribuidas de forma IMPREDECIBLE entre A, B, C y D
   - **IMPORTANTE:** NO pongas más de 3 respuestas correctas consecutivas en la misma posición
   - **EVITA PATRONES:** No uses secuencias predecibles como A,B,C,D,A,B,C,D
   - Preguntas técnicas y específicas sobre el caso planteado
   - Requieren interpretación y aplicación de normativa al caso concreto
   - Las 4 opciones deben ser plausibles y técnicamente coherentes

3. SOLUCIONARIO MOTIVADO Y DETALLADO:
   - Cada respuesta debe incluir una explicación técnico-jurídica COMPLETA
   - **OBLIGATORIO:** Citar SIEMPRE la norma específica: "Artículo X.Y de la Ley/RD Z/AAAA, de DD de mes"
   - Transcribir LITERALMENTE fragmentos relevantes del texto legal entrecomillados
   - Explicar la interpretación jurídica aplicada al caso
   - Explicar técnicamente por qué las otras 3 opciones son INCORRECTAS
   - Usar terminología jurídica precisa: "conforme a", "según lo dispuesto en", "de acuerdo con lo establecido en"
   - Mencionar jurisprudencia o doctrina administrativa si es relevante
   - Estructura: [Norma citada completa] + [Texto legal literal] + [Interpretación aplicada al caso] + [Análisis de opciones incorrectas]

REQUISITOS DE CALIDAD PROFESIONAL:

1. NIVEL TÉCNICO:
   - Propio de exámenes oficiales de oposiciones C1
   - Referencias exactas a artículos, apartados, números
   - Terminología jurídico-administrativa precisa
   - Cálculos o procedimientos administrativos correctos
   - Plazos, porcentajes y datos numéricos exactos según normativa

2. REALISMO DEL CASO:
   - Situación administrativa verosímil y práctica
   - Datos coherentes y realistas
   - Problemática típica del ámbito de la Seguridad Social
   - Puede incluir varios niveles de complejidad

3. FUNDAMENTACIÓN JURÍDICA:
   - Cada respuesta correcta basada en normativa vigente específica
   - Citas completas: Ley, Real Decreto, Orden Ministerial, Reglamento
   - Fechas de publicación y entrada en vigor cuando sea relevante
   - Texto literal de artículos clave

4. VERIFICACIÓN MÚLTIPLE:
   - Contrasta cada respuesta con al menos 2 fuentes normativas
   - Asegura que la interpretación es la oficial y vigente
   - Verifica que los datos numéricos (plazos, porcentajes) son correctos
   - Confirma que no hay ambigüedad en la respuesta correcta

EJEMPLOS DE DISTRIBUCIÓN CORRECTA DE RESPUESTAS:
✅ BIEN: A, C, B, D, B, A, D, C, B, D, A, C, D, B, A (distribución variada e impredecible)
✅ BIEN: B, D, A, C, B, D, A, B, C, A, D, C, B, D, A (no hay patrones evidentes)
❌ MAL: A, A, A, B, B, B, C, C, C, D, D, D, A, A, A (agrupadas por posición)
❌ MAL: A, B, C, D, A, B, C, D, A, B, C, D, A, B, C (patrón secuencial)

EJEMPLO DE MOTIVACIÓN CORRECTA:
"La respuesta correcta es la C. Conforme al artículo 24.2 del Real Decreto Legislativo 8/2015, de 30 de octubre, por el que se aprueba el texto refundido de la Ley General de la Seguridad Social, se establece literalmente: 'La cotización por contingencias comunes se efectuará con arreglo a las bases de cotización establecidas reglamentariamente, dentro de los límites mínimo y máximo que se fijen anualmente'. En el caso planteado, dado que el trabajador tiene un salario de 2.500€ mensuales y la base mínima del grupo de cotización 5 es de 1.323€, corresponde cotizar por la base real de 2.500€. La opción A es incorrecta porque menciona la base mínima cuando el salario es superior. La opción B es incorrecta porque el tope máximo de cotización (4.495,50€) solo aplicaría si el salario lo superase. La opción D es incorrecta porque no existe la posibilidad de elegir voluntariamente una base inferior a la real."

FORMATO DE RESPUESTA (JSON):
{
  "statement": "ENUNCIADO COMPLETO DEL SUPUESTO PRÁCTICO (200-400 palabras)",
  "questions": [
    {
      "text": "1. Pregunta sobre el supuesto planteado",
      "options": ["A) Opción A", "B) Opción B", "C) Opción C", "D) Opción D"],
      "correctAnswer": "C",
      "explanation": "Explicación completa con cita legal, texto literal, interpretación y análisis de opciones incorrectas"
    }
  ]
}

INSTRUCCIONES FINALES:
- El enunciado debe ser un caso práctico COHERENTE y REALISTA
- Las 15 preguntas deben estar TODAS relacionadas con el enunciado
- TODAS las explicaciones deben citar normativa específica con artículo y apartado
- Distribución de respuestas correctas ALEATORIA entre A, B, C, D
- Responde SOLO con el JSON, sin texto adicional antes o después`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto examinador de oposiciones especializado en crear supuestos prácticos profesionales sobre Seguridad Social. Generas casos técnicos y jurídicamente rigurosos con motivación legal detallada.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        top_p: 0.95
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Groq] Error:', errorData)
      throw new Error(`Error de Groq API: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No se recibió contenido de Groq')
    }

    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Groq] Respuesta sin JSON:', content)
      throw new Error('La respuesta de IA no contiene JSON válido')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validar estructura
    if (!parsed.statement || !parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Estructura de respuesta inválida')
    }

    if (parsed.questions.length !== 15) {
      console.warn(`[Groq] Se esperaban 15 preguntas, se recibieron ${parsed.questions.length}`)
    }

    // Validar cada pregunta
    const validQuestions = parsed.questions.filter((q: any) =>
      q.text &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.correctAnswer &&
      ['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase()) &&
      q.explanation
    )

    if (validQuestions.length < 10) {
      throw new Error(`Solo se generaron ${validQuestions.length} preguntas válidas (mínimo: 10)`)
    }

    return {
      statement: parsed.statement,
      questions: validQuestions.slice(0, 15) // Asegurar máximo 15
    }

  } catch (error) {
    console.error('[Groq] Error generando supuesto práctico:', error)
    throw error
  }
}
