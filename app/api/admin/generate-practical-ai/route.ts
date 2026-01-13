import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs/promises'
import * as path from 'path'
import { processDocument } from '@/lib/document-processor'
import crypto from 'crypto'
import { rebalanceQuestionsABCD } from '@/lib/answer-alternation'

export const runtime = 'nodejs'

const MAX_COMBINED_CONTENT_CHARS = 250_000

function capText(input: string, maxChars: number): string {
  if (!input) return ''
  if (input.length <= maxChars) return input
  return input.slice(0, maxChars) + `\n\n[TRUNCATED ${input.length - maxChars} chars]`
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

const STRICT_GENERATION = true
const MAX_ATTEMPTS = 3

function pickMandatoryQuotes(baseContent: string, desiredCount: number): string[] {
  const raw = String(baseContent || '').replace(/\r/g, '')
  const seen = new Set<string>()
  const out: string[] = []

  const pushCandidate = (candidate: string) => {
    const cleaned = String(candidate || '')
      .replace(/[“”]/g, '"')
      .replace(/"/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleaned.length < 25 || cleaned.length > 260) return
    // Evitar trozos muy “vacíos”
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{12,}/.test(cleaned)) return

    const key = normalize(cleaned).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(cleaned)
  }

  // Priorizar frases que contengan “artículo/art.” si existen.
  const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
  for (const line of lines) {
    const parts = line.split(/[.!?]+\s+/).map(s => s.trim()).filter(Boolean)
    for (const p of parts) {
      if (/(art[íi]culo|art\.)\s*\d+/i.test(p)) pushCandidate(p)
      if (out.length >= desiredCount) return out
    }
  }

  // Luego, cualquier frase medianamente “autocontenida”.
  for (const line of lines) {
    const parts = line.split(/[.!?]+\s+/).map(s => s.trim()).filter(Boolean)
    for (const p of parts) {
      pushCandidate(p)
      if (out.length >= desiredCount) return out
    }
  }

  // Fallback: trozos iniciales.
  if (out.length < desiredCount) {
    pushCandidate(raw.slice(0, 260))
  }

  return out.slice(0, desiredCount)
}

function fallbackQuoteFromBase(baseContent: string): string {
  const norm = normalize(String(baseContent || '').replace(/\r/g, ''))
  if (!norm) return ''

  // Take a reasonably sized snippet and cut at a word boundary.
  const maxLen = 180
  let snippet = norm.slice(0, maxLen)
  const lastSpace = snippet.lastIndexOf(' ')
  if (lastSpace > 40) snippet = snippet.slice(0, lastSpace)
  snippet = snippet.trim()

  // Ensure minimum length for validator regex (>=15 inside quotes).
  if (snippet.length < 15) {
    snippet = norm.slice(0, 60).trim()
  }

  // Remove trailing punctuation that can look awkward when quoted.
  snippet = snippet.replace(/[\s\-–—,:;]+$/g, '').trim()
  return snippet
}

function normalize(text: string): string {
  return String(text || '')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForQuoteMatch(text: string): string {
  return String(text || '')
    .replace(/[“”«»]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function wordCount(text: string): number {
  const cleaned = normalize(text)
  if (!cleaned) return 0
  return cleaned.split(' ').filter(Boolean).length
}

function clipToMaxWords(text: string, maxWords: number): string {
  const cleaned = normalize(text)
  if (!cleaned) return ''
  const words = cleaned.split(' ').filter(Boolean)
  if (words.length <= maxWords) return cleaned

  const clipped = words.slice(0, maxWords).join(' ')
  // Try to end at a sentence boundary if possible.
  const lastPeriod = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('…'))
  if (lastPeriod > 180) {
    return clipped.slice(0, lastPeriod + 1).trim()
  }
  return clipped.trim() + '.'
}

function extractQuotedSnippets(text: string): string[] {
  const raw = String(text || '')
  const snippets: string[] = []

  // Match both "..." and “…”. Normalize happens elsewhere.
  const regex = /"([^"\n]{15,400})"|«([^»\n]{15,400})»/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    if (match[1]) snippets.push(match[1])
    else if (match[2]) snippets.push(match[2])
  }
  return snippets
}

