// ==========================================
// SISTEMA ROBUSTO DE PARSEO DE PREGUNTAS
// ==========================================
// API Route: /api/admin/questions/parse
// Soporta: JSON, TXT, PDF, DOC, DOCX, EPUB

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ==========================================
// INTERFACES
// ==========================================

interface ParsedQuestion {
  text: string
  options: string[] | { a: string; b: string; c: string; d: string }
  correctAnswer: string
  explanation?: string
  temaCodigo?: string
  temaNumero?: number
  temaParte?: string
  temaTitulo?: string
  difficulty?: 'facil' | 'media' | 'dificil'
  errors?: string[]
  warnings?: string[]
  score?: number // 0-100
}

interface ParseResult {
  total: number
  valid: number
  withErrors: number
  withWarnings: number
  questions: ParsedQuestion[]
  fileInfo: {
    name: string
    size: number
    type: string
    encoding?: string
  }
}

// ==========================================
// UTILIDADES DE NORMALIZACIÓN
// ==========================================

class QuestionNormalizer {
  // Limpiar texto de caracteres problemáticos
  static cleanText(text: string): string {
    if (!text) return ''
    
    return text
      // Eliminar BOM
      .replace(/^\uFEFF/, '')
      // Eliminar caracteres nulos (Postgres no los acepta)
      .replace(/\u0000/g, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      // Normalizar comillas
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Normalizar guiones
      .replace(/[–—]/g, '-')
      // Eliminar espacios al inicio/final
      .trim()
  }

  // Normalizar respuesta correcta a letra mayúscula A-D
  static normalizeCorrectAnswer(answer: any): string | null {
    if (!answer) return null
    
    const str = String(answer).trim().toLowerCase()
    
    // Si es número (0-3)
    if (/^[0-3]$/.test(str)) {
      const index = parseInt(str)
      return String.fromCharCode(65 + index) // 0→A, 1→B, etc.
    }
    
    // Si es letra (a-d)
    if (/^[a-d]$/i.test(str)) {
      return str.toUpperCase()
    }
    
    // Buscar letra en texto: "opción a", "la a)", "respuesta (b)", etc.
    const match = str.match(/[a-d]/)
    if (match) {
      return match[0].toUpperCase()
    }
    
    return null
  }

  // Normalizar array de opciones
  static normalizeOptions(options: any): string[] | null {
    if (!options) return null
    
    // Si ya es array
    if (Array.isArray(options)) {
      const cleaned = options.map(opt => this.cleanText(String(opt)))
      return cleaned.length === 4 ? cleaned : null
    }
    
    // Si es objeto {a: "...", b: "...", c: "...", d: "..."}
    if (typeof options === 'object' && options.a && options.b && options.c && options.d) {
      return [
        this.cleanText(options.a),
        this.cleanText(options.b),
        this.cleanText(options.c),
        this.cleanText(options.d)
      ]
    }
    
    // Si es string JSON
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
        return this.normalizeOptions(parsed)
      } catch {
        // Intentar parsear como texto multi-línea
        return this.parseOptionsFromText(options)
      }
    }
    
