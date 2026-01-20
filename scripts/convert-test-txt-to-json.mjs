import { readFileSync, writeFileSync } from 'fs'

function printUsage() {
  console.log(`\nUso:\n`)
  console.log(
    '  node scripts/convert-test-txt-to-json.mjs <entrada.txt> <salida.json> --questionnaireId=ID [--temaCodigo=T01 --temaNumero=1 --temaParte=especifico --temaTitulo="..." --difficulty=media]'
  )
  console.log(`\nFormato esperado del fichero de entrada (TXT):\n`)
  console.log('  1. Texto de la primera pregunta')
  console.log('  A) Opción A')
  console.log('  B) Opción B')
  console.log('  C) Opción C')
  console.log('  D) Opción D')
  console.log('')
  console.log('  2. Texto de la segunda pregunta')
  console.log('  A) Opción A')
  console.log('  B) Opción B')
  console.log('  C) Opción C')
  console.log('  D) Opción D')
  console.log('')
  console.log('  SOLUCIONES:')
  console.log('  1 A')
  console.log('  2 C')
  console.log('  3 D')
  console.log('\nNotas:')
  console.log('  - Debe haber exactamente 4 opciones (A, B, C, D) por pregunta.')
  console.log('  - Las soluciones usan el número de pregunta y la letra de la opción correcta.')
}

function parseArgs(argv) {
  const args = argv.slice(2)

  if (args.length < 2 || args.some((a) => a === '--help' || a === '-h')) {
    printUsage()
    process.exit(args.length < 2 ? 1 : 0)
  }

  const inputPath = args[0]
  const outputPath = args[1]
  const flags = args.slice(2)

  const config = {
    inputPath,
    outputPath,
    // Valores por defecto pensados para Tema 01 específico
    questionnaireId: 'tema01-cuestionario-01-aass-turno-libre-especifico',
    temaCodigo: 'T01',
    temaNumero: 1,
    temaParte: 'especifico',
    temaTitulo: 'Tema 01 - Seguridad Social (Constitución y LGSS)',
    difficulty: 'media',
  }

  for (const flag of flags) {
    if (!flag.startsWith('--')) continue
    const [rawKey, ...rest] = flag.slice(2).split('=')
    const key = rawKey.trim()
    const value = rest.join('=').trim()
    if (!key || !value) continue

    if (key === 'temaNumero') {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        config.temaNumero = num
      }
    } else if (key in config) {
      // @ts-ignore
      config[key] = value
    }
  }

  if (!config.questionnaireId) {
    console.error('\n❌ Falta el parámetro --questionnaireId=...')
    printUsage()
    process.exit(1)
  }

  return config
}

