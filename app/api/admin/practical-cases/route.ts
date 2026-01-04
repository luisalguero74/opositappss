import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const published = searchParams.get('published')

    const where: any = { type: 'practical' }
    if (published !== null) {
      where.published = published === 'true'
    }

    const practicalCases = await prisma.questionnaire.findMany({
      where,
      select: {
        id: true,
        title: true,
        theme: true,
        type: true,
        statement: true,
        category: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        questions: true,
        _count: {
          select: {
            attempts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ practicalCases })
  } catch (error) {
    console.error('Error fetching practical cases:', error)
    return NextResponse.json({ error: 'Error al obtener supuestos prácticos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('📥 POST /api/admin/practical-cases - Iniciando...')
    
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      console.log('❌ No autorizado')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('✅ Usuario autorizado:', session.user.email)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const theme = formData.get('theme') as string | null

    console.log('📄 Archivo recibido:', file?.name, 'Tipo:', file?.type, 'Tamaño:', file?.size)

    if (!file || !title) {
      console.log('❌ Faltan datos requeridos')
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }


    // Leer contenido del archivo según tipo
    console.log('📖 Leyendo contenido del archivo...')
    const buffer = await file.arrayBuffer()
    let content = ''
    let fileName = file.name || ''
    let mimeType = file.type || ''

    // Detectar tipo por extensión o MIME
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    console.log('🔍 Extensión detectada:', ext, 'MIME:', mimeType)
    
    try {
      if (mimeType === 'application/pdf' || ext === 'pdf') {
        // PDF - por ahora no soportado, pedir TXT
        console.log('⚠️ PDF detectado - solicitar conversión a TXT')
        return NextResponse.json({ 
          error: 'Por favor, convierte el PDF a formato TXT antes de subirlo',
          details: 'Puedes copiar el contenido del PDF y pegarlo en un archivo .txt, o usar la opción "Pegar texto y analizar"'
        }, { status: 400 })
      } else {
        // TXT u otro
        console.log('📄 Procesando TXT...')
        content = Buffer.from(buffer).toString('utf-8')
        console.log('✅ TXT procesado. Caracteres extraídos:', content.length)
      }
    } catch (extractErr) {
      console.error('❌ Error extrayendo texto:', extractErr)
      return NextResponse.json({ 
        error: 'Error extrayendo texto del archivo', 
        details: extractErr instanceof Error ? extractErr.message : extractErr 
      }, { status: 400 })
    }

    // Parsear contenido
    console.log('🔄 Parseando contenido...')
    const parsed = parsePracticalCase(content)

    if (!parsed.success || !parsed.data) {
      console.log('❌ Error en el parseo:', parsed.error)
      return NextResponse.json({ 
        error: parsed.error || 'Formato de archivo inválido',
        details: parsed.details
      }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ 
        error: parsed.error || 'Formato de archivo inválido',
        details: parsed.details
      }, { status: 400 })
    }

    // LOG de depuración antes de crear en BD
    console.log('--- DEBUG practicalCase ---')
    console.log('title:', title)
    console.log('type:', 'practical')
    console.log('theme:', theme)
    console.log('statement:', parsed.data.statement)
    console.log('questions:', JSON.stringify(parsed.data.questions, null, 2))

    // Crear supuesto práctico en base de datos
    const practicalCase = await prisma.questionnaire.create({
      data: {
        title,
        type: 'practical',
        theme,
        statement: parsed.data.statement,
        published: false,
        questions: {
          create: parsed.data.questions.map((q: any, index: number) => ({
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
      practicalCase,
      message: `Supuesto práctico creado con ${parsed.data.questions.length} preguntas`
    })

  } catch (error) {
    console.error('Error creating practical case:', error)
    return NextResponse.json({ error: 'Error al crear supuesto práctico' }, { status: 500 })
  }
}

function parsePracticalCase(content: string): { 
  success: boolean; 
  data?: { statement: string; questions: any[] }; 
  error?: string;
  details?: any;
} {
  try {
    // Eliminar BOM y normalizar
    content = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
    
    const allLines = content.split('\n').map(l => l.trim())
    const lines = allLines.filter(l => l.length > 0)
    
    const debugInfo: any = {
      totalLines: lines.length,
      firstLines: lines.slice(0, 20),
      sectionsFound: [],
      detectedQuestions: []
    }
    
    let statement = ''
    const questions: any[] = []
    const solutions: { [key: number]: any } = {}
    
    let currentSection: 'none' | 'statement' | 'questions' | 'solutions' = 'none'
    let currentQuestion: any = null
    let lastSolutionNumber = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upper = line.toUpperCase()

      // 1. DETECTAR CAMBIOS DE SECCIÓN
      if (upper.match(/^ENUNCIADO[\s:]*$/)) {
        currentSection = 'statement'
        debugInfo.sectionsFound.push(`ENUNCIADO línea ${i + 1}`)
        continue
      }

      if (upper.match(/^PREGUNTAS[\s:]*$/) && currentSection !== 'solutions') {
        currentSection = 'questions'
        debugInfo.sectionsFound.push(`PREGUNTAS línea ${i + 1}`)
        continue
      }

      if (upper.match(/^(SOLUCIONARIO|SOLUCIONES|RESPUESTAS)[\s:]*$/)) {
        // Guardar última pregunta pendiente
        if (currentQuestion && currentQuestion.options.length === 4) {
          questions.push({ ...currentQuestion })
          debugInfo.detectedQuestions.push(`P${currentQuestion.number} guardada (${currentQuestion.options.length} opciones)`)
        }
        currentQuestion = null
        currentSection = 'solutions'
        debugInfo.sectionsFound.push(`SOLUCIONARIO línea ${i + 1}`)
        continue
      }

      // 2. PROCESAR CONTENIDO SEGÚN SECCIÓN
      if (currentSection === 'statement') {
        statement += line + '\n'
        
      } else if (currentSection === 'questions') {
        // Detectar inicio de pregunta: "PREGUNTA 1:", "PREGUNTA 1.-", "PREGUNTA 1", etc.
        const qMatch = upper.match(/^PREGUNTA\s*(\d+)/)
        if (qMatch) {
          // Guardar pregunta anterior
          if (currentQuestion) {
            console.log(`🔍 Guardando pregunta ${currentQuestion.number} con ${currentQuestion.options.length} opciones`)
          }
          if (currentQuestion && currentQuestion.options.length === 4) {
            questions.push({ ...currentQuestion })
            debugInfo.detectedQuestions.push(`P${currentQuestion.number} guardada (${currentQuestion.options.length} opciones)`)
          } else if (currentQuestion) {
            console.log(`❌ DESCARTANDO P${currentQuestion.number} - solo tiene ${currentQuestion.options.length} opciones`)
            debugInfo.detectedQuestions.push(`P${currentQuestion.number} DESCARTADA (solo ${currentQuestion.options.length} opciones)`)
          }
          
          const qNum = parseInt(qMatch[1])
          const qText = line.replace(/^PREGUNTA\s*\d+[\s:.\-]*/i, '').trim()
          
          currentQuestion = {
            number: qNum,
            text: qText,
            options: [],
            correctAnswer: '',
            explanation: ''
          }
          console.log(`✅ Iniciando P${qNum}: "${qText}"`)
          continue
        }

        // Detectar opciones: "OPCIÓN A:", "OPICION A:", "OPICIÓN A:", "A)", "A.", "A-", etc.
        const optMatch = upper.match(/^(OPC[IÍ][ÓO]N\s*)?([A-D])[\s:.\-)]/)
        if (optMatch && currentQuestion) {
          const optText = line
            .replace(/^OPC[IÍ][ÓO]N\s*[A-D][\s:.\-)]*/i, '')
            .replace(/^[A-D][\s:.\-)]*/i, '')
            .trim()
          
          currentQuestion.options.push(optText)
          console.log(`  ➕ P${currentQuestion.number} opción ${currentQuestion.options.length}: "${optText}"`)
          continue
        }

        // Texto continuo de pregunta (solo si no hay opciones aún)
        if (currentQuestion && currentQuestion.options.length === 0 && line.length > 0) {
          currentQuestion.text += ' ' + line
          console.log(`  📝 P${currentQuestion.number} texto adicional: "${line}"`)
        }
        
      } else if (currentSection === 'solutions') {
        // Detectar respuesta: "PREGUNTA 1: A", "1: A", "1. A", etc.
        const solMatch = line.match(/^(?:PREGUNTA\s*)?(\d+)[\s:.\-]+([A-D])(?:\s|$)/i)
        if (solMatch) {
          const num = parseInt(solMatch[1])
          const ans = solMatch[2].toUpperCase()
          
          // Capturar texto en la misma línea después de la respuesta
          const remainingText = line.replace(/^(?:PREGUNTA\s*)?(\d+)[\s:.\-]+([A-D])\s*/i, '').trim()
          
          solutions[num] = { 
            answer: ans, 
            explanation: remainingText || '' 
          }
          lastSolutionNumber = num
          continue
        }

        // Texto de motivación/explicación (continúa de líneas anteriores)
        // IMPORTANTE: Solo añadir si la línea NO empieza con "PREGUNTA X:"
        if (lastSolutionNumber > 0 && solutions[lastSolutionNumber] && !line.toUpperCase().match(/^PREGUNTA\s*\d+[\s:]/)) {
          if (solutions[lastSolutionNumber].explanation) {
            solutions[lastSolutionNumber].explanation += ' ' + line
          } else {
            solutions[lastSolutionNumber].explanation = line
          }
        }
      }
    }

    // Guardar última pregunta pendiente
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push({ ...currentQuestion })
      debugInfo.detectedQuestions.push(`P${currentQuestion.number} guardada FINAL (${currentQuestion.options.length} opciones)`)
    } else if (currentQuestion) {
      debugInfo.detectedQuestions.push(`P${currentQuestion.number} DESCARTADA FINAL (solo ${currentQuestion.options.length} opciones)`)
    }

    // Asignar soluciones y explicaciones
    questions.forEach(q => {
      const sol = solutions[q.number]
      if (sol) {
        q.correctAnswer = sol.answer
        q.explanation = sol.explanation?.trim() || ''
      } else {
        q.correctAnswer = 'A'
        q.explanation = ''
      }
    })

    // Debug final
    debugInfo.statementLength = statement.trim().length
    debugInfo.statementPreview = statement.trim().substring(0, 200)
    debugInfo.questionsFound = questions.length
    debugInfo.solutionsCount = Object.keys(solutions).length

    // Validaciones
    if (!statement || statement.trim().length === 0) {
      return {
        success: false,
        error: 'No se encontró el ENUNCIADO o está vacío',
        details: {
          ...debugInfo,
          hint: 'El archivo debe empezar con "ENUNCIADO" en una línea separada, seguido del texto del caso.'
        }
      }
    }

    if (questions.length === 0) {
      return {
        success: false,
        error: 'No se encontraron preguntas válidas',
        details: {
          ...debugInfo,
          hint: 'Cada pregunta debe empezar con "PREGUNTA 1:", "PREGUNTA 2:", etc. en una línea separada.'
        }
      }
    }

    if (questions.length > 15) {
      return {
        success: false,
        error: `Se encontraron ${questions.length} preguntas pero el máximo es 15`,
        details: debugInfo
      }
    }

    if (Object.keys(solutions).length === 0) {
      return {
        success: false,
        error: 'No se encontró el SOLUCIONARIO o está vacío',
        details: {
          ...debugInfo,
          hint: 'El solucionario debe tener "SOLUCIONARIO" en una línea separada, seguido de "PREGUNTA 1: A", etc.'
        }
      }
    }

    return {
      success: true,
      data: {
        statement: statement.trim(),
        questions
      }
    }

  } catch (error) {
    console.error('Parse error:', error)
    return {
      success: false,
      error: 'Error al procesar el archivo',
      details: {
        errorMessage: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