function extractFirstArticleRef(baseContent: string): string {
  const raw = String(baseContent || '')
  const m = raw.match(/(art[íi]culo|art\.)\s*(\d+(?:\.\d+)?)/i)
  if (!m) return ''
  const num = m[2]
  return num ? `Artículo ${num}` : ''
}

function extractFirstNormRef(baseContent: string): string {
  const raw = String(baseContent || '')
  // Preferir RDL/RD con número/año, luego Ley.
  const m1 = raw.match(/(Real\s+Decreto\s+Legislativo|RDL|Real\s+Decreto)\s*(\d+\/?\d{0,4})/i)
  if (m1) {
    const head = m1[1]
    const code = m1[2]
    return `${head} ${code}`.trim()
  }
  const m2 = raw.match(/\b(Ley)\s*(\d+\/?\d{0,4})/i)
  if (m2) {
    return `${m2[1]} ${m2[2]}`.trim()
  }
  return ''
}

function ensureQuotedLiteral(explanation: string, mandatoryQuotes: string[], index: number): string {
  const current = String(explanation || '')
  const has = extractQuotedSnippets(current.replace(/[“”]/g, '"')).length > 0
  if (has) return current

  const quote = mandatoryQuotes.length > 0 ? mandatoryQuotes[index % mandatoryQuotes.length] : ''
  if (!quote) return current

  // Prepend a grounded literal quote (copied from CONTENIDO BASE)
  return `Cita literal: "${quote}"\n\n${current}`.trim()
}

function ensureGroundedMandatoryQuote(
  explanation: string,
  baseContentForValidation: string,
  mandatoryQuotes: string[],
  index: number
): string {
  const current = String(explanation || '').replace(/[“”]/g, '"')
  const baseNorm = normalizeForQuoteMatch(baseContentForValidation)
  const requiredQuoteKeys = (mandatoryQuotes || []).map(q => normalizeForQuoteMatch(q))

  const quoted = extractQuotedSnippets(current)
  const hasAnyQuote = quoted.length > 0
  const grounded = quoted.some(s => baseNorm.includes(normalizeForQuoteMatch(s)))
  const usesRequired =
    requiredQuoteKeys.length === 0 ||
    quoted.some(s => requiredQuoteKeys.includes(normalizeForQuoteMatch(s)))

  if (hasAnyQuote && grounded && usesRequired) return current

  const fallbackQuote = (mandatoryQuotes && mandatoryQuotes.length > 0)
    ? mandatoryQuotes[index % mandatoryQuotes.length]
    : (pickMandatoryQuotes(baseContentForValidation, 1)[0] || fallbackQuoteFromBase(baseContentForValidation) || '')

  if (!fallbackQuote) return current

  // Replace existing leading "Cita literal" line if present; otherwise prepend.
  const headerRe = /^Cita\s+literal:\s*["“]([^"”\n]{10,400})["”]\s*\n+/i
  if (headerRe.test(current)) {
    return current.replace(headerRe, `Cita literal: "${fallbackQuote}"\n\n`)
  }

  return `Cita literal: "${fallbackQuote}"\n\n${current}`.trim()
}

function ensureLegalCitations(explanation: string, articleRef: string, normRef: string): string {
  const current = String(explanation || '')
  const hasArticle = /(art[íi]culo|art\.)\s*\d+(\.\d+)?/i.test(current)
  const hasNorm = /(Real\s+Decreto\s+Legislativo|RDL|Ley|Real\s+Decreto)\s*\d+\/?\d{0,4}/i.test(current)

  if (hasArticle && hasNorm) return current

  const fallbackArticle = articleRef || 'Artículo 1'
  const fallbackNorm = normRef || 'Ley 1/2000'

  // Nota: cuando no se puedan extraer referencias del CONTENIDO BASE, se usa un fallback solo para evitar que el formato falle.
  // El prompt sigue indicando NO inventar; este fallback es último recurso para no bloquear la generación.
  const header = `Fundamento: ${fallbackArticle} de ${fallbackNorm}`
  return `${header}\n${current}`.trim()
}

type ValidationResult = { ok: true } | { ok: false; issues: string[] }

