import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { pathToFileURL } from 'url'

// pdf-parse debe importarse dinámicamente debido a problemas con ESM
const getPdfParse = async () => {
  const module = await import('pdf-parse')
  return (module as any).default || module
}

// Función para extraer preguntas del texto del PDF
function extractQuestionsFromText(text: string) {
  const questions: Array<{
    text: string
    options: string[]
    correctAnswer: string
    explanation: string
  }> = []

  // Normalizar texto de forma más agresiva
  let normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  console.log(`[PDF Extract] Texto total: ${normalizedText.length} caracteres`)
  console.log(`[PDF Extract] Primeros 500 caracteres:\n${normalizedText.substring(0, 500)}`)

  // Extraer sección de preguntas (antes del SOLUCIONARIO) - muy flexible
  const solucionarioRegex = /(?:SOLUCION|SOLUTION|RESPUESTA|ANSWER|CLAVE)/i
  const solucionarioMatch = normalizedText.match(solucionarioRegex)
  const solucionarioIndex = solucionarioMatch ? normalizedText.indexOf(solucionarioMatch[0]) : -1
  
  const questionsSection = solucionarioIndex > 0 
    ? normalizedText.substring(0, solucionarioIndex) 
    : normalizedText

  const solutionsSection = solucionarioIndex > 0 
    ? normalizedText.substring(solucionarioIndex) 
    : ''

  console.log(`[PDF Extract] Sección preguntas: ${questionsSection.length} chars`)
  console.log(`[PDF Extract] Sección soluciones: ${solutionsSection.length} chars`)

  // Patrones muy flexibles para detectar preguntas
  const questionPatterns = [
    // PREGUNTA 1 o Pregunta 1 (con o sin puntuación)
    /(?:PREGUNTA|Pregunta|PREGUNTA|pregunta)\s*(\d+)\s*[.:)]*\s*[¿]?([^?]+\?)/gi,
    // Solo número seguido de texto con ?
    /(?:^|\n)\s*(\d+)\s*[.:)]\s*[¿]?([^?]+\?)/gm,
    // Pregunta sin número pero con ¿?
    /(?:^|\n)\s*[¿]([^?]+\?)/gm
  ]

  let questionMatches: Array<{ number: string; text: string; index: number }> = []
  let patternUsed = -1

  // Probar cada patrón
  for (let i = 0; i < questionPatterns.length; i++) {
    const pattern = questionPatterns[i]
    pattern.lastIndex = 0
    let match
    let tempMatches: Array<{ number: string; text: string; index: number }> = []
    
    while ((match = pattern.exec(questionsSection)) !== null) {
      const questionNumber = match[1] && !isNaN(parseInt(match[1])) 
        ? match[1] 
        : String(tempMatches.length + 1)
      const questionText = match[2] || match[1]
      
      tempMatches.push({
        number: questionNumber,
        text: questionText.trim().replace(/^[¿\s]+/, '').replace(/\s+/g, ' '),
        index: match.index
      })
    }
    
    if (tempMatches.length > 0) {
      questionMatches = tempMatches
      patternUsed = i
      console.log(`[PDF Extract] Patrón ${i} exitoso: ${questionMatches.length} preguntas`)
      break
    }
  }

  console.log(`[PDF Extract] Total preguntas detectadas: ${questionMatches.length}`)

  // Procesar cada pregunta
  for (let i = 0; i < questionMatches.length; i++) {
    const { number, text: questionText } = questionMatches[i]
    const startIndex = questionMatches[i].index
    const endIndex = questionMatches[i + 1]?.index || questionsSection.length

    const questionBlock = questionsSection.substring(startIndex, endIndex)
    console.log(`[PDF Extract] Procesando pregunta ${number}, bloque de ${questionBlock.length} chars`)

    // Patrones MUY flexibles para opciones
    const optionPatterns = [
      // OPCIÓN a o Opción a (con o sin puntuación)
      /(?:OPCI[OÓ]N|Opci[oó]n)\s*([a-dA-D])\s*[.:)]*\s*([^\n]+)/gi,
      // a) o a. o a: (minúscula)
      /(?:^|\n)\s*([a-d])\s*[.:)]\s*([^\n]+)/gm,
      // A) o A. o A: (mayúscula)
      /(?:^|\n)\s*([A-D])\s*[.:)]\s*([^\n]+)/gm,
      // Solo letra seguida de espacio y texto
      /(?:^|\n)\s*([a-dA-D])\s+([^\n]{10,})/gm
    ]

    let options: string[] = []
    let optPattern = -1
    
    for (let p = 0; p < optionPatterns.length; p++) {
      const pattern = optionPatterns[p]
      pattern.lastIndex = 0
      const tempOptions: string[] = []
      const tempLetters: string[] = []
      let optMatch
      
      while ((optMatch = pattern.exec(questionBlock)) !== null) {
        const letter = optMatch[1].toLowerCase()
        const text = optMatch[2].trim()
        
        // Solo opciones que no estén vacías y sean únicas
        if (text.length > 2 && !tempLetters.includes(letter)) {
          tempLetters.push(letter)
          tempOptions.push(text)
        }
      }
      
      // Si tenemos entre 3 y 4 opciones válidas, aceptamos
      if (tempOptions.length >= 3 && tempOptions.length <= 4) {
        options = tempOptions.slice(0, 4) // Max 4
        optPattern = p
        console.log(`[PDF Extract] Pregunta ${number}: ${options.length} opciones con patrón ${p}`)
        break
      }
    }

    // Si no encontramos opciones, intentar extraer líneas
    if (options.length < 3) {
      const lines = questionBlock.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10) // Sin límite superior de caracteres
      
      if (lines.length >= 4) {
        options = lines.slice(1, 5).map(opt => opt.replace(/^[a-dA-D0-9][.:)]\s*/, ''))
        console.log(`[PDF Extract] Pregunta ${number}: ${options.length} opciones por líneas`)
      }
    }

    if (options.length < 3) {
      console.log(`[PDF Extract] ⚠️ Pregunta ${number}: Solo ${options.length} opciones, descartando`)
      continue
    }

    // Rellenar con opción vacía si falta una
    while (options.length < 4) {
      options.push('Opción no disponible')
    }

    // Buscar solución - MUY flexible
    const solutionPatterns = [
      new RegExp(`(?:PREGUNTA|Pregunta)?\\s*${number}\\s*[.:)]*\\s*(?:OPCI[OÓ]N|Opci[oó]n)?\\s*([a-dA-D])\\s*[.:)]*\\s*(?:MOTIVACI[OÓ]N|Motivaci[oó]n|Explicaci[oó]n|Justificaci[oó]n)?\\s*[.:)]*\\s*([\\s\\S]{5,400})`, 'i'),
      new RegExp(`${number}\\s*[.:)]*\\s*([a-dA-D])\\s*[.:)]*\\s*([\\s\\S]{5,400})`, 'i'),
      new RegExp(`${number}[.:)]*\\s*([a-dA-D])`, 'i')
    ]

    let correctAnswer = 'a'
    let explanation = 'Revise el material de estudio para esta pregunta'

    for (const solPattern of solutionPatterns) {
      const solutionMatch = solutionsSection.match(solPattern)
      if (solutionMatch) {
        correctAnswer = solutionMatch[1].toLowerCase()
        explanation = solutionMatch[2]?.trim().replace(/\s+/g, ' ').substring(0, 400) || explanation
        console.log(`[PDF Extract] Pregunta ${number}: solución encontrada - ${correctAnswer}`)
        break
      }
    }

    const letterIndex = correctAnswer.charCodeAt(0) - 'a'.charCodeAt(0)
    const correctAnswerLetter = letterIndex >= 0 && letterIndex < 4 ? correctAnswer : 'a'

    questions.push({
      text: questionText.includes('?') ? questionText : `${questionText}?`,
      options,
      correctAnswer: correctAnswerLetter,
      explanation
    })

    console.log(`[PDF Extract] ✓ Pregunta ${number} añadida`)
  }

  console.log(`[PDF Extract] TOTAL FINAL: ${questions.length} preguntas extraídas`)
  return questions
}

