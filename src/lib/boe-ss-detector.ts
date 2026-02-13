import type { BoeSumarioItem } from './boe-datosabiertos'

export type BoeSsDetection = {
  matched: boolean
  score: number
  reasons: string[]
}

function norm(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function includesAny(haystack: string, needles: string[]): string[] {
  const hits: string[] = []
  for (const n of needles) {
    if (haystack.includes(n)) hits.push(n)
  }
  return hits
}

const STRONG = [
  'seguridad social',
  'tesoreria general de la seguridad social',
  'tgss',
  'instituto nacional de la seguridad social',
  'inss',
  'mutuas colaboradoras',
  'mutua colaboradora',
  'real decreto legislativo 8/2015',
  'rdl 8/2015',
  'ley general de la seguridad social',
  'lgss'
]

const MEDIUM = [
  'cotizacion',
  'bases de cotizacion',
  'recaudacion',
  'liquidacion',
  'cuotas',
  'apremio',
  'recargo',
  'afiliacion',
  'altas y bajas',
  'incapacidad temporal',
  'it',
  'jubilacion',
  'pension',
  'prestacion',
  'subsidio',
  'viudedad',
  'orfandad',
  'incapacidad permanente',
  'riesgo durante el embarazo',
  'maternidad',
  'paternidad',
  'nacimiento y cuidado del menor',
  'autonomos',
  'reta',
  'regimen general',
  'regimen especial'
]

const ORGS = [
  'ministerio de inclusion, seguridad social y migraciones',
  'inclusion, seguridad social y migraciones',
  'seguridad social y migraciones',
  'secretaria de estado de la seguridad social',
  'dirección general de ordenacion de la seguridad social',
  'direccion general de ordenacion de la seguridad social'
]

export function detectSecuritySocialBoeItem(item: BoeSumarioItem): BoeSsDetection {
  const text = norm([item.titulo, item.section, item.department, item.epigrafe].filter(Boolean).join(' | '))

  const reasons: string[] = []
  let score = 0

  const strongHits = includesAny(text, STRONG)
  if (strongHits.length > 0) {
    score += 6
    reasons.push(...strongHits.map(h => `strong:${h}`))
  }

  const mediumHits = includesAny(text, MEDIUM)
  if (mediumHits.length > 0) {
    score += Math.min(6, mediumHits.length * 2)
    reasons.push(...mediumHits.slice(0, 8).map(h => `medium:${h}`))
  }

  const orgHits = includesAny(text, ORGS)
  if (orgHits.length > 0) {
    score += 4
    reasons.push(...orgHits.map(h => `org:${h}`))
  }

  // Small nudge if it's clearly a norm-like instrument.
  if (/\b(real decreto|decreto|ley|orden|resolucion|resolución)\b/.test(text)) {
    score += 1
    reasons.push('type:norma')
  }

  // Threshold: require at least one strong hit OR multiple medium signals.
  const matched = strongHits.length > 0 || score >= 5

  return {
    matched,
    score,
    reasons
  }
}