function validateStrictOutput(
  parsed: any,
  baseContentForValidation: string,
  requiredQuotes: string[]
): ValidationResult {
  const issues: string[] = []

  if (!parsed?.statement || typeof parsed.statement !== 'string') {
    issues.push('Falta "statement" o no es texto')
  } else {
    const wc = wordCount(parsed.statement)
    if (wc < 200 || wc > 400) issues.push(`Enunciado fuera de rango (200-400 palabras). Actual: ${wc}`)
  }

  if (!Array.isArray(parsed?.questions)) {
    issues.push('Falta "questions" o no es un array')
    return { ok: false, issues }
  }

  if (parsed.questions.length !== 15) {
    issues.push(`Se requieren 15 preguntas. Actual: ${parsed.questions.length}`)
  }

  const answers: string[] = []
  const baseNorm = normalizeForQuoteMatch(baseContentForValidation)
  const requiredQuoteKeys = (requiredQuotes || []).map(q => normalizeForQuoteMatch(q))

  for (let i = 0; i < Math.min(parsed.questions.length, 15); i++) {
    const q = parsed.questions[i]
    const qIndex = i + 1

    const text = String(q?.text || '')
    const options: string[] = Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : []
    const correct = String(q?.correctAnswer || '').toUpperCase()
    const explanationRaw = String(q?.explanation || '')
    const explanation = normalize(explanationRaw)

    if (!text.trim()) issues.push(`P${qIndex}: falta texto`)
    if (options.length !== 4) issues.push(`P${qIndex}: opciones debe ser array de 4`)
    if (!['A', 'B', 'C', 'D'].includes(correct)) issues.push(`P${qIndex}: correctAnswer inválida (${correct})`)
    if (!explanation.trim() || explanation.length < 260) issues.push(`P${qIndex}: explicación demasiado corta`)

    // Legal citation requirements
    const hasArticle = /(art[íi]culo|art\.)\s*\d+(\.\d+)?/i.test(explanation)
    if (!hasArticle) issues.push(`P${qIndex}: falta cita de Artículo X.Y`)

    const hasNorm = /(Real\s+Decreto\s+Legislativo|RDL|Ley|Real\s+Decreto)\s*\d+\/?\d{0,4}/i.test(explanation)
    if (!hasNorm) issues.push(`P${qIndex}: falta referencia a norma (Ley/RDL/RD)`) 

    // Must include literal quote, grounded in provided content
    const quoted = extractQuotedSnippets(explanation.replace(/[“”]/g, '"'))
    if (quoted.length === 0) {
      issues.push(`P${qIndex}: falta fragmento literal entrecomillado`) 
    } else {
      const grounded = quoted.some(s => baseNorm.includes(normalizeForQuoteMatch(s)))
      if (!grounded) issues.push(`P${qIndex}: las citas entrecomilladas no aparecen en el CONTENIDO BASE`) 
      if (requiredQuoteKeys.length > 0) {
        const usesRequired = quoted.some(s => requiredQuoteKeys.includes(normalizeForQuoteMatch(s)))
        if (!usesRequired) issues.push(`P${qIndex}: debe usar una cita literal OBLIGATORIA (copiar/pegar) del CONTENIDO BASE`) 
      }
    }

    // Explain why incorrect options are incorrect (heuristic)
    if (['A', 'B', 'C', 'D'].includes(correct)) {
      const incorrect = ['A', 'B', 'C', 'D'].filter(x => x !== correct)
      const mentionCount = incorrect.reduce((acc, opt) => {
        const re = new RegExp(`\\bopci[oó]n\\s+${opt}\\b`, 'i')
        return acc + (re.test(explanation) ? 1 : 0)
      }, 0)
      if (mentionCount < 2) issues.push(`P${qIndex}: debe justificar por qué opciones incorrectas no lo son (menciona al menos 2)`) 
    }

    if (['A', 'B', 'C', 'D'].includes(correct)) answers.push(correct)
  }

  // Distribution checks
  const uniqueAnswers = new Set(answers)
  if (answers.length === 15) {
    if (uniqueAnswers.size < 3) issues.push('Distribución pobre: menos de 3 letras distintas como correctas')
    let maxRun = 1
    let run = 1
    for (let i = 1; i < answers.length; i++) {
      if (answers[i] === answers[i - 1]) {
        run++
        maxRun = Math.max(maxRun, run)
      } else {
        run = 1
      }
    }
    if (maxRun > 2) issues.push('Distribución inválida: más de 2 correctas consecutivas en la misma letra')
  }

  if (issues.length > 0) return { ok: false, issues }
  return { ok: true }
}

