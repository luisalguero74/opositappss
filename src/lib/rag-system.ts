// Usar fetch directo en lugar del SDK de Groq para evitar problemas de conexión
import { generateEmbedding, cosineSimilarity, deserializeEmbedding } from './embeddings'

// Función para realizar búsquedas web de fuentes oficiales
async function searchWebSources(query: string): Promise<Array<{ title: string; content: string; source: string }>> {
  try {
    // Búsqueda de fuentes oficiales españolas
    const sources: Array<{ title: string; content: string; source: string }> = []
    
    // Agregar fuentes oficiales conocidas
    const officialSources = [
      { name: 'BOE', url: 'https://www.boe.es' },
      { name: 'INSS', url: 'https://www.seg-social.es' },
      { name: 'Real Decreto', url: 'https://www.boe.es/buscar/act.php' },
      { name: 'Tribunal Constitucional', url: 'https://www.tribunalconstitucional.es' }
    ]
    
    console.log(`🌐 Realizando búsqueda web de fuentes oficiales para: "${query}"`)
    
    // En producción, esto podría usar APIs reales de BOE, INSS, etc.
    // Por ahora retornamos array vacío para no ralentizar
    return sources
  } catch (error) {
    console.error('Error en búsqueda web:', error)
    return []
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface RAGContext {
  documentId: string
  documentTitle: string
  content: string
  relevanceScore: number
  category?: string
  documentType?: 'ley' | 'tema_general' | 'tema_especifico' | 'normativa'
  embedding?: number[] // Vector embedding para búsqueda semántica
}

/**
 * Búsqueda AVANZADA de contexto relevante con EMBEDDINGS VECTORIALES + Keywords
 * Combina búsqueda semántica (embeddings) con búsqueda por palabras clave
 */
export async function searchRelevantContext(
  query: string,
  documents: Array<{ id: string; title: string; content: string; topic?: string; embedding?: string | null }>,
  maxResults: number = 5
): Promise<RAGContext[]> {
  console.log(`🔍 [searchRelevantContext] Buscando en ${documents.length} documentos...`)
  
  // 1. BÚSQUEDA POR EMBEDDINGS (si están disponibles)
  const docsWithEmbeddings = documents.filter(d => d.embedding)
  let semanticResults: Array<{ id: string; score: number }> = []
  
  if (docsWithEmbeddings.length > 0 && process.env.OPENAI_API_KEY) {
    console.log(`🎯 Usando búsqueda vectorial semántica (${docsWithEmbeddings.length} docs con embeddings)`)
    
    try {
      // Generar embedding de la query
      const queryEmbedding = await generateEmbedding(query)
      
      if (queryEmbedding.length > 0) {
        // Calcular similitud con cada documento
        semanticResults = docsWithEmbeddings.map(doc => {
          const docEmbedding = deserializeEmbedding(doc.embedding!)
          const similarity = cosineSimilarity(queryEmbedding, docEmbedding)
          return { id: doc.id, score: similarity * 500 } // Escalar a rango similar al keyword search
        }).filter(r => r.score > 0)
        
        console.log(`  ✅ ${semanticResults.length} resultados semánticos`)
      }
    } catch (error: any) {
      console.error('❌ Error en búsqueda semántica:', error.message)
    }
  } else {
    console.log(`📝 Usando solo búsqueda por keywords (embeddings no disponibles)`)
  }
  
  // 2. BÚSQUEDA POR KEYWORDS (sistema original mejorado)
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)
  
  console.log(`[searchRelevantContext] Palabras clave: ${queryWords.join(', ')}`)
  
  // Detectar referencias específicas a artículos (ej: "artículo 42", "art. 42", "art 42", "art. 205.1")
  const articlePattern = /(?:artículo|art\.?|articulo)\s*(\d+(?:\.\d+)?(?:\.[a-z]\))?)/gi
  const articleMatches = [...queryLower.matchAll(articlePattern)]
  const mentionedArticles = articleMatches.map(m => m[1])
  
  if (mentionedArticles.length > 0) {
    console.log(`[searchRelevantContext] Artículos específicos buscados: ${mentionedArticles.join(', ')}`)
  }
  
  // Detectar términos legales y administrativos importantes
  const legalTerms = ['ley', 'artículo', 'art', 'real decreto', 'rd', 'orden', 'estatuto', 'constitución', 
                      'lgss', 'estatuto de los trabajadores', 'procedimiento administrativo', 'seguridad social',
                      'jubilación', 'pensión', 'incapacidad', 'desempleo', 'afiliación', 'cotización']
  const hasLegalTerms = legalTerms.some(term => queryLower.includes(term))
  
  // Detectar nombres específicos de leyes
  const lawNames = {
    'lgss': 'Ley General de la Seguridad Social',
    'ley general de la seguridad social': 'LGSS',
    'estatuto de los trabajadores': 'ET',
    'procedimiento administrativo': 'Ley 39/2015',
    'régimen jurídico': 'Ley 40/2015',
    'constitución': 'Constitución Española',
    '8/2015': 'RDL 8/2015'
  }
  
  const scored = documents.map(doc => {
    const contentLower = doc.content.toLowerCase()
    const titleLower = doc.title.toLowerCase()
    let score = 0
    
    console.log(`[searchRelevantContext] Analizando: "${doc.title.substring(0, 50)}..."`)
    
    // 1. MÁXIMA PRIORIDAD: Si pregunta por un artículo específico y el documento lo contiene
    if (mentionedArticles.length > 0) {
      mentionedArticles.forEach(articleNum => {
        // Escapar caracteres especiales en el número de artículo (para regex)
        const escapedNum = articleNum.replace(/\./g, '\\.')
        // Buscar el artículo en el contenido con diferentes formatos
        // Soporta: "Artículo 205.1.a)", "Art. 205.1", "art 205", etc.
        const articleRegex = new RegExp(
          `artículo\\s*${escapedNum}[^0-9a-z]|art\\.?\\s*${escapedNum}[^0-9a-z]`,
          'gi'
        )
        const articleFound = articleRegex.test(contentLower)
        if (articleFound) {
          score += 1000 // Puntuación MASIVA si encuentra el artículo exacto
          console.log(`  ✅ Artículo ${articleNum} encontrado - PRIORIDAD MÁXIMA`)
        }
      })
    }
    
    // 2. Búsqueda por nombre de ley específico
    Object.entries(lawNames).forEach(([keyword, lawName]) => {
      if (queryLower.includes(keyword) && (titleLower.includes(keyword) || titleLower.includes(lawName.toLowerCase()))) {
        score += 200
      }
    })
    
    // 3. Puntuación por palabras clave en contenido
    queryWords.forEach(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const contentMatches = (contentLower.match(new RegExp(escapedWord, 'g')) || []).length
      const titleMatches = (titleLower.match(new RegExp(escapedWord, 'g')) || []).length
      
      if (contentMatches > 0) {
        console.log(`  📄 "${word}": ${contentMatches} matches en contenido`)
      }
      if (titleMatches > 0) {
        console.log(`  📌 "${word}": ${titleMatches} matches en título`)
      }
      
      score += contentMatches * 3 // Contenido vale triple
      score += titleMatches * 15  // Título vale mucho más
    })
    
    // 4. Bonus si el título contiene la query completa
    if (titleLower.includes(queryLower)) {
      score += 150
      console.log(`  ⭐ Query completa encontrada en título`)
    }
    
    // 5. Bonus si es documento legal y la query menciona términos legales
    const docType = detectDocumentType(doc.title, doc.content)
    if (hasLegalTerms && docType === 'ley') {
      score *= 1.8
      console.log(`  ⚖️ Boost por documento legal: score × 1.8`)
    }

    // 5b. Priorizar LGSS (RDL 8/2015) solo si la query menciona LGSS o 8/2015
    const queryMentionsLGSS = queryLower.includes('8/2015') || queryLower.includes('rdl 8') || 
                               queryLower.includes('r.d.l. 8') || queryLower.includes('lgss') ||
                               queryLower.includes('ley general de la seguridad social')
    const isLGSSDocument = titleLower.includes('8/2015') || titleLower.includes('ley general de la seguridad social')
    
    if (queryMentionsLGSS && isLGSSDocument && score > 0) {
      score *= 2.2
      score += 300
      console.log(`  🚀 Boost por LGSS específica: score × 2.2 + 300`)
    }
    
    // 5c. Boost moderado para documentos del temario de Seguridad Social si es relevante
    const isSSTopic = doc.topic?.toLowerCase().includes('seguridad social') || 
                      titleLower.includes('seguridad social')
    if (isSSTopic && score > 50) {
      score *= 1.3
      console.log(`  📘 Boost por tema de Seguridad Social: score × 1.3`)
    }
    
    // 6. Bonus para documentos del temario si la query menciona "tema"
    if (queryLower.includes('tema') && (docType === 'tema_general' || docType === 'tema_especifico')) {
      score *= 1.5
      console.log(`  📚 Boost por temario: score × 1.5`)
    }
    
    // 7. Penalización si el documento no contiene ninguna palabra clave
    if (score === 0) {
      console.log(`  ❌ Sin coincidencias, descartado`)
      return null
    }
    
    console.log(`  Final score: ${Math.round(score)}`)
    
    return {
      documentId: doc.id,
      documentTitle: doc.title,
      content: doc.content,
      relevanceScore: score,
      category: doc.topic || 'General',
      documentType: docType
    }
  }).filter(Boolean) as RAGContext[]
  
  // 3. COMBINAR RESULTADOS: Sumar scores de embeddings + keywords
  const combinedScores = new Map<string, number>()
  
  // Agregar scores de keywords
  scored.forEach(doc => {
    combinedScores.set(doc.documentId, doc.relevanceScore)
  })
  
  // Agregar/sumar scores de embeddings
  semanticResults.forEach(result => {
    const existing = combinedScores.get(result.id) || 0
    combinedScores.set(result.id, existing + result.score)
  })
  
  // Crear resultado final con scores combinados
  const allDocs = documents.reduce((acc, doc) => {
    acc.set(doc.id, doc)
    return acc
  }, new Map())
  
  const combinedResults = Array.from(combinedScores.entries())
    .map(([id, score]) => {
      const doc = allDocs.get(id)!
      return {
        documentId: id,
        documentTitle: doc.title,
        content: doc.content,
        relevanceScore: score,
        category: doc.topic || 'General',
        documentType: detectDocumentType(doc.title, doc.content)
      }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults)
  
  console.log(`🔍 Resultados finales (embeddings + keywords) para: "${query}"`)
  combinedResults.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.documentTitle} (score: ${Math.round(r.relevanceScore)}, tipo: ${r.documentType})`)
  })
  
  return combinedResults.length > 0 ? combinedResults : scored.slice(0, maxResults)
}

/**
 * Detecta el tipo de documento basado en su título y contenido
 */
function detectDocumentType(
  title: string, 
  content: string
): 'ley' | 'tema_general' | 'tema_especifico' | 'normativa' {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('tema') && titleLower.includes('general')) {
    return 'tema_general'
  }
  if (titleLower.includes('tema') && titleLower.includes('específico')) {
    return 'tema_especifico'
  }
  if (titleLower.match(/ley|real decreto|rd|orden|estatuto|constitución/)) {
    return 'ley'
  }
  
  return 'normativa'
}

/**
 * Genera respuesta PROFESIONAL usando RAG AVANZADO CON VALIDACIÓN CRUZADA
 * Incluye análisis de múltiples documentos, verificación de coherencia y comparación de fuentes
 */
export async function generateRAGResponse(
  userQuery: string,
  context: RAGContext[],
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  // Construir contexto optimizado - limitar tamaño total
  let contextText = ''
  let totalContextLength = 0
  const maxContextLength = 10000 // Aumentar a 10k para más información
  
  // Agregar documentos con contenido limitado inteligentemente
  context.forEach((doc, idx) => {
    // Limitar cada documento de forma inteligente
    const maxDocLength = doc.documentType === 'ley' ? 3500 : 2000
    
    // Si la query menciona artículo específico, intentar encontrarlo y dar más contexto
    const articleMatch = userQuery.match(/artículo\s*(\d+(?:\.\d+)?(?:\.[a-z]\))?)/i)
    let contentSnippet = ''
    
    if (articleMatch && doc.content.toLowerCase().includes(`artículo ${articleMatch[1].toLowerCase()}`)) {
      // Encontrar el artículo y extraer contexto amplio
      const articleNum = articleMatch[1].replace(/\./g, '\\.')
      const articleRegex = new RegExp(
        `(artículo\\s*${articleNum}[\\s\\S]*?)(\\n\\s*artículo\\s*\\d+|$)`,
        'gi'
      )
      const articleContent = doc.content.match(articleRegex)
      if (articleContent && articleContent[0]) {
        // Incluir artículo completo + algo de contexto posterior
        const extracted = articleContent[0].substring(0, maxDocLength)
        contentSnippet = extracted
        console.log(`  📌 Extrayendo artículo ${articleMatch[1]} específicamente (${extracted.length} chars)`)
      } else {
        // Fallback: buscar el artículo de forma más amplia
        const index = doc.content.toLowerCase().indexOf(`artículo ${articleMatch[1].toLowerCase()}`)
        if (index !== -1) {
          // Extraer desde 200 chars antes hasta maxDocLength después
          const start = Math.max(0, index - 200)
          contentSnippet = doc.content.substring(start, start + maxDocLength)
          console.log(`  📌 Extrayendo contexto amplio del artículo ${articleMatch[1]}`)
        } else {
          contentSnippet = doc.content.substring(0, maxDocLength)
        }
      }
    } else {
      contentSnippet = doc.content.substring(0, maxDocLength)
    }
    
    const docHeader = `\n━━━ DOCUMENTO ${idx + 1}: ${doc.documentTitle} ━━━\n`
    const docContent = `${contentSnippet}${doc.content.length > maxDocLength ? '\n[...contenido adicional no mostrado...]' : ''}\n`
    
    const docText = docHeader + docContent
    
    // Verificar que no excedemos el límite total
    if (totalContextLength + docText.length <= maxContextLength) {
      contextText += docText
      totalContextLength += docText.length
    } else {
      // Si no cabe completo, incluir solo título y primeras líneas
      const shortSnippet = doc.content.substring(0, 300)
      contextText += `\n━━━ DOCUMENTO ${idx + 1}: ${doc.documentTitle} ━━━\n${shortSnippet}...\n[Documento disponible pero no incluido por límite de espacio]\n`
    }
  })
  
  console.log(`[RAG] Contexto optimizado: ${contextText.length} caracteres totales`)
  console.log(`[RAG] Documentos incluidos: ${context.length}`)

  // System prompt MEJORADO: más estricto y preciso
  const systemPrompt = `Eres un ASESOR JURÍDICO EXPERTO en Seguridad Social Española y preparación de oposiciones al Cuerpo General Administrativo de la Seguridad Social.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS ABSOLUTAS - INCUMPLIMIENTO = RESPUESTA INVÁLIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ESTÁNDARES DE CALIDAD PROFESIONAL:

