export type NormalizedPhone = {
  canonical: string // +34XXXXXXXXX
  variants: string[] // common representations stored historically
}

export function normalizeSpanishPhone(input: unknown): NormalizedPhone | null {
  if (typeof input !== 'string') return null

  // Remove spaces, dashes, parentheses, dots
  let clean = input.trim().replace(/[\s\-\(\)\.]/g, '')

  if (!clean) return null

  // Normalize international prefixes
  // Accept: +34XXXXXXXXX, 34XXXXXXXXX, 0034XXXXXXXXX, XXXXXXXXX
  if (clean.startsWith('+')) clean = clean.slice(1)

  if (clean.startsWith('0034')) clean = clean.slice(4)
  else if (clean.startsWith('34') && clean.length === 11) clean = clean.slice(2)

  // Now should be 9 digits
  if (!/^\d{9}$/.test(clean)) return null

  const canonical = `+34${clean}`

  const variants = Array.from(
    new Set([
      canonical,
      `34${clean}`,
      clean,
      `+${canonical.slice(1)}` // defensive, equals canonical
    ])
  )

  return { canonical, variants }
}