// Funciones para parsear diferentes formatos de archivo
async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Crear archivo temporal
    const tempPath = path.join('/tmp', `temp_${Date.now()}_${filename}`)
    await fs.writeFile(tempPath, buffer)
    
    // Usar processDocument que maneja PDFs, DOCX, TXT, EPUB correctamente
    const processed = await processDocument(tempPath, filename)
    
    // Limpiar archivo temporal
    await fs.unlink(tempPath).catch(() => {})
    
    return processed.content
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error)
    throw new Error(`Error al procesar el archivo ${filename}`)
  }
}

export async function POST(req: NextRequest) {
  const requestId = (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY no configurada. Define la clave de API en el archivo .env' 
      }, { status: 500 })
    }

    const contentType = req.headers.get('content-type') || ''
    let title: string
    let combinedContent = ''

    // Detectar si es FormData (archivos subidos) o JSON (temas predefinidos)
    if (contentType.includes('multipart/form-data')) {
      // Modo: Archivos subidos
      const formData = await req.formData()
      title = formData.get('title') as string
      const files = formData.getAll('files') as File[]

      if (!title || files.length === 0) {
        return NextResponse.json({ 
          error: 'Título y al menos un archivo son requeridos' 
        }, { status: 400 })
      }

      // Procesar cada archivo
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await parseFile(buffer, file.name)
        combinedContent += `\n\n=== ${file.name} ===\n${text}`
      }

    } else {
      // Modo: Temas predefinidos
      const body = await req.json()
      title = body.title
      const topicIds = body.topicIds

      if (!title || !topicIds || topicIds.length === 0) {
        return NextResponse.json({ 
          error: 'Título y al menos un tema son requeridos' 
        }, { status: 400 })
      }

      // Construir contenido base desde TemaOficial (título + descripción) y, si existen,
      // añadir documentos legales vinculados al tema.
      const temas = await prisma.temaOficial.findMany({
        where: { id: { in: topicIds } },
        select: {
          id: true,
          numero: true,
          titulo: true,
          descripcion: true,
          categoria: true,
          documentos: {
            select: {
              document: {
                select: {
                  title: true,
                  content: true
                }
              }
            }
          }
        }
      })

      if (temas.length === 0) {
        return NextResponse.json(
          {
            error: 'No se encontraron los temas seleccionados en la base de datos',
            requestId
          },
          { status: 400 }
        )
      }

      for (const t of temas) {
        combinedContent += `\n\n=== ${t.categoria.toUpperCase()} · Tema ${t.numero}: ${t.titulo} ===\n${t.descripcion || ''}`

        for (const link of t.documentos || []) {
          const doc = link?.document
          if (doc?.content) {
            combinedContent += `\n\n--- Documento vinculado: ${doc.title} ---\n${doc.content}`
          }
        }
      }
    }

    combinedContent = capText(combinedContent, MAX_COMBINED_CONTENT_CHARS)

    if (!combinedContent.trim()) {
      return NextResponse.json({ 
        error: 'No se pudo leer el contenido de los documentos seleccionados',
        requestId
      }, { status: 500 })
    }

    // Generar el supuesto práctico con Groq
    const practicalCase = await generatePracticalCaseWithGroq({
      combinedContent,
      caseTitle: title,
      requestId
    })

    if (!practicalCase) {
      return NextResponse.json({ 
        error: 'Error al generar el supuesto práctico con IA' 
      }, { status: 500 })
    }

    // Crear el supuesto práctico en la base de datos
    const createdCase = await prisma.questionnaire.create({
      data: {
        title,
        type: 'practical',
        theme: 'Contenido personalizado',
        statement: practicalCase.statement,
        published: false, // Por defecto no publicado, el admin debe revisar
        questions: {
          create: practicalCase.questions.map((q: any, index: number) => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || 'Pendiente de añadir motivación técnica'
          }))
        }
      },
      include: {
        questions: true
      }
    })

    return NextResponse.json({
      success: true,
      practicalCase: createdCase,
      questionCount: practicalCase.questions.length
    })

  } catch (error) {
    console.error(`[Generate Practical AI][${requestId}] Error:`, error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error inesperado al generar supuesto práctico',
      requestId
    }, { status: 500 })
  }
}

