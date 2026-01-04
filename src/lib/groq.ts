const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  console.warn('[Groq] API Key no configurada. Define GROQ_API_KEY en .env')
}

export async function generateQuestions(
  content: string,
  count: number = 10,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  existingQuestions: string[] = []
): Promise<any[]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no está configurada')
  }

  const existingQuestionsText = existingQuestions.length > 0 
    ? `\n\n⚠️ PREGUNTAS YA EXISTENTES (DEBES GENERAR PREGUNTAS COMPLETAMENTE DIFERENTES):\n${existingQuestions.slice(0, 30).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n🚫 PROHIBIDO:\n- Reformular o parafrasear las preguntas existentes\n- Cambiar solo el orden de las palabras\n- Preguntar sobre los mismos artículos o apartados ya usados\n- Usar estructuras gramaticales similares a las preguntas existentes\n\n✅ OBLIGATORIO:\n- Abordar artículos, apartados y aspectos COMPLETAMENTE DIFERENTES\n- Usar enfoques y perspectivas distintas del mismo contenido\n- Generar preguntas sobre detalles específicos no cubiertos aún\n- Variar el tipo de pregunta (directa, negativa, comparativa, de excepción, etc.)`
    : ''

  const prompt = `Eres un experto examinador de oposiciones para el Cuerpo General Administrativo de la Administración del Estado (Subgrupo C1) especializado en la Seguridad Social española.

Genera ${count} preguntas tipo test de nivel profesional para oposiciones C1, basadas en el siguiente contenido legal.

NIVEL Y ESTILO REQUERIDO:
- Preguntas del nivel de exámenes oficiales de oposiciones C1 de la Seguridad Social
- Muy específicas y técnicas, centradas en detalles legislativos concretos
- Referencias exactas a artículos, apartados, números y fechas de normativa
- Lenguaje formal y jurídico-administrativo
- Opciones de respuesta muy similares entre sí para aumentar dificultad
- Solo una opción completamente correcta según la legislación vigente

DIFICULTAD: ${difficulty === 'easy' ? 'Nivel básico (conocimientos generales de normativa)' : difficulty === 'medium' ? 'Nivel medio (conocimientos específicos y detallados)' : 'Nivel avanzado (conocimientos profundos, casos complejos y excepciones normativas)'}

CONTENIDO LEGAL:
${content}${existingQuestionsText}

INSTRUCCIONES OBLIGATORIAS PARA LAS PREGUNTAS:
- Genera EXACTAMENTE ${count} preguntas COMPLETAMENTE DIFERENTES a las ya existentes
- **CRÍTICO: Si hay preguntas existentes, tus preguntas deben abordar artículos, conceptos y detalles DISTINTOS**
- **NO reformules ni parafrasees las preguntas existentes de ninguna manera**
- **Enfócate en aspectos y matices del contenido que NO hayan sido preguntados**
- Cada pregunta debe tener 4 opciones (A, B, C, D)
- Las 4 opciones deben ser plausibles y técnicamente coherentes
- Solo UNA opción es completamente correcta según la legislación
- **IMPORTANTE: Distribuye la respuesta correcta ALEATORIAMENTE entre A, B, C y D**
- **NO pongas siempre la respuesta correcta en la misma posición (A, B, C o D)**
- **Varía la posición de la respuesta correcta en cada pregunta de forma aleatoria**
- Incluye referencias específicas: artículos, apartados, fechas, porcentajes, plazos
- Utiliza terminología jurídica precisa (promulgar, derogar, vigente, etc.)
- Las opciones incorrectas deben ser creíbles pero contener algún error técnico
- NO repitas ni reformules las preguntas ya existentes
- Aborda aspectos diferentes y específicos del contenido

INSTRUCCIONES OBLIGATORIAS PARA LAS EXPLICACIONES:
- Utiliza lenguaje técnico-jurídico profesional
- Cita SIEMPRE el artículo, apartado o disposición legal específica
- Incluye la norma completa: "Artículo X.Y del Real Decreto Z/AAAA, de DD de mes"
- Transcribe literalmente fragmentos relevantes del texto legal entrecomillados
- Explica por qué las otras opciones son incorrectas técnicamente
- Usa terminología jurídica precisa: "conforme a", "según lo dispuesto en", "de acuerdo con lo establecido en"
- Si aplica, menciona fecha de entrada en vigor o modificaciones posteriores
- Estructura: [Norma citada] + [Texto legal literal] + [Interpretación técnica] + [Por qué otras opciones son incorrectas]

EJEMPLOS DE FORMATO CORRECTO DE PREGUNTAS:
- "Según el artículo X de la Ley Y, ¿cuál es el plazo...?"
- "¿Qué establece el apartado 2 del artículo 15...?"
- "De acuerdo con el Real Decreto Z, aprobado el DD/MM/AAAA..."
- "¿Cuál de las siguientes afirmaciones sobre [concepto] es correcta según...?"

DISTRIBUCIÓN DE RESPUESTAS CORRECTAS (OBLIGATORIO):
- En un conjunto de 10 preguntas, debe haber aproximadamente:
  * 2-3 respuestas correctas en posición A
  * 2-3 respuestas correctas en posición B
  * 2-3 respuestas correctas en posición C
  * 2-3 respuestas correctas en posición D
- NUNCA pongas más de 2 respuestas correctas consecutivas en la misma posición
- La secuencia debe ser IMPREDECIBLE (ejemplo: A, C, B, D, B, A, C, D, A, B)
- EVITA patrones como: A, A, A, A... o A, B, C, D, A, B, C, D...

EJEMPLOS DE EXPLICACIONES CORRECTAS:
BIEN: "Conforme al artículo 15.2 del Real Decreto Legislativo 8/2015, de 30 de octubre, por el que se aprueba el texto refundido de la Ley General de la Seguridad Social, el texto establece literalmente: 'El plazo de prescripción será de cinco años'. Las opciones B y C son incorrectas porque mencionan plazos de tres y cuatro años respectivamente, que no corresponden a este supuesto normativo. La opción D es incorrecta porque el plazo se computa desde la fecha del hecho causante, no desde la solicitud."

MAL: "La respuesta correcta es A porque así lo dice la ley."
MAL: "Es A porque el plazo es de 5 años."

FORMATO DE RESPUESTA (JSON):
{
  "questions": [
    {
      "text": "¿Pregunta aquí?",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": "A",
      "explanation": "Explicación técnica completa citando norma, artículo, texto literal y razones de por qué las demás opciones son incorrectas"
    }
  ]
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en crear preguntas de examen para oposiciones. Respondes siempre en formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Groq API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No se recibió respuesta de Groq')
    }

    const parsed = JSON.parse(content)
    return parsed.questions || []
  } catch (error) {
    console.error('[Groq] Error generando preguntas:', error)
    throw new Error('Error al generar preguntas con IA')
  }
}
