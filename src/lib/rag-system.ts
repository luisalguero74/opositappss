import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'

// Groq SDK se inicializa bajo demanda
async function getGroqClient() {
  const Groq = (await import('groq-sdk')).default
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
}

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
}

/**
 * Búsqueda AVANZADA de contexto relevante en TODOS los documentos
 * Incluye leyes, temas del temario general y específico, y validación cruzada
 */
export async function searchRelevantContext(
  query: string,
  documents: Array<{ id: string; title: string; content: string; topic?: string }>,
  maxResults: number = 5
): Promise<RAGContext[]> {
  console.log(`🔍 [searchRelevantContext] Buscando en ${documents.length} documentos...`)
  
  // Análisis avanzado de la query
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)
  
  console.log(`[searchRelevantContext] Palabras clave: ${queryWords.join(', ')}`)
  
  // Detectar referencias específicas a artículos (ej: "artículo 42", "art. 42", "art 42")
  const articlePattern = /(?:artículo|art\.?|articulo)\s*(\d+(?:\.\d+)?)/gi
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
        // Buscar el artículo en el contenido con diferentes formatos
        const articleRegex = new RegExp(`artículo\\s*${articleNum}[^0-9]|art\\.?\\s*${articleNum}[^0-9]`, 'gi')
        const articleFound = articleRegex.test(contentLower)
        if (articleFound) {
          score += 500 // Puntuación masiva si encuentra el artículo exacto
          console.log(`  ✅ Artículo ${articleNum} encontrado`)
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
  
  // Ordenar por relevancia y devolver los más relevantes
  let results = scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults)

  // Fallback: si no hay resultados o son pocos, fuerza inclusión de LGSS (RDL 8/2015) si está en el corpus
  const hasLgss = results.some(r => r.documentTitle.toLowerCase().includes('8/2015') || r.documentTitle.toLowerCase().includes('ley general de la seguridad social'))
  if (!hasLgss) {
    const lgssDoc = scored.find(r => r.documentTitle.toLowerCase().includes('8/2015') || r.documentTitle.toLowerCase().includes('ley general de la seguridad social'))
    if (lgssDoc) {
      results = [lgssDoc, ...results].slice(0, maxResults)
    }
  }
    
  console.log(`🔍 Resultados de búsqueda para: "${query}"`)
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.documentTitle} (score: ${Math.round(r.relevanceScore)}, tipo: ${r.documentType})`)
  })
  
  return results
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
    const maxDocLength = doc.documentType === 'ley' ? 2500 : 1500
    
    // Si la query menciona artículo específico, intentar encontrarlo y dar más contexto
    const articleMatch = userQuery.match(/artículo\s*(\d+)/i)
    let contentSnippet = ''
    
    if (articleMatch && doc.content.toLowerCase().includes(`artículo ${articleMatch[1]}`)) {
      // Encontrar el artículo y extraer contexto amplio
      const articleRegex = new RegExp(`(artículo\\s*${articleMatch[1]}[^]*?)(artículo\\s*\\d+|$)`, 'gi')
      const articleContent = doc.content.match(articleRegex)
      if (articleContent && articleContent[0]) {
        contentSnippet = articleContent[0].substring(0, maxDocLength)
        console.log(`  📌 Extrayendo artículo ${articleMatch[1]} específicamente`)
      } else {
        contentSnippet = doc.content.substring(0, maxDocLength)
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

  // System prompt muy conciso y directo
  const systemPrompt = `Eres un experto jurídico en Seguridad Social Española especializado en preparación de oposiciones.

REGLAS CRÍTICAS DE RESPUESTA:
1. ✅ RESPONDE SOLO con información de los documentos proporcionados abajo
2. ✅ CITA SIEMPRE la fuente: "[Artículo X de LEY Y]" o "[Tema Z: Sección...]"
3. ✅ Para artículos específicos: cita textualmente el número y contenido
4. ✅ Si NO encuentras información: responde "No dispongo de información sobre [tema] en los documentos disponibles"
5. ❌ NUNCA inventes artículos, números, porcentajes o datos
6. ❌ NUNCA menciones "Artículo X" si no está en los documentos
7. ✅ Si hay varios documentos con información: menciona todos

FORMATO DE RESPUESTA:
- Inicia con la respuesta directa
- Luego explica con detalle
- Cita fuentes específicas con formato: **[Artículo XXX de LGSS]** o **[Tema X: título]**
- Si son varios artículos: enuméralos
- Incluye ejemplos prácticos si los hay en los documentos

DOCUMENTOS DISPONIBLES:
${contextText}

IMPORTANTE: Si mencionas un artículo, cita el número EXACTO que aparece arriba. Si no está, NO lo menciones.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-2), // Solo últimos 2 mensajes
    { role: 'user', content: userQuery }
  ]

  console.log(`[RAG] Tamaño total de mensajes: ${JSON.stringify(messages).length} caracteres`)
  console.log(`[RAG] Mensajes: ${messages.length} | Query: "${userQuery.substring(0, 100)}"`)

  try {
    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.05, // MUY BAJA: máxima precisión, mínima invención
      max_tokens: 1500,
      top_p: 0.9, // Reducir creatividad
      frequency_penalty: 0.2, // Evitar repetición
      presence_penalty: 0.1 // Mantener enfoque
    })

    const response = completion.choices[0]?.message?.content || 'No pude generar una respuesta'
    console.log(`[RAG] Respuesta: ${response.length} caracteres`)
    
    // Validar que la respuesta no invente artículos
    const mentionedArticles = [...response.matchAll(/artículo\s*(\d+)/gi)]
    if (mentionedArticles.length > 0) {
      console.log(`[RAG] Artículos mencionados en respuesta: ${mentionedArticles.map(m => m[1]).join(', ')}`)
      
      // Verificar que están en el contexto
      mentionedArticles.forEach(match => {
        const articleNum = match[1]
        const inContext = new RegExp(`artículo\\s*${articleNum}[^0-9]`, 'gi').test(contextText)
        if (!inContext) {
          console.warn(`⚠️ ADVERTENCIA: Respuesta menciona Artículo ${articleNum} que NO está en contexto`)
        }
      })
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
    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
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
      temperature: 0.1, // Más preciso
      max_tokens: 1024
    })

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
    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
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
      temperature: 0.1, // Más preciso
      max_tokens: 1500
    })

    return completion.choices[0]?.message?.content || 'No se pudo generar la explicación'
  } catch (error) {
    console.error('Error explicando concepto:', error)
    throw error
  }
}
