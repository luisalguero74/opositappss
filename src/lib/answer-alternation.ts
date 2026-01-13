export type ABCD = 'A' | 'B' | 'C' | 'D'

const LETTERS: ABCD[] = ['A', 'B', 'C', 'D']

export function toIndex(letter: string): number {
  const up = String(letter || '').trim().toUpperCase()
  const idx = LETTERS.indexOf(up as ABCD)
  return idx >= 0 ? idx : 0
}

export function toLetter(index: number): ABCD {
  return LETTERS[Math.max(0, Math.min(3, index))]!
}

export function stripOptionPrefix(option: string): string {
  const s = String(option ?? '').trim()
  // Remove leading "A)", "A.", "A -", "A:" etc.
  return s.replace(/^[A-Da-d]\s*[\)\.\-:：]\s*/u, '').trim()
}

export function normalizeOptions(options: string[]): string[] {
  if (!Array.isArray(options)) return []
  return options.map(stripOptionPrefix)
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

function chooseTargetIndex(params: {
  prevLetters: ABCD[]
  counts: Record<ABCD, number>
  maxRun: number
}): number {
  const { prevLetters, counts, maxRun } = params

  const last = prevLetters[prevLetters.length - 1]
  const run = (() => {
    if (!last) return 0
    let r = 1
    for (let i = prevLetters.length - 2; i >= 0; i--) {
      if (prevLetters[i] === last) r++
      else break
    }
    return r
  })()

  const candidates = LETTERS.filter(l => {
    if (!last) return true
    if (l !== last) return true
    return run < maxRun
  })

  const sorted = candidates
    .slice()
    .sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0))

  return toIndex(sorted[0] ?? 'A')
}

export function rebalanceQuestionsABCD<T extends { options: any; correctAnswer: any }>(
  questions: T[],
  maxRun: number = 2
): T[] {
  const counts: Record<ABCD, number> = { A: 0, B: 0, C: 0, D: 0 }
  const prev: ABCD[] = []

  return questions.map((q: any) => {
    const rawOptions = Array.isArray(q.options)
      ? q.options.map((x: any) => String(x))
      : typeof q.options === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(q.options)
              return Array.isArray(parsed) ? parsed.map((x: any) => String(x)) : []
            } catch {
              return []
            }
          })()
        : []

    if (rawOptions.length !== 4) return q

    const options = normalizeOptions(rawOptions)
    const correctLetter = String(q.correctAnswer || '').toUpperCase()
    const fromIndex = toIndex(correctLetter)

    const targetIndex = chooseTargetIndex({ prevLetters: prev, counts, maxRun })
    const newOptions = moveItem(options, fromIndex, targetIndex)
    const newCorrect = toLetter(targetIndex)

    counts[newCorrect]++
    prev.push(newCorrect)

    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrect
    }
  })
}

export function rebalancePreguntasPorIndice<T extends { opciones: string[]; respuestaCorrecta: number }>(
  preguntas: T[],
  maxRun: number = 2
): T[] {
  const counts: Record<ABCD, number> = { A: 0, B: 0, C: 0, D: 0 }
  const prev: ABCD[] = []

  return preguntas.map(p => {
    const options = normalizeOptions(p.opciones)
    if (options.length !== 4) return p

    const fromIndex = Math.max(0, Math.min(3, Number(p.respuestaCorrecta)))
    const targetIndex = chooseTargetIndex({ prevLetters: prev, counts, maxRun })

    const newOptions = moveItem(options, fromIndex, targetIndex)
    const newCorrect = toLetter(targetIndex)

    counts[newCorrect]++
    prev.push(newCorrect)

    return {
      ...p,
      opciones: newOptions,
      respuestaCorrecta: targetIndex
    }
  })
}
