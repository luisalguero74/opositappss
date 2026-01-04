/**
 * Script de prueba del parser de supuestos prácticos
 * Verifica que los archivos de ejemplo se parsean correctamente
 */

import * as fs from 'fs'
import * as path from 'path'

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
          if (currentQuestion && currentQuestion.options.length === 4) {
            questions.push({ ...currentQuestion })
            debugInfo.detectedQuestions.push(`P${currentQuestion.number} guardada (${currentQuestion.options.length} opciones)`)
          } else if (currentQuestion) {
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
          continue
        }

        // Detectar opciones: "OPCIÓN A:", "OPCION A:", "A)", "A.", "A-", etc.
        const optMatch = upper.match(/^(OPCI[OÓ]N\s*)?([A-D])[\s:.\-)]/)
        if (optMatch && currentQuestion) {
          const optText = line
            .replace(/^OPCI[OÓ]N\s*[A-D][\s:.\-)]*/i, '')
            .replace(/^[A-D][\s:.\-)]*/i, '')
            .trim()
          
          currentQuestion.options.push(optText)
          continue
        }

        // Texto continuo de pregunta (solo si no hay opciones aún)
        if (currentQuestion && currentQuestion.options.length === 0 && line.length > 0) {
          currentQuestion.text += ' ' + line
        }
        
      } else if (currentSection === 'solutions') {
        // Detectar respuesta: "PREGUNTA 1: A", "1: A", "1. A", etc.
        const solMatch = line.match(/(?:PREGUNTA\s*)?(\d+)[\s:.\-]+([A-D])/i)
        if (solMatch) {
          const num = parseInt(solMatch[1])
          const ans = solMatch[2].toUpperCase()
          solutions[num] = { answer: ans, explanation: '' }
          lastSolutionNumber = num
          continue
        }

        // Texto de motivación/explicación
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

async function testExamples() {
  console.log('🧪 Iniciando pruebas del parser de supuestos prácticos\n')
  console.log('='.repeat(70) + '\n')

  const examples = [
    {
      name: 'Ejemplo completo (5 preguntas)',
      path: 'public/ejemplos/EJEMPLO_SUPUESTO_PRACTICO_CORRECTO.txt'
    },
    {
      name: 'Ejemplo básico (2 preguntas)',
      path: 'public/ejemplos/EJEMPLO_BASICO_2_PREGUNTAS.txt'
    }
  ]

  let passedTests = 0
  let failedTests = 0

  for (const example of examples) {
    console.log(`📄 Probando: ${example.name}`)
    console.log('-'.repeat(70))

    try {
      const filePath = path.join(process.cwd(), example.path)
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Archivo no encontrado: ${filePath}\n`)
        failedTests++
        continue
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const result = parsePracticalCase(content)

      if (result.success && result.data) {
        console.log(`✅ ÉXITO - Parseado correctamente`)
        console.log(`   📝 Enunciado: ${result.data.statement.substring(0, 100)}...`)
        console.log(`   ❓ Preguntas encontradas: ${result.data.questions.length}`)
        
        result.data.questions.forEach((q, idx) => {
          console.log(`      ${idx + 1}. ${q.text.substring(0, 60)}...`)
          console.log(`         Opciones: ${q.options.length}`)
          console.log(`         Respuesta correcta: ${q.correctAnswer}`)
          const hasExplanation = q.explanation && q.explanation.trim().length > 0
          console.log(`         Explicación: ${hasExplanation ? '✓ Sí' : '✗ No'}`)
          if (hasExplanation) {
            console.log(`         Explicación (preview): ${q.explanation.substring(0, 80)}...`)
          }
        })
        
        passedTests++
      } else {
        console.log(`❌ ERROR - ${result.error}`)
        if (result.details) {
          console.log(`   Detalles:`, JSON.stringify(result.details, null, 2))
        }
        failedTests++
      }

      console.log('')

    } catch (error) {
      console.log(`❌ ERROR INESPERADO: ${error instanceof Error ? error.message : error}\n`)
      failedTests++
    }
  }

  console.log('='.repeat(70))
  console.log(`\n📊 RESUMEN DE PRUEBAS:`)
  console.log(`   ✅ Exitosas: ${passedTests}/${examples.length}`)
  console.log(`   ❌ Fallidas: ${failedTests}/${examples.length}`)
  
  if (failedTests === 0) {
    console.log(`\n🎉 ¡Todas las pruebas pasaron correctamente!`)
  } else {
    console.log(`\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.`)
    process.exit(1)
  }
}

testExamples()
