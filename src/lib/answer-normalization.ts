export function safeParseOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(String)
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export function letterFromIndex(index: number): string | null {
  if (index < 0 || index > 3) return null
  return String.fromCharCode(97 + index) // a-d
}

export function normalizeLetter(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim().toLowerCase()
  return ['a', 'b', 'c', 'd'].includes(v) ? v : null
}

export function getCorrectAnswerLetter(correctAnswer: string, options: string[]): string | null {
  const asLetter = normalizeLetter(correctAnswer)
  if (asLetter) return asLetter

  const raw = String(correctAnswer ?? '').trim()
  if (!raw) return null

  const idx = options.findIndex(opt => opt === raw)
  return letterFromIndex(idx)
}

export function getCorrectAnswerText(correctAnswer: string, options: string[]): string | null {
  const asLetter = normalizeLetter(correctAnswer)
  if (asLetter) {
    const idx = asLetter.charCodeAt(0) - 97
    return options[idx] ?? null
  }

  const raw = String(correctAnswer ?? '').trim()
  if (!raw) return null
  if (options.includes(raw)) return raw

  return null
}

export function normalizeSelectedAnswerToLetter(selectedAnswer: string, options: string[]): string | null {
  const asLetter = normalizeLetter(selectedAnswer)
  if (asLetter) return asLetter

  const raw = String(selectedAnswer ?? '').trim()
  if (!raw) return null

  const idx = options.findIndex(opt => opt === raw)
  return letterFromIndex(idx)
}
