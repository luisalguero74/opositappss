// Cliente para Ollama - Generación de preguntas con IA local

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

interface OllamaResponse {
  model: string
  response: string
  done: boolean
}

interface GeneratedQuestion {
  question: string
  options: string[]
  correct: string
  explanation: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

export async function generateQuestions(
  content: string,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  existingQuestions: string[] = []
): Promise<GeneratedQuestion[]> {
  try {
    const prompt = createPrompt(content, count, difficulty, existingQuestions)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutos

    let response: Response
    try {
      response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 2000,
          }
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data: OllamaResponse = await response.json()
    
    // Parsear la respuesta JSON del modelo
    const questions = parseQuestionsFromResponse(data.response)
    return questions
  } catch (error) {
    console.error('[Ollama] Error generando preguntas:', error)
    throw new Error('Error al generar preguntas con IA')
  }
}

function createPrompt(content: string, count: number, difficulty: string, existingQuestions: string[] = []): string {
  const existingQuestionsText = existingQuestions.length > 0 
    ? `\n\n⚠️ PREGUNTAS YA EXISTENTES (GENERA PREGUNTAS COMPLETAMENTE DIFERENTES):\n${existingQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n🚫 NO reformules ni parafrasees estas preguntas. Aborda aspectos DISTINTOS del contenido.`
    : ''

  return `Eres un experto en oposiciones de Seguridad Social española. Tu tarea es generar preguntas tipo test de alta calidad basadas en contenido legal.

CONTENIDO LEGAL:
"""
${content.substring(0, 4000)} // Limitamos para no saturar el contexto
"""${existingQuestionsText}

REQUISITOS:
- Genera exactamente ${count} preguntas COMPLETAMENTE DIFERENTES a las existentes
- Dificultad: ${difficulty}
- Formato: 1 pregunta con 4 opciones (A, B, C, D)
- Solo UNA respuesta correcta por pregunta
- Preguntas específicas y técnicas, no obvias
- Basadas ÚNICAMENTE en el contenido proporcionado
- Incluye breve explicación de la respuesta correcta

FORMATO DE RESPUESTA (JSON estricto):
{
  "questions": [
    {
      "question": "¿Texto de la pregunta?",
      "options": [
        "Opción A",
        "Opción B", 
        "Opción C",
        "Opción D"
      ],
      "correct": "A",
      "explanation": "Explicación breve de por qué A es correcta",
      "difficulty": "${difficulty}"
    }
  ]
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`
}

function parseQuestionsFromResponse(response: string): GeneratedQuestion[] {
  try {
    // Intentar extraer JSON de la respuesta
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Ollama] No se encontró JSON en la respuesta')
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    const questions = parsed.questions || []

    // Validar formato
    return questions.filter((q: any) => 
      q.question &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.correct &&
      ['A', 'B', 'C', 'D'].includes(q.correct)
    )
  } catch (error) {
    console.error('[Ollama] Error parseando respuesta:', error)
    console.error('[Ollama] Respuesta recibida:', response)
    return []
  }
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`)
    const data = await response.json()
    return data.models?.map((m: any) => m.name) || []
  } catch {
    return []
  }
}
