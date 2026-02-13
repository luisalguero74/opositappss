/**
 * Sistema de embeddings vectoriales para búsqueda semántica mejorada
 * Usa OpenAI text-embedding-3-small (1536 dimensiones, ~$0.02/1M tokens)
 */

export interface EmbeddingVector {
  vector: number[]
  text: string
}

/**
 * Genera embedding vectorial para un texto usando OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY no configurada, saltando generación de embeddings')
    return []
  }

  try {
    // Truncar texto si es muy largo (max 8191 tokens ≈ 32k caracteres)
    const truncatedText = text.substring(0, 32000)
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const embedding = data.data[0].embedding as number[]
    
    console.log(`✅ Embedding generado: ${embedding.length} dimensiones`)
    return embedding
    
  } catch (error: any) {
    console.error('❌ Error generando embedding:', error.message)
    return []
  }
}

/**
 * Genera embeddings para múltiples textos en batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY no configurada')
    return texts.map(() => [])
  }

  try {
    // Truncar textos
    const truncatedTexts = texts.map(t => t.substring(0, 32000))
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedTexts,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const embeddings = data.data.map((item: any) => item.embedding as number[])
    
    console.log(`✅ ${embeddings.length} embeddings generados`)
    return embeddings
    
  } catch (error: any) {
    console.error('❌ Error generando embeddings batch:', error.message)
    return texts.map(() => [])
  }
}

/**
 * Calcula similitud coseno entre dos vectores
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  if (a.length !== b.length) {
    console.warn('⚠️ Vectores de diferentes dimensiones')
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Busca documentos más similares usando embeddings vectoriales
 */
export function findMostSimilar(
  queryEmbedding: number[],
  documents: Array<{ id: string; embedding: number[]; text: string; title: string }>,
  topK: number = 5
): Array<{ id: string; text: string; title: string; similarity: number }> {
  if (queryEmbedding.length === 0) return []

  const similarities = documents
    .filter(doc => doc.embedding.length > 0)
    .map(doc => ({
      id: doc.id,
      text: doc.text,
      title: doc.title,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  return similarities
}

/**
 * Serializa vector para almacenar en DB como JSON string
 */
export function serializeEmbedding(vector: number[]): string {
  return JSON.stringify(vector)
}

/**
 * Deserializa vector desde DB
 */
export function deserializeEmbedding(serialized: string | null): number[] {
  if (!serialized) return []
  try {
    return JSON.parse(serialized)
  } catch (error) {
    console.error('Error deserializando embedding:', error)
    return []
  }
}