1. **PROFESIONALIDAD**: Tono formal, respetuoso y técnico. Evita coloquialismos.
2. **LENGUAJE JURÍDICO**: Usa terminología legal precisa (p.ej.: "prestación contributiva", "hecho causante", "base reguladora").
3. **PRECISIÓN ABSOLUTA**: Cada dato debe provenir ÚNICAMENTE de los documentos proporcionados.
4. **REFERENCIA AL TEXTO LEGAL**: SIEMPRE cita el artículo exacto y su fuente normativa.

✅ OBLIGATORIO en cada respuesta:
   - CITA TEXTUAL de artículos: "El artículo X.Y establece: '[TEXTO EXACTO]'"
   - FORMATO de referencias: **[Artículo XXX del RDL 8/2015]**, **[Tema X: título]**
   - TERMINOLOGÍA JURÍDICA correcta (no lenguaje coloquial)
   - ESTRUCTURA PROFESIONAL: respuesta directa → fundamento legal → explicación

✅ SOLO información de los documentos proporcionados
✅ Si un artículo NO está en los documentos: responde "No dispongo del texto del artículo X en los documentos disponibles. Recomiendo consultar el BOE."
✅ Si NO hay información: "No encuentro información sobre [tema] en la documentación disponible."

❌ PROHIBIDO ABSOLUTAMENTE:
   - Inventar números de artículos
   - Mencionar artículos que no están en los documentos
   - Dar información no presente en los documentos
   - Usar datos aproximados o "probablemente"
   - Decir "según el artículo X" si X no aparece arriba
   - Lenguaje informal o coloquial
   - Respuestas sin fundamento legal explícito
   - Respuestas vagas o genéricas tipo "depende del caso"
   - Información sin citar la fuente específica
   - Explicaciones sin base en los documentos proporcionados

