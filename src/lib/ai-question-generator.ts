import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'

// Groq SDK se inicializa bajo demanda
async function getGroqClient() {
  const Groq = (await import('groq-sdk')).default
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
}

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctAnswer: string // "A", "B", "C", "D"
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuestionGenerationOptions {
  topic?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  count?: number
  language?: string
}

/**
 * Genera preguntas tipo test basadas en contenido con IA
 */
export async function generateQuestionsFromContent(
  content: string,
  options: QuestionGenerationOptions = {}
): Promise<GeneratedQuestion[]> {
  const {
    topic = 'temario general',
    difficulty = 'medium',
    count = 5,
    language = 'es'
  } = options

  const prompt = `Eres un experto en oposiciones de la Administración General del Estado, especializado en crear preguntas tipo test para el Cuerpo General Auxiliar de la Administración del Estado (C2).

CONTENIDO A ANALIZAR:
${content.substring(0, 8000)}

INSTRUCCIONES:
1. Genera exactamente ${count} preguntas tipo test basadas ÚNICAMENTE en el contenido proporcionado
2. Cada pregunta debe tener 4 opciones (A, B, C, D)
3. Solo una respuesta debe ser correcta
4. Dificultad: ${difficulty}
5. Tema: ${topic}
6. Las preguntas deben ser específicas y verificables con el contenido
7. Incluye explicación detallada de por qué la respuesta es correcta

FORMATO DE RESPUESTA (JSON):
{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": "A",
      "explanation": "Explicación de por qué A es correcta y las demás incorrectas",
      "difficulty": "${difficulty}"
    }
  ]
}

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- Las opciones incorrectas deben ser plausibles pero claramente incorrectas
- La explicación debe referenciar el contenido original
- No inventes información que no esté en el contenido`

  try {
    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en crear preguntas tipo test para oposiciones. Respondes SOLO con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta de la IA')
    }

    const parsed = JSON.parse(response)
    return parsed.questions || []
  } catch (error) {
    console.error('Error generando preguntas:', error)
    throw error
  }
}

/**
 * Genera preguntas usando Ollama (local)
 */
export async function generateQuestionsWithOllama(
  content: string,
  options: QuestionGenerationOptions = {}
): Promise<GeneratedQuestion[]> {
  const {
    topic = 'temario general',
    difficulty = 'medium',
    count = 5
  } = options

  const prompt = `Eres un experto en oposiciones. Genera ${count} preguntas tipo test basadas en este contenido:

${content.substring(0, 6000)}

Tema: ${topic}
Dificultad: ${difficulty}

Formato JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}

Responde SOLO con JSON válido.`

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        format: 'json'
      })
    })

    if (!response.ok) {
      throw new Error('Error en Ollama')
    }

    const data = await response.json()
    const parsed = JSON.parse(data.response)
    return parsed.questions || []
  } catch (error) {
    console.error('Error con Ollama:', error)
    throw error
  }
}

/**
 * Mejora una pregunta existente usando IA
 */
export async function improveQuestion(
  question: GeneratedQuestion,
  feedback: string
): Promise<GeneratedQuestion> {
  const prompt = `Mejora esta pregunta tipo test según el feedback:

PREGUNTA ACTUAL:
${JSON.stringify(question, null, 2)}

FEEDBACK:
${feedback}

Proporciona la pregunta mejorada en formato JSON con la misma estructura.`

  try {
    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en mejorar preguntas tipo test. Respondes SOLO con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta de la IA')
    }

    return JSON.parse(response)
  } catch (error) {
    console.error('Error mejorando pregunta:', error)
    throw error
  }
}
