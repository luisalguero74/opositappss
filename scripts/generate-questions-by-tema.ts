import { prisma } from '../src/lib/prisma'
import { TEMARIO_OFICIAL } from '../src/lib/temario-oficial'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
})

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

async function generarPreguntasParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico',
  numPreguntas: number = 30
): Promise<PreguntaGenerada[]> {
  const prompt = `Eres un experto en oposiciones al Cuerpo General Administrativo de la Seguridad Social (C1).

Genera ${numPreguntas} preguntas tipo test profesionales sobre el siguiente tema:

TEMA ${temaNumero}: ${temaTitulo}
Descripción: ${temaDescripcion}
Categoría: ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}

REQUISITOS OBLIGATORIOS:
- Preguntas muy específicas del tema indicado
- Estilo formal y profesional de examen oficial
- 4 opciones por pregunta (A, B, C, D)
- Solo UNA opción correcta
- Dificultad variada: 40% fácil, 40% media, 20% difícil
- Explicación breve de por qué es correcta la respuesta
- Indica el nivel de dificultad para cada pregunta

Devuelve SOLO un array JSON válido con este formato exacto:
[
  {
    "pregunta": "texto de la pregunta",
    "opciones": ["A) opción 1", "B) opción 2", "C) opción 3", "D) opción 4"],
    "respuestaCorrecta": 0,
    "explicacion": "explicación breve",
    "dificultad": "facil"
  }
]

IMPORTANTE: 
- El campo "dificultad" debe ser: "facil", "media" o "dificil"
- Responde SOLO con el JSON, sin texto adicional.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8000
    })

    const content = completion.choices[0]?.message?.content || '[]'
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    
    if (!jsonMatch) {
      console.error(`No se pudo extraer JSON para tema ${temaId}`)
      return []
    }

    const preguntas = JSON.parse(jsonMatch[0])
    return preguntas
  } catch (error) {
    console.error(`Error generando preguntas para tema ${temaId}:`, error)
    return []
  }
}

async function main() {
  console.log('🚀 Iniciando generación de preguntas por tema...\n')

  // Verificar qué temas ya tienen preguntas
  const temasConPreguntas = await prisma.question.groupBy({
    by: ['temaCodigo'],
    _count: true,
    where: { temaCodigo: { not: null } }
  })

  const temasYaProcesados = new Set(temasConPreguntas.map(t => t.temaCodigo?.toLowerCase()))
  
  console.log(`ℹ️  Temas ya procesados: ${temasYaProcesados.size}`)
  if (temasYaProcesados.size > 0) {
    console.log(`   ${Array.from(temasYaProcesados).join(', ')}`)
  }
  console.log('')

  // Crear un cuestionario general para almacenar todas las preguntas
  const questionnaire = await prisma.questionnaire.create({
    data: {
      title: `Preguntas por Tema - ${new Date().toISOString()}`,
      type: 'theory',
      published: true
    }
  })

  console.log(`✅ Cuestionario creado: ${questionnaire.id}\n`)

  let totalPreguntas = 0
  let temasConPreguntasNuevas = 0

  for (const tema of TEMARIO_OFICIAL) {
    // Saltar temas que ya tienen preguntas
    if (temasYaProcesados.has(tema.id)) {
      console.log(`⏭️  Saltando Tema ${tema.numero} - ${tema.titulo} (ya procesado)`)
      continue
    }

    console.log(`\n📝 Procesando: Tema ${tema.numero} - ${tema.titulo}`)
    console.log(`   Categoría: ${tema.categoria}`)

    // Generar preguntas para este tema
    const preguntas = await generarPreguntasParaTema(
      tema.id,
      tema.numero,
      tema.titulo,
      tema.descripcion,
      tema.categoria,
      30 // 30 preguntas por tema
    )

    if (preguntas.length === 0) {
      console.log(`   ⚠️  No se generaron preguntas`)
      continue
    }

    // Guardar preguntas en la base de datos
    for (const p of preguntas) {
      try {
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: p.pregunta,
            options: JSON.stringify(p.opciones),
            correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta],
            explanation: p.explicacion,
            temaCodigo: tema.id.toUpperCase(), // g1 -> G1
            temaNumero: tema.numero,
            temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
            temaTitulo: tema.titulo,
            difficulty: p.dificultad || 'media' // Default a media si no viene
          }
        })
        totalPreguntas++
      } catch (error) {
        console.error(`   ❌ Error guardando pregunta:`, error)
      }
    }

    console.log(`   ✅ ${preguntas.length} preguntas generadas y guardadas`)
    temasConPreguntasNuevas++

    // Pausa de 3 segundos entre temas para no saturar la API (aumentado por más preguntas)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ PROCESO COMPLETADO`)
  console.log(`   Temas procesados en esta ejecución: ${temasConPreguntasNuevas}`)
  console.log(`   Total temas con preguntas: ${temasYaProcesados.size + temasConPreguntasNuevas}/${TEMARIO_OFICIAL.length}`)
  console.log(`   Preguntas generadas en esta ejecución: ${totalPreguntas}`)
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