    return null
  }

  // Parsear opciones desde texto estructurado
  static parseOptionsFromText(text: string): string[] | null {
    const cleaned = this.cleanText(text)
    
    // Patrón: a) texto\nb) texto\nc) texto\nd) texto
    const patterns = [
      /^[a-d][).\]]\s*(.+)$/gim,
      /^\([a-d]\)\s*(.+)$/gim,
      /^\[[a-d]\]\s*(.+)$/gim
    ]
    
    for (const pattern of patterns) {
      const matches = [...cleaned.matchAll(pattern)]
      if (matches.length === 4) {
        return matches.map(m => m[1].trim())
      }
    }
    
    // Dividir por saltos de línea si hay exactamente 4
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length === 4) {
      return lines
    }
    
    return null
  }

  // Normalizar código de tema
  static normalizeTemaCodigo(codigo: any): string | null {
    if (!codigo) return null
    
    const str = String(codigo).trim()
    
    // Ya está en formato correcto: "01.01"
    if (/^\d{2}\.\d{2}$/.test(str)) {
      return str
    }
    
    // Formato: "1.1" → "01.01"
    const match = str.match(/^(\d{1,2})[.\-](\d{1,2})$/)
    if (match) {
      const [, num1, num2] = match
      return `${num1.padStart(2, '0')}.${num2.padStart(2, '0')}`
    }
    
    // Formato: "Tema 1" → "01.00"
    const temaMatch = str.match(/tema\s*(\d{1,2})/i)
    if (temaMatch) {
      return `${temaMatch[1].padStart(2, '0')}.00`
    }
    
    return null
  }

  // Normalizar parte del temario
  static normalizeTemaParte(parte: any): string | null {
    if (!parte) return null
    
    const str = String(parte).trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    
    if (str.includes('gen')) return 'GENERAL'
    if (str.includes('esp')) return 'ESPECÍFICO'
    
    return null
  }

  // Normalizar dificultad
  static normalizeDifficulty(difficulty: any): 'facil' | 'media' | 'dificil' | null {
    if (!difficulty) return null
    
    const str = String(difficulty).trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    
    if (str.includes('fac') || str.includes('easy')) return 'facil'
    if (str.includes('med') || str.includes('normal')) return 'media'
    if (str.includes('dif') || str.includes('hard')) return 'dificil'
    
    return null
  }
}

// ==========================================
// VALIDADOR DE PREGUNTAS
// ==========================================

class QuestionValidator {
  static validate(question: ParsedQuestion): { errors: string[], warnings: string[], score: number } {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 100

    // VALIDACIÓN 1: Texto de pregunta
    if (!question.text || question.text.length < 20) {
      errors.push('El texto de la pregunta es demasiado corto (mínimo 20 caracteres)')
      score -= 30
    }

    if (question.text && question.text.length > 500) {
      warnings.push('El texto de la pregunta es muy largo (>500 caracteres)')
      score -= 5
    }

    // VALIDACIÓN 2: Opciones
    const options = Array.isArray(question.options) 
      ? question.options 
      : Object.values(question.options)

    if (options.length !== 4) {
      errors.push(`Debe haber exactamente 4 opciones (encontradas: ${options.length})`)
      score -= 40
    } else {
      // Verificar duplicados
      const unique = new Set(options)
      if (unique.size !== 4) {
        errors.push('Hay opciones duplicadas')
        score -= 20
      }

      // Verificar longitud mínima
      options.forEach((opt, idx) => {
        if (!opt || opt.length < 3) {
          errors.push(`Opción ${String.fromCharCode(65 + idx)} es demasiado corta`)
          score -= 10
        }
      })

      // Advertir si opciones muy desbalanceadas
      const lengths = options.map(o => o.length)
      const maxLen = Math.max(...lengths)
      const minLen = Math.min(...lengths)
      if (maxLen > minLen * 3) {
        warnings.push('Las opciones tienen longitudes muy desbalanceadas')
        score -= 5
      }
    }

    // VALIDACIÓN 3: Respuesta correcta
    if (!question.correctAnswer) {
      errors.push('Falta la respuesta correcta')
      score -= 40
    } else if (!/^[A-D]$/.test(question.correctAnswer)) {
      errors.push(`Respuesta correcta inválida: "${question.correctAnswer}" (debe ser A, B, C o D)`)
      score -= 30
    } else {
      // Verificar que la respuesta existe en opciones
      const index = question.correctAnswer.charCodeAt(0) - 65
      if (options[index] === undefined) {
        errors.push(`La respuesta correcta ${question.correctAnswer} no tiene opción correspondiente`)
        score -= 20
      }
    }

    // VALIDACIÓN 4: Explicación/Motivación
    if (!question.explanation || question.explanation.length < 20) {
      warnings.push('Falta explicación o es muy corta')
      score -= 15
    } else {
      // Verificar referencias legales
      const hasLegalRef = /art[íi]culo|ley|real decreto|rdl|lgss|constitución|convenio/i.test(question.explanation)
      if (!hasLegalRef) {
        warnings.push('La explicación no incluye referencias legales explícitas')
        score -= 10
      }

      // Verificar que explica por qué las incorrectas lo son
      const explainsIncorrect = /incorrecta|falsa|err[oó]nea/i.test(question.explanation)
      if (!explainsIncorrect) {
        warnings.push('La explicación no justifica por qué las opciones incorrectas lo son')
        score -= 5
      }
    }

    // VALIDACIÓN 5: Metadatos (no críticos)
    if (!question.temaCodigo) {
      warnings.push('Falta código de tema (recomendado para clasificación)')
    }

    if (!question.difficulty) {
      warnings.push('Falta nivel de dificultad (recomendado para balanceo)')
    }

    return {
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score))
    }
  }
}

