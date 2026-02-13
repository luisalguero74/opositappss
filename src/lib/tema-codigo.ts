export function normalizeTemaCodigo(input: string): string | null {
  if (!input) return null

  const trimmed = input.trim().toUpperCase()
  const match = trimmed.match(/^([GE])0*(\d{1,2})$/)
  if (!match) return null

  const letter = match[1]
  const num = Number.parseInt(match[2], 10)
  if (!Number.isFinite(num) || num <= 0) return null

  return `${letter}${String(num).padStart(2, '0')}`
}

export function temaCodigoFromTemaOficialId(temaId: string): string | null {
  if (!temaId) return null

  const trimmed = temaId.trim().toLowerCase()
  const match = trimmed.match(/^([ge])(\d{1,2})$/)
  if (!match) return null

  const letter = match[1].toUpperCase()
  const num = Number.parseInt(match[2], 10)
  if (!Number.isFinite(num) || num <= 0) return null

  return `${letter}${String(num).padStart(2, '0')}`
}

export function temaCodigoVariants(input: string): string[] {
  if (!input) return []

  const trimmed = input.trim()
  if (!trimmed) return []

  // Caso 1: viene como id del temario oficial (g1/e1)
  const fromId = temaCodigoFromTemaOficialId(trimmed)
  if (fromId) {
    const unpadded = fromId.replace(/^([GE])0+/, '$1')
    return unpadded === fromId ? [fromId] : [fromId, unpadded]
  }

  // Caso 2: viene como código (G1/G01/E5/E05)
  const normalized = normalizeTemaCodigo(trimmed)
  if (normalized) {
    const unpadded = normalized.replace(/^([GE])0+/, '$1')
    return unpadded === normalized ? [normalized] : [normalized, unpadded]
  }

  // Fallback: devolver el valor en mayúsculas tal cual
  return [trimmed.toUpperCase()]
}