export async function POST(req: NextRequest) {
  try {
    // Configurar worker de pdf.js apuntando al worker local incluido en pdf-parse (evita fake worker)
    const workerPath = path.join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'esm', 'pdf.worker.mjs')
    // Worker setup not needed for pdf-parse npm package

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('pdf') as File
    const title = formData.get('title') as string
    const type = formData.get('type') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'PDF y título requeridos' }, { status: 400 })
    }

    // Leer contenido del archivo PDF usando pdf-parse
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let pdfText = ''

    try {
      // Extraer texto del PDF usando pdfParse directamente
      const pdfParse = await getPdfParse()
      const pdfData = await pdfParse(buffer)
      
      pdfText = pdfData.text
      
      console.log(`[PDF Parse] Total páginas procesadas: ${pdfData.pages.length}`)
      console.log(`[PDF Parse] Longitud total del texto: ${pdfText.length} caracteres`)
      
      if (!pdfText || pdfText.trim().length === 0) {
        return NextResponse.json({ 
          error: 'El PDF no contiene texto extraíble. Asegúrese de que no sea una imagen escaneada.' 
        }, { status: 400 })
      }
    } catch (e) {
      return NextResponse.json({ 
        error: 'Error al leer el PDF: ' + String(e) 
      }, { status: 400 })
    }

    // Extraer preguntas del texto
    const questions = extractQuestionsFromText(pdfText)

    if (questions.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron preguntas en el formato esperado. Verifique que el PDF use los formatos: PREGUNTA N:, OPCIÓN a:, y SOLUCIONARIO.' 
      }, { status: 400 })
    }

    console.log(`[Upload] Creando cuestionario con ${questions.length} preguntas`)

    // Crear cuestionario en la base de datos
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: type || 'theory',
        questions: {
          create: questions.map(q => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }))
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      questionnaireId: questionnaire.id,
      questionsFound: questions.length,
      message: `Cuestionario creado con éxito: ${questions.length} preguntas extraídas`
    })

  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json({ 
      error: 'Error al procesar el archivo: ' + String(error) 
    }, { status: 500 })
  }
}