// ==========================================
// PARSERS POR FORMATO
// ==========================================

class JSONParser {
  static async parse(content: string, autoCorrect: boolean): Promise<ParsedQuestion[]> {
    const questions: ParsedQuestion[] = []
    
    try {
      const data = JSON.parse(QuestionNormalizer.cleanText(content))
      
      // Detectar estructura
      let questionArray: any[] = []
      
      if (Array.isArray(data)) {
        questionArray = data
      } else if (data.questions && Array.isArray(data.questions)) {
        questionArray = data.questions
      } else if (data.data && Array.isArray(data.data)) {
        questionArray = data.data
      }
      
      for (const q of questionArray) {
        const parsed = this.parseQuestion(q, autoCorrect)
        if (parsed) questions.push(parsed)
      }
      
    } catch (error) {
      throw new Error(`JSON inválido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
    
    return questions
  }

  private static parseQuestion(q: any, autoCorrect: boolean): ParsedQuestion | null {
    if (!q) return null
    
    // Soportar múltiples nombres de campos
    const text = QuestionNormalizer.cleanText(
      q.text || q.question || q.pregunta || q.enunciado || ''
    )
    
    let options = QuestionNormalizer.normalizeOptions(
      q.options || q.opciones || q.choices || q.respuestas
    )
    
    let correctAnswer = QuestionNormalizer.normalizeCorrectAnswer(
      q.correctAnswer || q.respuestaCorrecta || q.correct || q.answer || q.correcta
    )
    
    const explanation = QuestionNormalizer.cleanText(
      q.explanation || q.explicacion || q.motivacion || q.justificacion || ''
    )
    
    const temaCodigo = QuestionNormalizer.normalizeTemaCodigo(
      q.temaCodigo || q.tema || q.topic || q.codigo
    )
    
    const temaNumero = q.temaNumero || q.themeNumber || null
    
    const temaParte = QuestionNormalizer.normalizeTemaParte(
      q.temaParte || q.parte || q.section
    )
    
    const temaTitulo = QuestionNormalizer.cleanText(
      q.temaTitulo || q.titulo || q.title || ''
    )
    
    const difficulty = QuestionNormalizer.normalizeDifficulty(
      q.difficulty || q.dificultad || q.level
    )
    
    // Auto-correcciones si está activado
    if (autoCorrect) {
      // Si options null, intentar extraer de texto
      if (!options && text) {
        const extracted = this.extractOptionsFromText(text)
        if (extracted) {
          options = extracted.options
          // Si encontramos opciones en el texto, limpiar el texto
          const cleanedText = text.replace(/[a-d][).\]]\s*.+$/gim, '').trim()
          if (cleanedText) {
            return this.parseQuestion({
              ...q,
              text: cleanedText,
              options: options
            }, false) // Ya auto-corregido, no recursivo
          }
        }
      }
    }
    
    const question: ParsedQuestion = {
      text,
      options: options || [],
      correctAnswer: correctAnswer || '',
      explanation: explanation || undefined,
      temaCodigo: temaCodigo || undefined,
      temaNumero: temaNumero || undefined,
      temaParte: temaParte || undefined,
      temaTitulo: temaTitulo || undefined,
      difficulty: difficulty || undefined
    }
    
    // Validar
    const validation = QuestionValidator.validate(question)
    question.errors = validation.errors
    question.warnings = validation.warnings
    question.score = validation.score
    
    return question
  }

  private static extractOptionsFromText(text: string): { options: string[] } | null {
    const options = QuestionNormalizer.parseOptionsFromText(text)
    return options ? { options } : null
  }
}

class TXTParser {
  static async parse(content: string, autoCorrect: boolean): Promise<ParsedQuestion[]> {
    const questions: ParsedQuestion[] = []
    
    const cleaned = QuestionNormalizer.cleanText(content)
    
    // Dividir por separadores comunes
    const blocks = this.splitIntoBlocks(cleaned)
    
    for (const block of blocks) {
      const parsed = this.parseBlock(block, autoCorrect)
      if (parsed) questions.push(parsed)
    }
    
    return questions
  }

  private static splitIntoBlocks(content: string): string[] {
    // Patrones de separación
    const separators = [
      /\n---+\n/g,
      /\n===+\n/g,
      /\n\*\*\*+\n/g,
      /===PREGUNTA===/gi,
      /\nPREGUNTA\s+\d+:/gi
    ]
    
    let blocks = [content]
    
    for (const sep of separators) {
      const newBlocks: string[] = []
      for (const block of blocks) {
        newBlocks.push(...block.split(sep))
      }
      blocks = newBlocks
    }
    
    return blocks
      .map(b => b.trim())
      .filter(b => b.length > 50) // Mínimo razonable para una pregunta
  }

  private static parseBlock(block: string, autoCorrect: boolean): ParsedQuestion | null {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l)
    
    let text = ''
    let options: string[] = []
    let correctAnswer = ''
    let explanation = ''
    let temaCodigo = ''
    let temaParte = ''
    let temaTitulo = ''
    let difficulty = ''
    
    let currentSection: 'text' | 'options' | 'explanation' | 'meta' = 'text'
    let optionLines: string[] = []
    let explanationLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineLower = line.toLowerCase()
      
      // Detectar secciones
      if (/^(pregunta|question|p[-.\s]?\d+)[:\s]/i.test(line)) {
        currentSection = 'text'
        text = line.replace(/^(pregunta|question|p[-.\s]?\d+)[:\s]*/i, '').trim()
        continue
      }
      
      if (/^(opciones|options|respuestas|choices)[:\s]/i.test(lineLower)) {
        currentSection = 'options'
        continue
      }
      
      if (/^(explicaci[oó]n|explanation|motivaci[oó]n|justificaci[oó]n)[:\s]/i.test(lineLower)) {
        currentSection = 'explanation'
        continue
      }
      
      if (/^(respuesta\s+correcta|correcta|correct|answer)[:\s]/i.test(lineLower)) {
        const match = line.match(/[a-d0-3]/i)
        if (match) {
          correctAnswer = QuestionNormalizer.normalizeCorrectAnswer(match[0]) || ''
        }
        continue
      }
      
      if (/^tema[:\s]/i.test(lineLower)) {
        temaCodigo = QuestionNormalizer.normalizeTemaCodigo(line.replace(/^tema[:\s]*/i, '')) || ''
        continue
      }
      
      if (/^(parte|section)[:\s]/i.test(lineLower)) {
        temaParte = QuestionNormalizer.normalizeTemaParte(line.replace(/^(parte|section)[:\s]*/i, '')) || ''
        continue
      }
      
      if (/^(t[ií]tulo|title)[:\s]/i.test(lineLower)) {
        temaTitulo = QuestionNormalizer.cleanText(line.replace(/^(t[ií]tulo|title)[:\s]*/i, ''))
        continue
      }
      
      if (/^dificultad[:\s]/i.test(lineLower)) {
        difficulty = QuestionNormalizer.normalizeDifficulty(line.replace(/^dificultad[:\s]*/i, '')) || ''
        continue
      }
      
      // Acumular contenido según sección
      if (currentSection === 'text' && !text) {
        text += (text ? ' ' : '') + line
      } else if (currentSection === 'options') {
        if (/^[a-d][).\]]/i.test(line)) {
          optionLines.push(line.replace(/^[a-d][).\]]\s*/i, ''))
        }
      } else if (currentSection === 'explanation') {
        explanationLines.push(line)
      }
    }
    
    options = optionLines
    explanation = explanationLines.join(' ')
    
    // Si no encontramos opciones estructuradas, intentar parsear del bloque
    if (options.length === 0) {
      const extracted = QuestionNormalizer.parseOptionsFromText(block)
      if (extracted) options = extracted
    }
    
    const question: ParsedQuestion = {
      text: QuestionNormalizer.cleanText(text),
      options,
      correctAnswer,
      explanation: explanation || undefined,
      temaCodigo: temaCodigo || undefined,
      temaParte: temaParte || undefined,
      temaTitulo: temaTitulo || undefined,
      difficulty: (difficulty as any) || undefined
    }
    
    const validation = QuestionValidator.validate(question)
    question.errors = validation.errors
    question.warnings = validation.warnings
    question.score = validation.score
    
    return question
  }
}

// Parsers adicionales (implementación simplificada)
class PDFParser {
  static async parse(buffer: Buffer, autoCorrect: boolean): Promise<ParsedQuestion[]> {
    // Requiere librería: npm install pdf-parse
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return TXTParser.parse(data.text, autoCorrect)
  }
}

class DOCParser {
  static async parse(buffer: Buffer, autoCorrect: boolean): Promise<ParsedQuestion[]> {
    // Requiere librería: npm install mammoth
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return TXTParser.parse(result.value, autoCorrect)
  }
}

class EPUBParser {
  static async parse(buffer: Buffer, autoCorrect: boolean): Promise<ParsedQuestion[]> {
    // Requiere librería: npm install epub2
    // Implementación simplificada - extraer texto y parsear
    return TXTParser.parse(buffer.toString('utf-8'), autoCorrect)
  }
}

// ==========================================
// ENDPOINT PRINCIPAL
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const autoCorrect = formData.get('autoCorrect') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 10MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    let questions: ParsedQuestion[] = []

    try {
      if (ext === 'json') {
        const text = await file.text()
        questions = await JSONParser.parse(text, autoCorrect)
      } else if (ext === 'txt') {
        const text = await file.text()
        questions = await TXTParser.parse(text, autoCorrect)
      } else if (ext === 'pdf') {
        const buffer = Buffer.from(await file.arrayBuffer())
        questions = await PDFParser.parse(buffer, autoCorrect)
      } else if (ext === 'doc' || ext === 'docx') {
        const buffer = Buffer.from(await file.arrayBuffer())
        questions = await DOCParser.parse(buffer, autoCorrect)
      } else if (ext === 'epub') {
        const buffer = Buffer.from(await file.arrayBuffer())
        questions = await EPUBParser.parse(buffer, autoCorrect)
      } else {
        return NextResponse.json({ 
          error: `Formato no soportado: ${ext}` 
        }, { status: 400 })
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: `Error al parsear archivo: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`
      }, { status: 400 })
    }

    // Calcular estadísticas
    const valid = questions.filter(q => !q.errors || q.errors.length === 0).length
    const withErrors = questions.filter(q => q.errors && q.errors.length > 0).length
    const withWarnings = questions.filter(q => q.warnings && q.warnings.length > 0).length

    const result: ParseResult = {
      total: questions.length,
      valid,
      withErrors,
      withWarnings,
      questions,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('[Parse Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al procesar archivo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
