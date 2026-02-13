function sanitizeText(value: unknown): string {
  if (value == null) return ''
  // Eliminar bytes nulos (Postgres no los admite)
  return String(value).replace(/\u0000/g, '')
}

export function safeParseOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((opt) => sanitizeText(opt).trim()).filter(Boolean)
  }

  if (options && typeof options === 'object') {
    // Legacy: { A: '...', B: '...', C: '...', D: '...' }
    const asRecord = options as Record<string, unknown>
    const keys = ['A', 'B', 'C', 'D']
    const values = keys.map((k) => sanitizeText(asRecord[k]).trim())
    if (values.filter(Boolean).length === 4) return values
  }

  if (typeof options !== 'string') return []

  const raw = sanitizeText(options).trim()
  if (!raw) return []

  // JSON array string
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((opt) => sanitizeText(opt).trim()).filter(Boolean)
      }
    } catch {
      // fallthrough
    }
  }

  // Split by common delimiters
  const candidates: string[][] = []
  if (raw.includes('\n')) candidates.push(raw.split(/\r?\n/))
  if (raw.includes('|')) candidates.push(raw.split('|'))
  if (raw.includes(';')) candidates.push(raw.split(';'))

  // Only try comma split if it reasonably yields 4 items
  if (raw.includes(',')) candidates.push(raw.split(','))

  for (const parts of candidates) {
    const normalized = parts.map((p) => sanitizeText(p).trim()).filter(Boolean)
    if (normalized.length === 4) return normalized
  }

  // Last resort: try to parse formats like "A) ... B) ... C) ... D) ..."
  const letterSplit = raw
    .replace(/\r/g, '')
    .split(/\s*[A-Da-d]\s*[\)\].:\-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (letterSplit.length === 4) return letterSplit

  return []
}

export function letterFromIndex(index: number): string | null {
  if (index < 0 || index > 3) return null
  return String.fromCharCode(97 + index) // a-d
}

function upperLetterFromIndex(index: number): 'A' | 'B' | 'C' | 'D' | null {
  if (index < 0 || index > 3) return null
  return String.fromCharCode(65 + index) as 'A' | 'B' | 'C' | 'D'
}

export function normalizeLetter(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim().toLowerCase()
  return ['a', 'b', 'c', 'd'].includes(v) ? v : null
}

export function normalizeCorrectAnswerToUpperLetter(
  correctAnswer: unknown,
  options: unknown,
): 'A' | 'B' | 'C' | 'D' | null {
  const normalizedOptions = Array.isArray(options) ? options.map((o) => sanitizeText(o).trim()) : safeParseOptions(options)
  if (!Array.isArray(normalizedOptions) || normalizedOptions.length !== 4) return null

  // 1) Direct letter
  if (typeof correctAnswer === 'string' && /^[A-D]$/i.test(correctAnswer.trim())) {
    return correctAnswer.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D'
  }

  // 2) Numeric index (0-3) or position (1-4)
  if (typeof correctAnswer === 'number' && Number.isFinite(correctAnswer)) {
    const asInt = Math.trunc(correctAnswer)
    return upperLetterFromIndex(asInt >= 1 && asInt <= 4 ? asInt - 1 : asInt)
  }
  if (typeof correctAnswer === 'string') {
    const raw = correctAnswer.trim()
    if (/^\d+$/.test(raw)) {
      const asInt = parseInt(raw, 10)
      return upperLetterFromIndex(asInt >= 1 && asInt <= 4 ? asInt - 1 : asInt)
    }
  }

  // 3) Exact (or case-insensitive) option text match
  const asText = sanitizeText(correctAnswer).trim()
  if (!asText) return null

  const exactIndex = normalizedOptions.findIndex((opt) => opt === asText)
  if (exactIndex !== -1) return upperLetterFromIndex(exactIndex)

  const lower = asText.toLowerCase()
  const caseInsensitiveMatches = normalizedOptions
    .map((opt, idx) => ({ opt, idx }))
    .filter(({ opt }) => opt.toLowerCase() === lower)
  if (caseInsensitiveMatches.length === 1) return upperLetterFromIndex(caseInsensitiveMatches[0].idx)

  return null
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
