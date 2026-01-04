import { prisma } from '../src/lib/prisma'
import { TEMARIO_OFICIAL } from '../src/lib/temario-oficial'

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

async function llamarOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 8000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response || ''
  } catch (error) {
    console.error('Error llamando a Ollama:', error)
    return ''
  }
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
    const content = await llamarOllama(prompt)
    
    // Intentar extraer JSON de la respuesta
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    
    if (!jsonMatch) {
      console.error(`No se pudo extraer JSON para tema ${temaId}`)
      console.log('Respuesta recibida:', content.substring(0, 500))
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
  console.log('🚀 Iniciando generación de preguntas con Ollama...\n')
  console.log('ℹ️  Usando modelo: llama3.2:3b (local, sin límites)\n')

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
      title: `Preguntas Ollama - ${new Date().toISOString()}`,
      type: 'theory',
      published: true
    }
  })

  console.log(`✅ Cuestionario creado: ${questionnaire.id}\n`)

  let totalPreguntas = 0
  let temasConPreguntasNuevas = 0
  let erroresConsecutivos = 0
  const MAX_ERRORES_CONSECUTIVOS = 3

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
      erroresConsecutivos++
      
      if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
        console.log(`\n❌ Demasiados errores consecutivos. Deteniendo proceso.`)
        break
      }
      
      // Pausa más larga después de un error
      await new Promise(resolve => setTimeout(resolve, 10000))
      continue
    }

    erroresConsecutivos = 0 // Resetear contador de errores

    // Guardar preguntas en la base de datos
    let preguntasGuardadas = 0
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
        preguntasGuardadas++
        totalPreguntas++
      } catch (error) {
        console.error(`   ❌ Error guardando pregunta:`, error)
      }
    }

    console.log(`   ✅ ${preguntasGuardadas} preguntas generadas y guardadas`)
    temasConPreguntasNuevas++

    // Pausa de 5 segundos entre temas (Ollama es más lento pero sin límites)
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ PROCESO COMPLETADO`)
  console.log(`   Temas procesados en esta ejecución: ${temasConPreguntasNuevas}`)
  console.log(`   Total temas con preguntas: ${temasYaProcesados.size + temasConPreguntasNuevas}/${TEMARIO_OFICIAL.length}`)
  console.log(`   Preguntas generadas en esta ejecución: ${totalPreguntas}`)
  console.log(`   Preguntas esperadas: ${temasConPreguntasNuevas * 30}`)
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
