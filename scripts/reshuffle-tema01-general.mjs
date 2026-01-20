import fs from 'fs'
import path from 'path'

const FILE_PATH = path.resolve('./TEMA 01_GENERAL_TITULO PRELIMINAR.json')

function generatePattern(length, maxRepeat = 2) {
  const pattern = []
  const choices = [0, 1, 2, 3]

  for (let i = 0; i < length; i++) {
    const allowed = choices.filter((c) => {
      if (i >= 2 && pattern[i - 1] === c && pattern[i - 2] === c) {
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
    throw new Error('Formato inesperado en el fichero de TEMA')
  }

  const questions = data.data[0].questions
  const pattern = generatePattern(questions.length, 3) // como mucho 2 iguales seguidas

  questions.forEach((q, index) => {
    const opts = JSON.parse(q.options)
    const correct = q.correctAnswer
    const correctIdx = opts.indexOf(correct)
    if (correctIdx === -1) {
      throw new Error(`La respuesta correcta no está en options en la pregunta ${index + 1}`)
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
}

reshuffleTema(FILE_PATH)
console.log('TEMA 01 GENERAL reordenado con patrón aleatorio (máx. 2 iguales seguidas).')