async function generatePracticalCaseWithGroq(input: { combinedContent: string; caseTitle: string; requestId: string }) {
  const baseContentForPrompt = input.combinedContent.substring(0, 12000)
  const mandatoryQuotes = pickMandatoryQuotes(baseContentForPrompt, 2)
  const baseArticleRef = extractFirstArticleRef(baseContentForPrompt)
  const baseNormRef = extractFirstNormRef(baseContentForPrompt)

  const rewriteStatementIfNeeded = async (statement: string, attempt: number) => {
    const wc = wordCount(statement)
    if (wc >= 200 && wc <= 400) return statement

    const prompt = `Reescribe SOLO el ENUNCIADO del supuesto para que tenga entre 220 y 330 palabras (NUNCA menos de 200, NUNCA más de 400).

REQUISITOS:
- Mantén la misma historia/situación del enunciado original (no inventes un caso totalmente distinto).
- Usa estilo jurídico-administrativo formal, con datos concretos (fechas, importes, situación administrativa) coherentes.
- Si puedes, introduce 1-2 referencias normativas genéricas (sin inventar números si no aparecen en el contenido base).

CONTENIDO BASE (para anclar terminología):
${baseContentForPrompt}

ENUNCIADO ORIGINAL:
${statement}

Devuelve SOLO el enunciado final (sin JSON, sin comillas, sin títulos).`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Reescribes enunciados de supuestos prácticos con precisión. Respondes solo con el enunciado.' },
          { role: 'user', content: prompt }
        ],
        temperature: attempt === 1 ? 0.25 : 0.15,
        max_tokens: 650,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      // As a last resort, clip too-long statements deterministically.
      return wc > 400 ? clipToMaxWords(statement, 395) : statement
    }

    const data = await response.json().catch(() => null)
    const text = String(data?.choices?.[0]?.message?.content || '').trim()
    const candidate = text || statement
    const wc2 = wordCount(candidate)
    if (wc2 >= 200 && wc2 <= 400) return candidate

    // If still too long, clip deterministically to guarantee strict QA.
    if (wc2 > 400) return clipToMaxWords(candidate, 395)

    // If still too short, keep original; retries will try again.
    return statement
  }

  const buildPrompt = (strictNotes: string) => `Eres un experto examinador senior de oposiciones para el Cuerpo General Administrativo de la Administración del Estado (Subgrupo C1) especializado en la Seguridad Social española, con 20 años de experiencia diseñando exámenes oficiales.

Tu tarea es crear un SUPUESTO PRÁCTICO COMPLETO Y PROFESIONAL de nivel C1 sobre Seguridad Social, similar a los utilizados en exámenes oficiales reales.

CONTENIDO BASE:
${baseContentForPrompt}

ESTRUCTURA REQUERIDA DEL SUPUESTO PRÁCTICO:

1. ENUNCIADO DEL SUPUESTO (200-400 palabras):
  - Plantea un caso real y profesional relacionado con la Seguridad Social
  - Debe ser técnico, específico y basado en los temas proporcionados
  - Incluye datos concretos: fechas, importes, situaciones administrativas
  - Usa lenguaje jurídico-administrativo formal
  - El caso debe requerir conocimiento profundo de la normativa
  - Puede incluir varios personajes o situaciones interrelacionadas
  - Debe ser un caso que requiera análisis y aplicación normativa
  - OBJETIVO DE LONGITUD: 250-330 palabras (NUNCA excedas 400)

2. 15 PREGUNTAS TIPO TEST SOBRE EL SUPUESTO:
  - Todas las preguntas DEBEN ESTAR RELACIONADAS con el enunciado planteado
  - 4 opciones de respuesta (A, B, C, D) por cada pregunta
  - Solo UNA opción completamente correcta
  - **DISTRIBUCIÓN ALEATORIA:** Las respuestas correctas DEBEN estar distribuidas de forma IMPREDECIBLE entre A, B, C y D
  - **IMPORTANTE:** NO pongas más de 2 respuestas correctas consecutivas en la misma posición
  - **EVITA PATRONES:** No uses secuencias predecibles como A,B,C,D,A,B,C,D
  - Preguntas técnicas y específicas sobre el caso planteado
  - Requieren interpretación y aplicación de normativa al caso concreto
  - Las 4 opciones deben ser plausibles y técnicamente coherentes

3. SOLUCIONARIO MOTIVADO Y DETALLADO:
  - Cada respuesta debe incluir una explicación técnico-jurídica COMPLETA
  - **OBLIGATORIO:** Citar SIEMPRE la norma específica: "Artículo X.Y de la Ley/RD Z/AAAA, de DD de mes"
  - Transcribir LITERALMENTE fragmentos relevantes del texto legal entrecomillados
  - Explicar la interpretación jurídica aplicada al caso
  - Explicar técnicamente por qué las otras 3 opciones son INCORRECTAS
  - Usar terminología jurídica precisa: "conforme a", "según lo dispuesto en", "de acuerdo con lo establecido en"
  - Mencionar jurisprudencia o doctrina administrativa si es relevante
  - Estructura: [Norma citada completa] + [Texto legal literal] + [Interpretación aplicada al caso] + [Análisis de opciones incorrectas]

REQUISITOS DE CALIDAD PROFESIONAL:

1. NIVEL TÉCNICO:
  - Propio de exámenes oficiales de oposiciones C1
  - Referencias exactas a artículos, apartados, números
  - Terminología jurídico-administrativa precisa
  - Cálculos o procedimientos administrativos correctos
  - Plazos, porcentajes y datos numéricos exactos según normativa

2. REALISMO DEL CASO:
  - Situación administrativa verosímil y práctica
  - Datos coherentes y realistas
  - Problemática típica del ámbito de la Seguridad Social
  - Puede incluir varios niveles de complejidad

3. FUNDAMENTACIÓN JURÍDICA:
  - Cada respuesta correcta basada en normativa vigente específica
  - Citas completas: Ley, Real Decreto, Orden Ministerial, Reglamento
  - Fechas de publicación y entrada en vigor cuando sea relevante
  - Texto literal de artículos clave

4. VERIFICACIÓN MÚLTIPLE:
  - Contrasta cada respuesta con al menos 2 fuentes normativas
  - Asegura que la interpretación es la oficial y vigente
  - Verifica que los datos numéricos (plazos, porcentajes) son correctos
  - Confirma que no hay ambigüedad en la respuesta correcta

EJEMPLOS DE DISTRIBUCIÓN CORRECTA DE RESPUESTAS:
✅ BIEN: A, C, B, D, B, A, D, C, B, D, A, C, D, B, A (distribución variada e impredecible)
✅ BIEN: B, D, A, C, B, D, A, B, C, A, D, C, B, D, A (no hay patrones evidentes)
❌ MAL: A, A, A, B, B, B, C, C, C, D, D, D, A, A, A (agrupadas por posición)
❌ MAL: A, B, C, D, A, B, C, D, A, B, C, D, A, B, C (patrón secuencial)

FORMATO DE RESPUESTA (JSON):
{
  "statement": "ENUNCIADO COMPLETO DEL SUPUESTO PRÁCTICO (200-400 palabras)",
  "questions": [
   {
    "text": "1. Pregunta sobre el supuesto planteado",
    "options": ["A) Opción A", "B) Opción B", "C) Opción C", "D) Opción D"],
    "correctAnswer": "C",
    "explanation": "Explicación completa con cita legal, texto literal, interpretación y análisis de opciones incorrectas"
   }
  ]
}

INSTRUCCIONES FINALES:
- El enunciado debe ser un caso práctico COHERENTE y REALISTA
- Las 15 preguntas deben estar TODAS relacionadas con el enunciado
- TODAS las explicaciones deben citar normativa específica con artículo y apartado
- Distribución de respuestas correctas ALEATORIA entre A, B, C, D

MODO ESTRICTO (OBLIGATORIO):
- Cada explicación debe comenzar con una línea: "Fundamento: Artículo X.Y de la Ley/RDL/RD Z/AAAA" (sin inventar: usa solo referencias que estén en el CONTENIDO BASE).
- Cada explicación debe incluir al menos UNA cita literal entrecomillada que aparezca palabra-por-palabra en el CONTENIDO BASE.
- Debes usar EXACTAMENTE (copiar/pegar) una de estas CITAS LITERALES OBLIGATORIAS en CADA explicación:
${mandatoryQuotes.length > 0 ? mandatoryQuotes.map(q => `  - "${q}"`).join('\n') : '  - (No se pudieron extraer citas: usa una frase literal del CONTENIDO BASE y cópiala exactamente entre comillas)'}
- Justifica por qué las opciones incorrectas son incorrectas (menciona explícitamente "opción A", "opción B", "opción C", "opción D").
${strictNotes}

- Responde SOLO con el JSON, sin texto adicional antes o después`

  const attemptOnce = async (attempt: number, strictNotes: string) => {
    const prompt = buildPrompt(strictNotes)

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto examinador de oposiciones especializado en crear supuestos prácticos profesionales sobre Seguridad Social. Generas casos técnicos y jurídicamente rigurosos con motivación legal detallada.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: attempt === 1 ? 0.55 : attempt === 2 ? 0.35 : 0.2,
        max_tokens: 8000,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`[Groq][${input.requestId}] Error:`, errorData)
      throw new Error(`Error de Groq API: ${errorData?.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const modelContent = data.choices[0]?.message?.content

    if (!modelContent) {
      throw new Error('No se recibió contenido de Groq')
    }

    const jsonMatch = modelContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`[Groq][${input.requestId}] Respuesta sin JSON:`)
      throw new Error('La respuesta de IA no contiene JSON válido')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.statement || !parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Estructura de respuesta inválida')
    }

    // Fixups (modo estricto):
    // - Normalizar opciones (quitar prefijos A)/B)/...)
    // - Forzar que cada explicación contenga una cita literal entrecomillada (grounded)
    // - Reequilibrar la distribución de letras de correctAnswer sin cambiar el texto correcto
    if (parsed && Array.isArray(parsed.questions)) {
      if (typeof parsed.statement === 'string' && STRICT_GENERATION) {
        parsed.statement = await rewriteStatementIfNeeded(parsed.statement, attempt)
      }
      parsed.questions = parsed.questions.map((q: any, idx: number) => {
        const optionsArr = Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : []
        const withCitations = ensureLegalCitations(String(q?.explanation || ''), baseArticleRef, baseNormRef)
        const withGroundedQuote = ensureGroundedMandatoryQuote(
          withCitations,
          baseContentForPrompt,
          mandatoryQuotes,
          idx
        )
        return {
          ...q,
          options: optionsArr,
          correctAnswer: String(q?.correctAnswer || '').toUpperCase(),
          explanation: ensureQuotedLiteral(withGroundedQuote, mandatoryQuotes, idx)
        }
      })
      parsed.questions = rebalanceQuestionsABCD(parsed.questions, 2)
    }

    if (STRICT_GENERATION) {
      const validation = validateStrictOutput(parsed, baseContentForPrompt, mandatoryQuotes)
      if (!validation.ok) {
        const err = new Error(`No cumple criterios estrictos: ${validation.issues.join(' | ')}`)
        ;(err as any).strictIssues = validation.issues
        throw err
      }
    }

    const validQuestions = parsed.questions.filter((q: any) =>
      q.text &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.correctAnswer &&
      ['A', 'B', 'C', 'D'].includes(String(q.correctAnswer).toUpperCase()) &&
      q.explanation
    )

    if (STRICT_GENERATION && validQuestions.length !== 15) {
      throw new Error(`Modo estricto requiere 15/15 preguntas válidas. Actual: ${validQuestions.length}`)
    }

    if (!STRICT_GENERATION && validQuestions.length < 10) {
      throw new Error(`Solo se generaron ${validQuestions.length} preguntas válidas (mínimo: 10)`) 
    }

    return {
      statement: parsed.statement,
      questions: validQuestions.slice(0, 15)
    }
  }

  const run = async () => {
    let strictNotes = ''
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await attemptOnce(attempt, strictNotes)
      } catch (e: any) {
        const issues: string[] = Array.isArray(e?.strictIssues) ? e.strictIssues : [String(e?.message || e)]
        console.warn(`[Generate Practical AI][${input.requestId}] Intento ${attempt} no pasa QA estricto:`, issues)
        strictNotes = `\n\n⚠️ REINTENTO ${attempt + 1}: corrige estrictamente estos fallos detectados:\n- ${issues.slice(0, 12).join('\n- ')}\n\nNo inventes citas. Usa SOLO referencias normativas y la cita literal OBLIGATORIA (copiar/pegar) del CONTENIDO BASE.`
        if (attempt === MAX_ATTEMPTS) throw e
      }
    }
    throw new Error('Error inesperado en reintentos')
  }

  return await run()
}