function parseQuestionsAndSolutions(rawText) {
  const text = rawText.replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  const solutionsIndex = lines.findIndex((line) => {
    const t = line.trim().toLowerCase()
    return t.startsWith('soluciones') || t.startsWith('solucionario')
  })

  if (solutionsIndex === -1) {
    throw new Error('No se ha encontrado la sección de soluciones ("SOLUCIONES:" o "SOLUCIONARIO") en el fichero.')
  }

  const questionLines = lines.slice(0, solutionsIndex)
  const solutionLines = lines.slice(solutionsIndex + 1)

  const questions = []
  let i = 0

  const isQuestionStart = (line) => {
    const t = line.trim()
    return /^\d+\./.test(t) || /^\d+$/.test(t)
  }

  const isOptionStart = (line) => {
    const t = line.trim()
    // Consideramos inicio de opción solo si:
    // - Empieza por A-D seguida de "." o ")" (con o sin texto después), p. ej. "A.", "B) Opción";
    // - O es solo la letra A-D con espacios, p. ej. "A" en una línea sola.
    // Esto evita que líneas de texto normales como "A partir de..." se interpreten como opciones.
    if (/^[A-Da-d][).](\s+.*)?$/.test(t)) return true
    if (/^[A-Da-d]\s*$/.test(t)) return true
    return false
  }

  while (i < questionLines.length) {
    const rawLine = questionLines[i]
    const line = rawLine.trim()

    if (!line) {
      i++
      continue
    }

    let number = null
    let questionTextParts = []

    // Formato 1: "1. Texto de la pregunta"
    let qMatch = line.match(/^(\d+)\.\s*(.+)$/)
    if (qMatch) {
      number = Number(qMatch[1])
      questionTextParts.push(qMatch[2].trim())
      i++
    } else {
      // Formato 2: "1." en una línea y el texto en la(s) siguiente(s)
      const onlyNumberMatch = line.match(/^(\d+)\.?$/)
      if (!onlyNumberMatch) {
        i++
        continue
      }
      number = Number(onlyNumberMatch[1])
      i++

      // Acumular líneas de texto de la pregunta hasta encontrar una opción o una nueva pregunta
      while (i < questionLines.length) {
        const qtRaw = questionLines[i]
        const qt = qtRaw.trim()
        if (!qt) {
          i++
          continue
        }
        if (isOptionStart(qt) || isQuestionStart(qt)) {
          break
        }
        questionTextParts.push(qt)
        i++
      }
    }

    if (!number || questionTextParts.length === 0) {
      continue
    }

    const textQuestion = questionTextParts.join(' ')

    const options = []
    let k = i

    while (k < questionLines.length && options.length < 4) {
      const optRaw = questionLines[k]
      const optLine = optRaw.trim()

      if (!optLine) {
        k++
        continue
      }

      // Si encontramos otra pregunta o la sección de soluciones, paramos
      if (isQuestionStart(optLine)) {
        break
      }

      const optMatch = optLine.match(/^([A-Da-d])[).]?\s*(.*)$/)
      if (!optMatch) {
        // Línea que no parece inicio de opción: podría ser texto adicional de la última opción
        if (options.length > 0) {
          const lastIdx = options.length - 1
          options[lastIdx] = `${options[lastIdx]} ${optLine}`.trim()
          k++
          continue
        }
        // Si aún no hay opciones, ignoramos ruido y seguimos
        k++
        continue
      }

      const letter = optMatch[1].toUpperCase()
      let optText = (optMatch[2] || '').trim()

      // Caso "A." o "A)" sin texto en la misma línea: acumulamos de las siguientes
      if (!optText) {
        const textParts = []
        let j = k + 1
        while (j < questionLines.length) {
          const nextRaw = questionLines[j]
          const next = nextRaw.trim()

          if (!next) {
            j++
            continue
          }
          if (isOptionStart(next) || isQuestionStart(next)) {
            break
          }
          textParts.push(next)
          j++
        }
        optText = textParts.join(' ').trim()
        k = j
      } else {
        k++
      }

      if (!optText) {
        // Si aun así no hay texto, algo va mal en el formato
        break
      }

      options.push(optText)
    }

    if (options.length !== 4) {
      throw new Error(
        `La pregunta ${number} no tiene exactamente 4 opciones A-D reconocibles (encontradas ${options.length}).`
      )
    }

    questions.push({
      number,
      text: textQuestion,
      options,
    })

    i = k
  }

  if (questions.length === 0) {
    throw new Error(
      'No se ha podido parsear ninguna pregunta. Revisa el formato ("1.", texto de la pregunta en la misma línea o en la siguiente, y opciones A./B./C./D. con su texto).'
    )
  }

  const solutionMap = new Map()
  let pendingNumber = null

  for (const raw of solutionLines) {
    const line = raw.trim()
    if (!line) continue

    // Formato "1 A" o "1A" o "1.A"
    let m = line.match(/^(\d+)[).]?\s*([A-Da-d])$/)
    if (m) {
      const num = Number(m[1])
      const letter = m[2].toUpperCase()
      solutionMap.set(num, letter)
      pendingNumber = null
      continue
    }

    // Formato "1." solo número en una línea
    const onlyNum = line.match(/^(\d+)\.?$/)
    if (onlyNum) {
      pendingNumber = Number(onlyNum[1])
      continue
    }

    // Formato letra sola en la línea siguiente (B, C, ...)
    const onlyLetter = line.match(/^([A-Da-d])$/)
    if (onlyLetter && pendingNumber != null) {
      const letter = onlyLetter[1].toUpperCase()
      solutionMap.set(pendingNumber, letter)
      pendingNumber = null
      continue
    }

    // Formato "1 B texto extra" (tomamos lo primero que parezca número + letra)
    m = line.match(/(\d+)\s*([A-Da-d])/)
    if (m) {
      const num = Number(m[1])
      const letter = m[2].toUpperCase()
      solutionMap.set(num, letter)
      pendingNumber = null
      continue
    }
  }

  if (solutionMap.size === 0) {
    throw new Error(
      'No se ha podido parsear ninguna solución. Asegúrate de que el solucionario tiene líneas tipo "1.", "A" en la siguiente, o "1 A".'
    )
  }

  return { questions, solutionMap }
}

function buildExportJson({
  questions,
  solutionMap,
  questionnaireId,
  temaCodigo,
  temaNumero,
  temaParte,
  temaTitulo,
  difficulty,
}) {
  const questionsForJson = questions.map((q) => {
    const letter = solutionMap.get(q.number)
    if (!letter) {
      throw new Error(
        `No hay solución para la pregunta ${q.number}. Asegúrate de que en SOLUCIONES aparece una línea "${q.number} <letra>".`
      )
    }

    const indexMap = { A: 0, B: 1, C: 2, D: 3 }
    const idx = indexMap[letter]

    const correctOptionText = q.options[idx]
    if (!correctOptionText) {
      throw new Error(
        `Para la pregunta ${q.number}, la solución indica la opción ${letter}, pero no existe (solo hay ${q.options.length} opciones).`
      )
    }

    return {
      questionnaireId,
      text: q.text,
      options: JSON.stringify(q.options),
      correctAnswer: correctOptionText,
      explanation: '',
      temaCodigo,
      temaNumero,
      temaParte,
      temaTitulo,
      difficulty,
    }
  })

  const exportData = {
    totalQuestions: questionsForJson.length,
    totalQuestionnaires: 1,
    data: [
      {
        questionnaireId,
        questionCount: questionsForJson.length,
        questions: questionsForJson,
      },
    ],
  }

  return exportData
}

async function main() {
  try {
    const config = parseArgs(process.argv)

    console.log('📥 Leyendo fichero de entrada:', config.inputPath)
    const rawText = readFileSync(config.inputPath, 'utf8')

    const { questions, solutionMap } = parseQuestionsAndSolutions(rawText)

    console.log(`✅ Preguntas parseadas: ${questions.length}`)
    console.log(`✅ Soluciones parseadas: ${solutionMap.size}`)

    const exportData = buildExportJson({
      questions,
      solutionMap,
      questionnaireId: config.questionnaireId,
      temaCodigo: config.temaCodigo,
      temaNumero: config.temaNumero,
      temaParte: config.temaParte,
      temaTitulo: config.temaTitulo,
      difficulty: config.difficulty,
    })

    writeFileSync(config.outputPath, JSON.stringify(exportData, null, 2), 'utf8')

    console.log('\n💾 JSON generado en:', config.outputPath)
    console.log('\n📊 Resumen:')
    console.log('   Cuestionario:', config.questionnaireId)
    console.log('   Preguntas  :', exportData.totalQuestions)
    console.log('   Tema       :', `${config.temaCodigo} (${config.temaTitulo})`)
  } catch (err) {
    console.error('\n❌ Error al generar el JSON:')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
