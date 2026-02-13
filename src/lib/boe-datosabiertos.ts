export type BoeSumarioItem = {
  identificador: string
  titulo: string
  urlHtml: string
  urlPdf?: string
  urlXml?: string
  section?: string
  department?: string
  epigrafe?: string
}

function collapseWs(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function decodeXmlEntities(value: string): string {
  const raw = String(value || '')
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function attrValue(tag: string, attrName: string): string | undefined {
  const re = new RegExp(`${attrName}="([^"]*)"`, 'i')
  const m = tag.match(re)
  return m?.[1] ? decodeXmlEntities(m[1]) : undefined
}

function extractTagText(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m?.[1]) return undefined
  return collapseWs(decodeXmlEntities(m[1]))
}

function extractStatusCode(xml: string): number {
  const code = extractTagText(xml, 'code')
  const n = Number(code)
  return Number.isFinite(n) ? n : 0
}

export function formatBoeDateYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function parseBoeSumarioXml(xmlRaw: string): { publicationDateYYYYMMDD: string; items: BoeSumarioItem[] } {
  const xml = String(xmlRaw || '')
  const status = extractStatusCode(xml)
  if (status !== 200) {
    const text = extractTagText(xml, 'text') || 'Error BOE'
    throw new Error(`BOE API status ${status}: ${text}`)
  }

  const publicationDateYYYYMMDD = extractTagText(xml, 'fecha_publicacion') || ''

  let currentSection: string | undefined
  let currentDepartment: string | undefined
  let currentEpigrafe: string | undefined

  const items: BoeSumarioItem[] = []

  // Stream-ish scan for seccion/departamento/epigrafe open tags and item blocks.
  const tokenRe = /<(seccion|departamento|epigrafe)\b([^>]*)>|<item>\s*/gi
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(xml))) {
    const token = match[0]
    const kind = match[1]?.toLowerCase?.()

    if (token.toLowerCase().startsWith('<seccion')) {
      const nombre = attrValue(token, 'nombre')
      currentSection = nombre ? collapseWs(decodeXmlEntities(nombre)) : currentSection
      continue
    }

    if (token.toLowerCase().startsWith('<departamento')) {
      const nombre = attrValue(token, 'nombre')
      currentDepartment = nombre ? collapseWs(decodeXmlEntities(nombre)) : currentDepartment
      continue
    }

    if (token.toLowerCase().startsWith('<epigrafe')) {
      const nombre = attrValue(token, 'nombre')
      currentEpigrafe = nombre ? collapseWs(decodeXmlEntities(nombre)) : currentEpigrafe
      continue
    }

    // <item>
    const startIdx = match.index
    const closeIdx = xml.indexOf('</item>', tokenRe.lastIndex)
    if (closeIdx === -1) break

    const block = xml.slice(startIdx, closeIdx + '</item>'.length)
    tokenRe.lastIndex = closeIdx + '</item>'.length

    const identificador = extractTagText(block, 'identificador') || ''
    const titulo = extractTagText(block, 'titulo') || ''
    const urlHtml = extractTagText(block, 'url_html') || ''
    const urlPdf = extractTagText(block, 'url_pdf')
    const urlXml = extractTagText(block, 'url_xml')

    if (!identificador || !titulo || !urlHtml) continue

    items.push({
      identificador,
      titulo,
      urlHtml,
      urlPdf,
      urlXml,
      section: currentSection,
      department: currentDepartment,
      epigrafe: currentEpigrafe
    })
  }

  return { publicationDateYYYYMMDD, items }
}

export async function fetchBoeSumarioXml(yyyymmdd: string): Promise<string> {
  const url = `https://www.boe.es/datosabiertos/api/boe/sumario/${encodeURIComponent(yyyymmdd)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/xml'
    },
    // BOE endpoint is public; caching isn't critical for cron.
    cache: 'no-store'
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`BOE sumario HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  return text
}

export async function fetchBoeSumario(yyyymmdd: string): Promise<{ publicationDateYYYYMMDD: string; items: BoeSumarioItem[] }> {
  const xml = await fetchBoeSumarioXml(yyyymmdd)
  return parseBoeSumarioXml(xml)
}
