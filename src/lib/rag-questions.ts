/**
 * SISTEMA RAG PARA GENERACIÓN DE PREGUNTAS
 * Consulta la biblioteca legal antes de generar preguntas para mayor precisión
 */

import { prisma } from './prisma'
import { searchRelevantContext, RAGContext } from './rag-system'

/**
 * Busca documentos legales relevantes para un tema específico
 */
export async function buscarDocumentosLegalesParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico'
): Promise<RAGContext[]> {
  console.log(`[RAG] Buscando documentos legales para Tema ${temaNumero}: ${temaTitulo}`)

  // Construir query de búsqueda basada en el tema
  const query = `${temaTitulo} ${temaDescripcion}`
  
  // Buscar en LegalDocument (Biblioteca Legal)
  const legalDocuments = await prisma.legalDocument.findMany({
    where: {
      active: true,
      OR: [
        { title: { contains: temaTitulo, mode: 'insensitive' } },
        { title: { contains: temaDescripcion, mode: 'insensitive' } },
        { content: { contains: temaTitulo, mode: 'insensitive' } },
        { title: { contains: 'Constitución', mode: 'insensitive' } },
        { title: { contains: 'Ley 39/2015', mode: 'insensitive' } },
        { title: { contains: 'Ley 40/2015', mode: 'insensitive' } },
        { title: { contains: 'EBEP', mode: 'insensitive' } },
        { title: { contains: 'LGSS', mode: 'insensitive' } },
        { title: { contains: 'RDL 8/2015', mode: 'insensitive' } },
        { title: { contains: 'Seguridad Social', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      title: true,
      content: true,
      reference: true,
      embedding: true,
      sections: {
        select: {
          title: true,
          content: true
        },
        take: 10
      }
    },
    take: 20
  })

  console.log(`[RAG] Encontrados ${legalDocuments.length} documentos legales en biblioteca`)

  // Convertir a formato para searchRelevantContext
  const documents = legalDocuments.map(doc => ({
    id: doc.id,
    title: doc.title,
    content: doc.content || '',
    topic: categoria,
    embedding: doc.embedding
  }))

  // Usar sistema RAG para encontrar los más relevantes
  const relevantDocs = await searchRelevantContext(query, documents, 5)

  console.log(`[RAG] Documentos más relevantes:`)
  relevantDocs.forEach((doc, idx) => {
    console.log(`  ${idx + 1}. ${doc.documentTitle} (relevancia: ${Math.round(doc.relevanceScore)})`)
  })

  return relevantDocs
}

/**
 * Busca artículos específicos en documentos legales
 */
export async function buscarArticulosEspecificos(
  articulos: string[]
): Promise<{ articulo: string; texto: string; fuente: string }[]> {
  console.log(`[RAG] Buscando artículos específicos: ${articulos.join(', ')}`)

  const resultados: { articulo: string; texto: string; fuente: string }[] = []

  for (const articulo of articulos) {
    // Buscar en LegalDocument y sus secciones
    const docs = await prisma.legalDocument.findMany({
      where: {
        active: true,
        OR: [
          { content: { contains: articulo, mode: 'insensitive' } },
          {
            sections: {
              some: {
                content: { contains: articulo, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      include: {
        sections: {
          where: {
            content: { contains: articulo, mode: 'insensitive' }
          },
          take: 5
        }
      },
      take: 3
    })

    for (const doc of docs) {
      // Extraer el texto del artículo del contenido
      const regex = new RegExp(`(${articulo}[^.]+\\.[^.]*\\.)`, 'i')
      const match = doc.content?.match(regex)
      
      if (match) {
        resultados.push({
          articulo,
          texto: match[1],
          fuente: doc.title
        })
      }

      // También buscar en secciones
      for (const section of doc.sections) {
        const sectionMatch = section.content?.match(regex)
        if (sectionMatch) {
          resultados.push({
            articulo,
            texto: sectionMatch[1],
            fuente: `${doc.title} - ${section.title}`
          })
        }
      }
    }
  }

  console.log(`[RAG] Encontrados ${resultados.length} textos de artículos`)
  return resultados
}

/**
 * Enriquece el prompt con contexto de la biblioteca legal
 */
export function enriquecerPromptConRAG(
  promptBase: string,
  documentosRAG: RAGContext[]
): string {
  if (documentosRAG.length === 0) {
    return promptBase
  }

  const contextoLegal = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTOS LEGALES DE REFERENCIA (Biblioteca Legal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usa EXCLUSIVAMENTE estos documentos oficiales como fuente de información legal:

${documentosRAG.map((doc, idx) => `
${idx + 1}. **${doc.documentTitle}** (Relevancia: ${Math.round(doc.relevanceScore)}%)
   Tipo: ${doc.documentType}
   
   Contenido:
   ${doc.content.substring(0, 2000)}${doc.content.length > 2000 ? '...' : ''}
   
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 INSTRUCCIONES CRÍTICAS DE USO:

1. **CITAS TEXTUALES OBLIGATORIAS**: 
   - Extrae LITERALMENTE los textos de los artículos de arriba
   - Usa comillas para las citas exactas
   - NUNCA inventes el texto de un artículo

2. **REFERENCIAS PRECISAS**:
   - Cita artículo + documento específico (ej: "Artículo 205.1.a del RDL 8/2015")
   - Si el artículo NO está en los documentos arriba, NO lo menciones
   - Prefiere documentos con mayor relevancia

3. **FUENTES OFICIALES PRIORITARIAS**:
   - BOE (Boletín Oficial del Estado)
   - Textos consolidados oficiales
   - Publicaciones de Aranzadi o Universidad de Deusto cuando disponibles
   - Portal de Seguridad Social para aclaraciones prácticas

4. **VERIFICACIÓN**:
   - Cada pregunta DEBE basarse en al menos UN documento de arriba
   - Cada motivación DEBE incluir al menos UNA cita textual entrecomillada
   - Si no encuentras información suficiente, NO generes esa pregunta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`

  return contextoLegal + '\n\n' + promptBase
}

/**
 * Genera contexto RAG específico para LGSS
 */
export async function generarContextoLGSS(): Promise<RAGContext[]> {
  console.log(`[RAG] Generando contexto para LGSS...`)

  // Buscar documentos específicos de LGSS
  const legalDocuments = await prisma.legalDocument.findMany({
    where: {
      active: true,
      OR: [
        { title: { contains: 'LGSS', mode: 'insensitive' as const } },
        { title: { contains: 'RDL 8/2015', mode: 'insensitive' as const } },
        { title: { contains: 'Ley General de la Seguridad Social', mode: 'insensitive' as const } },
        { title: { contains: 'Real Decreto Legislativo 8/2015', mode: 'insensitive' as const } },
        { reference: { contains: '8/2015', mode: 'insensitive' as const } }
      ]
    },
    select: {
      id: true,
      title: true,
      content: true,
      reference: true,
      embedding: true,
      sections: {
        select: {
          title: true,
          content: true
        },
        take: 20
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  console.log(`[RAG] Encontrados ${legalDocuments.length} documentos de LGSS`)

  if (legalDocuments.length === 0) {
    console.warn(`[RAG] ⚠️ No se encontraron documentos de LGSS en la biblioteca legal`)
    return []
  }

  // Convertir a formato RAGContext
  const contexts: RAGContext[] = legalDocuments.map(doc => ({
    documentId: doc.id,
    documentTitle: doc.title,
    documentType: 'ley' as const,
    content: doc.content || '',
    relevanceScore: 100, // Máxima relevancia por ser búsqueda específica
    excerpt: doc.content?.substring(0, 500) || ''
  }))

  return contexts
}
