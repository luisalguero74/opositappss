import { readFile } from 'fs/promises'
import { join } from 'path'
import mammoth from 'mammoth'

export interface ProcessedDocument {
  content: string
  sections: DocumentSection[]
  metadata: {
    fileName: string
    type: string
    pageCount?: number
  }
}

export interface DocumentSection {
  title: string
  content: string
  order: number
}

/**
 * Procesa un documento y extrae su contenido completo
 */
export async function processDocument(
  filePath: string | Buffer,
  fileName: string
): Promise<ProcessedDocument> {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const buffer =
    typeof filePath === 'string'
      ? await readFile(filePath.startsWith('/') ? filePath : join(process.cwd(), filePath))
      : filePath

  let content = ''
  let pageCount: number | undefined

  switch (extension) {
    case 'txt':
      content = buffer.toString('utf-8')
      pageCount = Math.ceil(content.split('\n').length / 50)
      break

    case 'pdf':
      try {
        // Importación dinámica para pdf-parse
        const pdfParseModule = await import('pdf-parse') as any;
        const pdfParse = pdfParseModule.default || pdfParseModule;
        if (!pdfParse) throw new Error('No se pudo importar pdfParse correctamente');
        
        // pdf-parse es una función que acepta un buffer directamente
        const pdfData = await pdfParse(buffer);
        content = pdfData.text;
        pageCount = pdfData.numpages;
      } catch (error) {
        console.error('Error al procesar PDF:', error)
        throw new Error('No se pudo procesar el PDF')
      }
      break

    case 'doc':
    case 'docx':
      try {
        const result = await mammoth.extractRawText({ buffer })
        content = result.value
        pageCount = Math.ceil(content.split('\n').length / 50)
      } catch (error) {
        console.error('Error al procesar DOC/DOCX:', error)
        throw new Error('No se pudo procesar el documento Word')
      }
      break

    case 'epub':
      // Para EPUB usaríamos epub-parser si está instalado
      throw new Error('Formato EPUB no soportado todavía')

    default:
      throw new Error(`Formato de archivo no soportado: ${extension}`)
  }

  // Dividir en secciones
  const sections = extractSections(content, fileName)

  return {
    content,
    sections,
    metadata: {
      fileName,
      type: extension || 'unknown',
      pageCount
    }
  }
}

/**
 * Extrae secciones de un documento (artículos, capítulos, temas)
 */
function extractSections(content: string, fileName: string): DocumentSection[] {
  const sections: DocumentSection[] = []
  
  // Patrones comunes en legislación española
  const patterns = [
    /(?:Artículo|Artº|Art\.) (\d+[^\n]*)/gi,
    /(?:Capítulo|Cap\.) ([IVXLCDM]+[^\n]*)/gi,
    /(?:Título|Tít\.) ([IVXLCDM]+[^\n]*)/gi,
    /(?:Sección|Secc\.) (\d+[^\n]*)/gi,
    /Tema (\d+)[^\n]*/gi
  ]

  let currentSection: DocumentSection | null = null
  let sectionNumber = 0

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Buscar inicio de sección
    let foundSection = false
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        // Guardar sección anterior si existe
        if (currentSection) {
          sections.push(currentSection)
        }

        // Crear nueva sección
        currentSection = {
          title: match[0],
          content: '',
          order: sectionNumber++
        }
        foundSection = true
        break
      }
    }

    // Agregar contenido a la sección actual
    if (!foundSection && currentSection) {
      currentSection.content += line + '\n'
    } else if (!foundSection && !currentSection) {
      // Contenido antes de la primera sección
      if (sections.length === 0) {
        currentSection = {
          title: 'Preámbulo',
          content: line + '\n',
          order: sectionNumber++
        }
      }
    }
  }

  // Guardar última sección
  if (currentSection) {
    sections.push(currentSection)
  }

  // Si no se encontraron secciones, crear una única con todo el contenido
  if (sections.length === 0) {
    sections.push({
      title: fileName,
      content: content,
      order: 0
    })
  }

  return sections
}

/**
 * Limpia el texto para análisis de IA
 */
export function cleanTextForAI(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/\n{3,}/g, '\n\n') // Máximo 2 saltos de línea
    .replace(/[^\S\n]+/g, ' ') // Normalizar espacios en blanco
    .trim()
}

/**
 * Divide texto en chunks para procesamiento con IA
 */
export function chunkText(text: string, maxChunkSize = 4000): string[] {
  const chunks: string[] = []
  const paragraphs = text.split('\n\n')
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // Si un párrafo es muy largo, dividirlo
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split('. ')
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChunkSize) {
            chunks.push(currentChunk.trim())
            currentChunk = sentence + '. '
          } else {
            currentChunk += sentence + '. '
          }
        }
      } else {
        currentChunk = paragraph + '\n\n'
      }
    } else {
      currentChunk += paragraph + '\n\n'
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}
