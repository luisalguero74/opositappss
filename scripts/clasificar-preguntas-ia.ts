import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

async function clasificarPreguntasSinTema() {
  console.log('🤖 Iniciando clasificación automática de preguntas...\n')

  // 1. Obtener todos los temas oficiales
  const temas = await prisma.temaOficial.findMany({
    orderBy: [{ categoria: 'asc' }, { numero: 'asc' }]
  })

  console.log(`📚 ${temas.length} temas oficiales cargados`)

  // 2. Obtener preguntas sin tema
  const preguntasSinTema = await prisma.question.findMany({
    where: { temaCodigo: 'SIN_TEMA' },
    select: {
      id: true,
      text: true,
      options: true
    },
    take: 1200 // Procesar TODAS las restantes
  })

  console.log(`📝 ${preguntasSinTema.length} preguntas sin clasificar\n`)

  if (preguntasSinTema.length === 0) {
    console.log('✅ No hay preguntas pendientes de clasificar')
    return
  }

  // 3. Preparar el prompt con el temario
  const temarioTexto = temas.map(t => {
    const codigo = t.id.toUpperCase()
    return `${codigo} - ${t.titulo} (${t.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO'})`
  }).join('\n')

  let clasificadas = 0
  let errores = 0

  // 4. Clasificar preguntas en lotes
  for (const pregunta of preguntasSinTema) {
    try {
      const opciones = JSON.parse(pregunta.options as string)
      const textoCompleto = `${pregunta.text}\nOpciones: ${opciones.join(', ')}`

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'system',
          content: 'Eres un experto en oposiciones de Administración de la Seguridad Social. Responde SOLO con el código del tema solicitado.'
        }, {
          role: 'user',
          content: `TEMARIO OFICIAL:
${temarioTexto}

Analiza esta pregunta de examen y determina a qué tema pertenece:

PREGUNTA:
${textoCompleto}

Responde SOLO con el código del tema (ej: G1, E4, G23). Si no puedes determinarlo con certeza, responde "DESCONOCIDO".`
        }],
        max_tokens: 10,
        temperature: 0.1
      })

      const respuesta = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'DESCONOCIDO'

      // Validar que el código existe
      const codigoLimpio = respuesta.replace(/[^A-Z0-9]/g, '')
      const temaEncontrado = temas.find(t => t.id.toUpperCase() === codigoLimpio)

      if (temaEncontrado) {
        await prisma.question.update({
          where: { id: pregunta.id },
          data: {
            temaCodigo: codigoLimpio,
            temaId: temaEncontrado.id
          }
        })
        
        clasificadas++
        console.log(`✅ ${clasificadas}/${preguntasSinTema.length} - ${codigoLimpio}: ${pregunta.text.substring(0, 60)}...`)
      } else {
        errores++
        console.log(`❌ ${errores} - No clasificada: ${pregunta.text.substring(0, 60)}...`)
      }

      // Rate limiting (Groq es muy rápido, no necesita tanto delay)
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      errores++
      console.error(`❌ Error procesando pregunta ${pregunta.id}:`, error)
    }
  }

  console.log('\n========================================')
  console.log('📊 RESULTADO CLASIFICACIÓN IA')
  console.log('========================================')
  console.log(`✅ Clasificadas correctamente: ${clasificadas}`)
  console.log(`❌ Errores/No clasificadas: ${errores}`)
  console.log(`📝 Total procesadas: ${preguntasSinTema.length}`)
  console.log('========================================\n')

  // Estadísticas finales
  const stats = await prisma.question.groupBy({
    by: ['temaCodigo'],
    _count: true,
    orderBy: {
      _count: {
        temaCodigo: 'desc'
      }
    },
    take: 5
  })

  console.log('Top 5 temas con más preguntas:')
  stats.forEach(s => {
    console.log(`  ${s.temaCodigo}: ${s._count} preguntas`)
  })

  await prisma.$disconnect()
}

clasificarPreguntasSinTema().catch(console.error)