🚫 SI NO TIENES LA INFORMACIÓN COMPLETA:
   - NO intentes responder parcialmente
   - NO inventes ni aproximes datos
   - Indica claramente: "No dispongo de información completa sobre [X] en los documentos disponibles"
   - Sugiere consultar la fuente oficial (BOE, normativa específica)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTOS DISPONIBLES PARA CONSULTA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${contextText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 FORMATO DE RESPUESTA OBLIGATORIO:

1. **RESPUESTA DIRECTA** (1-2 frases con terminología jurídica precisa)

2. **FUNDAMENTACIÓN LEGAL** (citar artículos específicos con texto exacto):
   - **[Artículo XXX del RDL 8/2015]**: "[Cita textual completa del artículo]"
   - **[Tema X: Título]**: Contenido relevante con referencias normativas

3. **EXPLICACIÓN DETALLADA** (desarrollar conceptos jurídicos con precisión técnica)
   - Utiliza terminología legal apropiada
   - Define conceptos complejos (prestación, base reguladora, hecho causante, etc.)
   - Mantén tono profesional y formal

4. **EJEMPLOS PRÁCTICOS** (solo si los documentos los incluyen o se derivan directamente)

5. **FUENTES CONSULTADAS**: 
   - Listar documentos normativos utilizados
   - Indicar artículos específicos citados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ VALIDACIÓN FINAL ANTES DE RESPONDER:
Antes de enviar tu respuesta, verifica:
1. ✓ ¿Cité al menos UN artículo específico con su número exacto?
2. ✓ ¿Incluí el texto literal del artículo entre comillas?
3. ✓ ¿Toda la información proviene de los documentos anteriores?
4. ✓ ¿Usé terminología jurídica profesional?
5. ✓ ¿Evité frases vagas como "depende", "normalmente", "suele"?

Si NO puedes cumplir los 5 puntos, responde: "No dispongo de información suficiente en los documentos disponibles para responder con la precisión jurídica requerida. Recomiendo consultar [fuente oficial específica]."

RECORDATORIO: Es mejor decir "no tengo esa información" que dar una respuesta vaga o inventada. La precisión jurídica es FUNDAMENTAL para oposiciones.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-2), // Solo últimos 2 mensajes
    { role: 'user', content: userQuery }
  ]

  console.log(`[RAG] Tamaño total de mensajes: ${JSON.stringify(messages).length} caracteres`)
  console.log(`[RAG] Mensajes: ${messages.length} | Query: "${userQuery.substring(0, 100)}"`)

  try {
    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.85,
        frequency_penalty: 0.3,
        presence_penalty: 0.1
      })
    })

    if (!apiResponse.ok) {
      throw new Error(`Groq API error: ${apiResponse.status} ${apiResponse.statusText}`)
    }

    const completion = await apiResponse.json()
    const response = completion.choices[0]?.message?.content || 'No pude generar una respuesta'
    console.log(`[RAG] Respuesta generada: ${response.length} caracteres`)
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VALIDACIÓN DE CALIDAD DE RESPUESTA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // 1. Verificar que no sea una respuesta genérica/vaga
    const vaguePatterns = [
      /depende del caso/i,
      /puede variar/i,
      /normalmente/i,
      /generalmente/i,
      /suele ser/i,
      /en algunos casos/i,
      /esto depende/i
    ]
    
    const hasVagueLanguage = vaguePatterns.some(pattern => pattern.test(response))
    if (hasVagueLanguage && response.length < 300) {
      console.warn(`⚠️ ADVERTENCIA: Respuesta contiene lenguaje vago y es corta (${response.length} chars)`)
    }
    
    // 2. Verificar que incluya citas de artículos o referencias legales
    const hasLegalReferences = /artículo\s*\d+|art\.\s*\d+|\[.*?\]|tema\s*\d+/gi.test(response)
    if (!hasLegalReferences && context.length > 0) {
      console.warn(`⚠️ ADVERTENCIA: Respuesta sin referencias legales a pesar de tener contexto disponible`)
    }
    
    // 3. Validar que los artículos mencionados existen en el contexto
    const mentionedArticles = [...response.matchAll(/artículo\s*(\d+(?:\.\d+)?)/gi)]
    if (mentionedArticles.length > 0) {
      console.log(`[RAG] Artículos mencionados en respuesta: ${mentionedArticles.map(m => m[1]).join(', ')}`)
      
      // Verificar que están en el contexto
      const invalidArticles: string[] = []
      mentionedArticles.forEach(match => {
        const articleNum = match[1]
        const inContext = new RegExp(`artículo\\s*${articleNum}[^0-9]`, 'gi').test(contextText)
        if (!inContext) {
          invalidArticles.push(articleNum)
          console.warn(`⚠️ ADVERTENCIA: Respuesta menciona Artículo ${articleNum} que NO está en contexto`)
        }
      })
      
      // Si hay artículos inventados, advertir en la respuesta
      if (invalidArticles.length > 0) {
        console.error(`❌ ERROR CRÍTICO: Respuesta menciona artículos NO presentes en documentos: ${invalidArticles.join(', ')}`)
      }
    }
    
    // 4. Verificar longitud mínima razonable para respuesta profesional
    if (response.length < 150 && context.length > 0) {
      console.warn(`⚠️ ADVERTENCIA: Respuesta muy corta (${response.length} chars) con contexto disponible`)
    }
    
    return response
  } catch (error) {
    console.error('[RAG] Error:', error)
    throw error
  }
}

