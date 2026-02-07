function normalizeWhitespace(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitFirstChunkByLikelyBoundary(chunk: string): [string, string] | null {
  const s = String(chunk ?? '').trim()
  if (!s) return null

  // Try to split a chunk that contains two options glued together with a comma.
  // We bias toward a boundary close to the end, where the right side looks like a full option.
  const candidates: number[] = []
  const re = /,(?!\d)\s*(?=[A-ZÁÉÍÓÚÑ¿¡…\d])/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(s))) {
    candidates.push(match.index)
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    const idx = candidates[i]!
    const left = normalizeWhitespace(s.slice(0, idx))
    const right = normalizeWhitespace(s.slice(idx + 1))
    if (!left || !right) continue
    if (left.length < 12 || right.length < 12) continue

    // Right side often ends with punctuation when it's a complete option.
    if (/[.!?…]$/.test(right) || right.length >= 40) {
      return [left, right]
    }
  }

  return null
}

function trySplitChunkOnce(chunk: string): string[] | null {
  const split = splitFirstChunkByLikelyBoundary(chunk)
  if (!split) return null
  return [split[0], split[1]]
}

function tryExpandChunksToFour(chunks: string[]): string[] | null {
  let parts = chunks.map((c) => normalizeWhitespace(c)).filter(Boolean)
  if (parts.length === 4) return parts
  if (parts.length > 4) return null

  // Iteratively split any chunk that looks like it contains two options glued by a comma.
  // Stop once we reach exactly 4 parts.
  for (let passes = 0; passes < 4 && parts.length < 4; passes++) {
    let changed = false
    for (let i = 0; i < parts.length && parts.length < 4; i++) {
      const maybe = trySplitChunkOnce(parts[i] ?? '')
      if (maybe) {
        parts = [...parts.slice(0, i), ...maybe, ...parts.slice(i + 1)]
        changed = true
        break
      }
    }
    if (!changed) break
  }

  return parts.length === 4 ? parts : null
}

function parseLegacyOptionsFromPunctComma(raw: string): string[] | null {
  // Split on option separators that look like ".,", "?,", "!,", "…,"
  // Keep punctuation on the left side by using a lookbehind.
  const parts = String(raw ?? '')
    .split(/(?<=[.!?…])\s*,\s*/u)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean)

  if (parts.length === 4) return parts

  const expanded = tryExpandChunksToFour(parts)
  if (expanded) return expanded

  // Common special case: first option does not end with punctuation, so option1 + option2 are glued.
  if (parts.length === 3) {
    const split = splitFirstChunkByLikelyBoundary(parts[0] ?? '')
    if (split) return [split[0], split[1], parts[1]!, parts[2]!]
  }

  return null
}

function stripAppendedQuestionText(raw: string): string {
  const s = String(raw ?? '')
  // Common corruption: options blob includes the next question number like "44. ..."
  // We only strip when it appears after a long run of spaces (layout artifact).
  const match = /\s{10,}(\d{1,3})\.\s+/u.exec(s)
  if (match && match.index > 0) {
    return s.slice(0, match.index)
  }
  return s
}

export function safeParseOptions(options: unknown): string[] {
  if (!options) return []

  if (Array.isArray(options)) {
    return options.map((o) => normalizeWhitespace(o)).filter(Boolean)
  }

  if (typeof options !== 'string') return []

  const raw = stripAppendedQuestionText(options).trim()
  if (!raw) return []

  // Primary: JSON array (canonical)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((o) => normalizeWhitespace(o)).filter(Boolean)
    }
  } catch {
    // ignore; fall through to legacy parsing
  }

  // Legacy fallbacks (best-effort)
  // 1) newline-separated
  const byNewline = raw
    .split(/\r?\n+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean)
  if (byNewline.length >= 4) return byNewline

  // 2) triple-pipe / pipe separated
  const byPipes = raw
    .split(/\s*\|\|\|\s*|\s*\|\s*/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean)
  if (byPipes.length >= 4) return byPipes

  // 3) Common legacy export: Array.toString() -> options joined by commas.
  //    We split on patterns that often delimit options: ".,", "?,", "!,", "…," etc.
  //    This also supports options starting with digits (e.g. "18 meses.") and decimals ("0,30.").
  const sentenceDelimited = raw.replace(/([.!?…])\s*,\s*(?=\S)/gu, '$1\n')
  const bySentencePunct = sentenceDelimited
    .split(/\n+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean)
  if (bySentencePunct.length === 4) return bySentencePunct

  // 4) Another legacy pattern: separators like ".," exist, but one option may be glued without ".,".
  const repaired = parseLegacyOptionsFromPunctComma(raw)
  if (repaired) return repaired

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

export function normalizeCorrectAnswerToUpperLetter(
  correctAnswer: unknown,
  options: string[]
): 'A' | 'B' | 'C' | 'D' | null {
  const raw = String(correctAnswer ?? '').trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (['A', 'B', 'C', 'D'].includes(upper)) return upper as any

  // numeric index: accept 0-3 (0-based) or 1-4 (1-based)
  if (/^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10)
    const idx = n >= 0 && n <= 3 ? n : n >= 1 && n <= 4 ? n - 1 : -1
    if (idx >= 0 && idx < 4) return (['A', 'B', 'C', 'D'][idx] as any) ?? null
  }

  // option text
  const trimmedOptions = (Array.isArray(options) ? options : []).map((o) => String(o ?? '').trim())
  const byText = trimmedOptions.findIndex((opt) => opt === raw)
  if (byText >= 0 && byText < 4) return (['A', 'B', 'C', 'D'][byText] as any) ?? null

  // loose match: collapse whitespace (fixes legacy dumps with odd spacing)
  const rawLoose = normalizeWhitespace(raw)
  if (rawLoose) {
    const byLoose = trimmedOptions.findIndex((opt) => normalizeWhitespace(opt) === rawLoose)
    if (byLoose >= 0 && byLoose < 4) return (['A', 'B', 'C', 'D'][byLoose] as any) ?? null
  }

  return null
}
