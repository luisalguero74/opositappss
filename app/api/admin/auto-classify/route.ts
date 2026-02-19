import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST() {
  try {
    // Obtener preguntas SIN_TEMA
    const preguntasSinTema = await prisma.question.findMany({
      where: {
        questionnaireId: null,
        temaCodigo: 'SIN_TEMA'
      },
      take: 100, // Procesar 100 por vez
      select: {
        id: true,
        text: true
      }
    })

    if (preguntasSinTema.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay preguntas pendientes',
        clasificadas: 0
      })
    }

    // Obtener temas
    const temas = await prisma.temaOficial.findMany({
      orderBy: { id: 'asc' }
    })

    const temasInfo = temas.map(t => `${t.id}: ${t.titulo}`).join('\n')

    let clasificadas = 0
    let errores = 0

    // Procesar en lotes de 1
    for (const pregunta of preguntasSinTema) {
      try {
        const prompt = `Clasifica esta pregunta en UNO de los siguientes temas del temario de Auxiliar Administrativo del Ayuntamiento de Málaga.

TEMAS DISPONIBLES:
${temasInfo}

PREGUNTA:
${pregunta.text}

Responde SOLO con el código del tema (ejemplo: G1, E7, etc.). Si no encaja claramente en ninguno, responde: SIN_TEMA`

        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 20
        })

        const respuesta = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'SIN_TEMA'
        
        // Validar que sea un código válido
        const tema = temas.find(t => t.id.toUpperCase() === respuesta)
        
        if (tema) {
          await prisma.question.update({
            where: { id: pregunta.id },
            data: {
              temaId: tema.id,
              temaCodigo: tema.id
            }
          })
          clasificadas++
          console.log(`✅ Pregunta ${pregunta.id} clasificada como ${tema.id}`)
        } else {
          console.log(`⚠️ Pregunta ${pregunta.id} no clasificada (respuesta: ${respuesta})`)
          errores++
        }

        // Rate limiting (150ms entre requests)
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (error) {
        console.error(`Error procesando pregunta ${pregunta.id}:`, error)
        errores++
      }
    }

    return NextResponse.json({
      success: true,
      procesadas: preguntasSinTema.length,
      clasificadas,
      errores,
      pendientes: await prisma.question.count({
        where: { questionnaireId: null, temaCodigo: 'SIN_TEMA' }
      })
    })
  } catch (error) {
    console.error('Error en clasificación automática:', error)
    return NextResponse.json({ error: 'Error en clasificación' }, { status: 500 })
  }
}