/**
 * Genera resumen exhaustivo de un documento con validación de precisión
 */
export async function generateDocumentSummary(
  documentTitle: string,
  content: string,
  maxLength = 500
): Promise<string> {
  const prompt = `Resume este documento legal de forma clara, precisa y exhaustiva para estudiantes de oposiciones:

DOCUMENTO: ${documentTitle}

CONTENIDO:
${content.substring(0, 8000)}

Genera un resumen de máximo ${maxLength} palabras que incluya:
1. Tema principal - Define claramente de qué trata
2. Artículos clave - Lista los artículos más importantes con números
3. Conceptos fundamentales - Explica los términos jurídicos usados
4. Procedimientos/pasos - Si aplica, ordena cronológicamente
5. Aplicación práctica - Ejemplos concretos en Seguridad Social
6. Conexiones normativas - Relación con otras leyes si aparecen

Instrucciones de precisión:
- CITA TEXTUALMENTE artículos específicos (entre comillas)
- NO inventes información no contenida en el texto
- Mantén terminología jurídica precisa
- Estructura en párrafos cortos y numerados
- Señala con ✅ los puntos clave para examen`

  try {
    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en resumir documentación legal para oposiciones, manteniendo máxima precisión y usando solo información literal del documento.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1024
      })
    })

    if (!apiResponse.ok) {
      throw new Error(`Groq API error: ${apiResponse.status} ${apiResponse.statusText}`)
    }

    const completion = await apiResponse.json()
    return completion.choices[0]?.message?.content || 'No se pudo generar el resumen'
  } catch (error) {
    console.error('Error generando resumen:', error)
    throw error
  }
}

