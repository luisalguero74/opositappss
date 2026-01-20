import fs from 'fs'
import path from 'path'

function generatePattern(length, maxRepeat = 2) {
  const pattern = []
  const choices = [0, 1, 2, 3]

  for (let i = 0; i < length; i++) {
    const allowed = choices.filter((c) => {
      if (i >= maxRepeat && pattern.slice(i - maxRepeat, i).every((v) => v === c)) {
        return false
      }
      return true
    })

    const picked = allowed[Math.floor(Math.random() * allowed.length)]
    pattern.push(picked)
  }

  return pattern
}

function reshuffleTema(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)

  if (!data?.data?.[0]?.questions || !Array.isArray(data.data[0].questions)) {
    console.warn(`Saltando fichero (formato inesperado): ${filePath}`)
    return
  }

  const questions = data.data[0].questions
  const pattern = generatePattern(questions.length, 2) // como mucho 2 iguales seguidas

  questions.forEach((q, index) => {
    const opts = JSON.parse(q.options)
    const correct = q.correctAnswer
    const correctIdx = opts.indexOf(correct)
    if (correctIdx === -1) {
      console.warn(
        `⚠️  Saltando pregunta ${index + 1} en ${path.basename(
          filePath
        )}: la respuesta correcta no está en options. Revísala manualmente.`
      )
      return
    }

    const incorrect = opts.filter((o) => o !== correct)

    // Mezcla aleatoria de las incorrectas
    for (let i = incorrect.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[incorrect[i], incorrect[j]] = [incorrect[j], incorrect[i]]
    }

    const targetPos = pattern[index]
    const newOpts = new Array(opts.length)
    newOpts[targetPos] = correct

    let k = 0
    for (let pos = 0; pos < newOpts.length; pos++) {
      if (!newOpts[pos]) {
        newOpts[pos] = incorrect[k++]
      }
    }

    q.options = JSON.stringify(newOpts)
  })

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`Reordenado: ${path.basename(filePath)} (${questions.length} preguntas)`)}

function main() {
  const dir = process.cwd()
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('TEMA ') && f.endsWith('.json'))

  if (files.length === 0) {
    console.log('No se han encontrado ficheros TEMA *.json en el directorio actual.')
    return
  }

  console.log(`Encontrados ${files.length} ficheros TEMA *.json. Reordenando...`)
  for (const file of files) {
    const fullPath = path.resolve(dir, file)
    reshuffleTema(fullPath)
  }

  console.log('✅ Reordenado aleatorio completado para todos los TEMAS (máx. 2 iguales seguidas).')
}

main()
