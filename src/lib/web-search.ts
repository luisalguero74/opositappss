/**
 * Sistema de búsqueda web para complementar el RAG con fuentes externas
 * Enfocado en fuentes oficiales de Seguridad Social y legislación española
 */

export interface WebSource {
  title: string
  url: string
  snippet: string
  relevance: number
  type: 'oficial' | 'legislacion' | 'doctrina' | 'jurisprudencia'
}

// Fuentes oficiales prioritarias de Seguridad Social
const OFFICIAL_SOURCES = [
  'seg-social.es',
  'boe.es',
  'congreso.es',
  'tribunalconstitucional.es',
  'inss.es',
  'tgss.seg-social.es'
]

/**
 * Buscar información en fuentes oficiales de Seguridad Social
 */
export async function searchOfficialSources(
  query: string,
  maxResults: number = 5
): Promise<WebSource[]> {
  const results: WebSource[] = []

  try {
    // Construcción de búsqueda enfocada en fuentes oficiales
    const officialQuery = `${query} site:seg-social.es OR site:boe.es OR site:inss.es`
    
    // Aquí se puede integrar con APIs de búsqueda como:
    // - Google Custom Search API (para búsquedas específicas en dominios oficiales)
    // - SerpAPI
    // - Bing Search API
    
    // Por ahora, devolvemos URLs conocidas relevantes como ejemplos
    const knowledgeBase = getKnownOfficialResources(query)
    results.push(...knowledgeBase)

    return results.slice(0, maxResults)
  } catch (error) {
    console.error('[Web Search] Error:', error)
    return []
  }
}

/**
 * Base de conocimiento de recursos oficiales conocidos
 */
function getKnownOfficialResources(query: string): WebSource[] {
  const queryLower = query.toLowerCase()
  const sources: WebSource[] = []

  // BOE - Legislación
  if (queryLower.includes('ley') || queryLower.includes('real decreto') || queryLower.includes('normativa')) {
    sources.push({
      title: 'Boletín Oficial del Estado - Legislación Seguridad Social',
      url: 'https://www.boe.es/buscar/legislacion.php',
      snippet: 'Búsqueda de legislación oficial sobre Seguridad Social en el BOE',
      relevance: 100,
      type: 'legislacion'
    })
  }

  // Seguridad Social - Portal Oficial
  if (queryLower.includes('prestación') || queryLower.includes('pensión') || queryLower.includes('cotización')) {
    sources.push({
      title: 'Seguridad Social - Portal Oficial',
      url: 'https://www.seg-social.es/',
      snippet: 'Información oficial sobre prestaciones, pensiones y servicios de la Seguridad Social',
      relevance: 95,
      type: 'oficial'
    })
  }

  // INSS - Instituto Nacional de Seguridad Social
  if (queryLower.includes('jubilación') || queryLower.includes('incapacidad') || queryLower.includes('maternidad')) {
    sources.push({
      title: 'INSS - Instituto Nacional de la Seguridad Social',
      url: 'https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil',
      snippet: 'Información sobre prestaciones del sistema de Seguridad Social español',
      relevance: 90,
      type: 'oficial'
    })
  }

  // TGSS - Tesorería General
  if (queryLower.includes('afiliación') || queryLower.includes('alta') || queryLower.includes('cotización')) {
    sources.push({
      title: 'TGSS - Tesorería General de la Seguridad Social',
      url: 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores',
      snippet: 'Gestión de afiliación, altas y cotizaciones a la Seguridad Social',
      relevance: 85,
      type: 'oficial'
    })
  }

  // Constitución Española
  if (queryLower.includes('constitución') || queryLower.includes('constitucional')) {
    sources.push({
      title: 'Constitución Española de 1978',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
      snippet: 'Texto completo de la Constitución Española',
      relevance: 95,
      type: 'legislacion'
    })
  }

  // LGSS - Ley General de la Seguridad Social
  if (queryLower.includes('lgss') || queryLower.includes('ley general')) {
    sources.push({
      title: 'Real Decreto Legislativo 8/2015 - Ley General de la Seguridad Social',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
      snippet: 'Texto consolidado de la Ley General de la Seguridad Social',
      relevance: 100,
      type: 'legislacion'
    })
  }

  // Estatuto de los Trabajadores
  if (queryLower.includes('estatuto') || queryLower.includes('trabajadores') || queryLower.includes('contrato')) {
    sources.push({
      title: 'Real Decreto Legislativo 2/2015 - Estatuto de los Trabajadores',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430',
      snippet: 'Texto consolidado del Estatuto de los Trabajadores',
      relevance: 90,
      type: 'legislacion'
    })
  }

  return sources.sort((a, b) => b.relevance - a.relevance)
}

/**
 * Generar citas legales formales para las respuestas
 */
export function generateLegalCitations(sources: WebSource[]): string {
  if (sources.length === 0) return ''

  const citations = sources
    .map((source, idx) => {
      const num = idx + 1
      return `[${num}] ${source.title} - ${source.url}`
    })
    .join('\n')

  return `\n\n**📚 Fuentes consultadas:**\n${citations}`
}

/**
 * Enriquecer contexto RAG con fuentes web
 */
export async function enrichWithWebSources(
  query: string,
  internalContext: string
): Promise<{ enrichedContext: string; webSources: WebSource[] }> {
  const webSources = await searchOfficialSources(query, 3)
  
  if (webSources.length === 0) {
    return { enrichedContext: internalContext, webSources: [] }
  }

  const webContext = webSources
    .map(source => `**${source.title}**\n${source.snippet}`)
    .join('\n\n')

  const enrichedContext = `${internalContext}\n\n**FUENTES EXTERNAS OFICIALES:**\n${webContext}`

  return { enrichedContext, webSources }
}