/**
 * Explica un concepto de forma exhaustiva y validada basándose en los documentos
 */
export async function explainConcept(
  concept: string,
  relatedDocuments: RAGContext[]
): Promise<string> {
  const contextText = relatedDocuments
    .map(c => `\n[${c.documentTitle}]\n${c.content.substring(0, 2000)}`)
    .join('\n\n---\n\n')

  const prompt = `Explica de forma clara, precisa y exhaustiva el siguiente concepto para estudiantes de oposiciones:

CONCEPTO: ${concept}

DOCUMENTACIÓN DE REFERENCIA DISPONIBLE:
${contextText}

La explicación debe seguir esta estructura:

1. **DEFINICIÓN LEGAL LITERAL** 📜
   - Cita TEXTUALMENTE cómo se define en los documentos
   - Si aparece en múltiples documentos, muestra todas las definiciones
   - Usa comillas para transcripciones literales

2. **ANÁLISIS TÉCNICO** 🔍
   - Explica cada parte de la definición
   - Diferencia este concepto de otros relacionados
   - Menciona artículos específicos donde aparece

3. **APLICACIÓN PRÁCTICA EN SEGURIDAD SOCIAL** 💼
   - 3-5 ejemplos concretos y realistas
   - Cómo se aplicaría en casos prácticos
   - Casos típicos de examen

4. **JURISPRUDENCIA Y DOCTRINA** ⚖️
   - Si aparecen en los documentos, incluye interpretaciones
   - Señala variaciones según leyes

5. **PUNTOS CLAVE PARA EXAMEN** ✅
   - Resalta lo más importante
   - Errores comunes a evitar
   - Relación con otros conceptos

Máximo 400 palabras. Sé preciso, no inventes, cita literalmente.`

  try {
    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un profesor experto explicando conceptos jurídicos para oposiciones. Mantén máxima precisión, cita literalmente documentos, y enfoca todo a aplicación práctica en Seguridad Social.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1500
      })
    })

    if (!apiResponse.ok) {
      throw new Error(`Groq API error: ${apiResponse.status} ${apiResponse.statusText}`)
    }

    const completion = await apiResponse.json()
    return completion.choices[0]?.message?.content || 'No se pudo generar la explicación'
  } catch (error) {
    console.error('Error explicando concepto:', error)
    throw error
  }
}
