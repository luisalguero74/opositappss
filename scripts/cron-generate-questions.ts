#!/usr/bin/env node

/**
 * Script de Generación Automática de Preguntas - Diseñado para Cron
 * 
 * Este script está optimizado para ejecutarse automáticamente via cron
 * - Sin interacción con usuario
 * - Logging completo
 * - Manejo robusto de errores
 * - Reintentos automáticos
 * 
 * Uso:
 *   npx tsx scripts/cron-generate-questions.ts [opciones]
 * 
 * Opciones:
 *   --tema=G1          Generar solo para un tema específico
 *   --all              Generar para todos los temas
 *   --general-only     Solo temario general
 *   --specific-only    Solo temario específico
 *   --num-questions=30 Número de preguntas por tema (default: 30)
 *   --log-file=path    Archivo de log (default: logs/cron-generation.log)
 *   --dry-run          Simular sin guardar
 */

import { prisma } from '../src/lib/prisma'
import { TEMARIO_OFICIAL } from '../src/lib/temario-oficial'
import Groq from 'groq-sdk'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// CONFIGURACIÓN
// ============================================

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

interface ConfiguracionCron {
  temaParcial?: string
  todos: boolean
  soloGeneral: boolean
  soloEspecifico: boolean
  numPreguntas: number
  archivoLog: string
  dryRun: boolean
}

// Función para calcular similitud entre textos (Jaccard Index)
function calcularSimilaridad(texto1: string, texto2: string): number {
  const normalizar = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '').trim()
  const palabras1 = new Set(normalizar(texto1).split(/\s+/))
  const palabras2 = new Set(normalizar(texto2).split(/\s+/))
  const interseccion = new Set([...palabras1].filter(x => palabras2.has(x)))
  const union = new Set([...palabras1, ...palabras2])
  return union.size === 0 ? 0 : interseccion.size / union.size
}

// Filtrar preguntas duplicadas o muy similares
function filtrarDuplicados(
  preguntasNuevas: PreguntaGenerada[],
  preguntasExistentes: string[]
): { filtradas: PreguntaGenerada[], eliminadas: number } {
  const UMBRAL_SIMILARIDAD = 0.7 // 70% de palabras en común = duplicado
  
  const resultado: PreguntaGenerada[] = []
  let eliminadas = 0
  
  for (const pregunta of preguntasNuevas) {
    // Verificar duplicados exactos
    if (preguntasExistentes.some(existing => 
      existing.toLowerCase().trim() === pregunta.pregunta.toLowerCase().trim()
    )) {
      eliminadas++
      continue
    }
    
    // Verificar preguntas muy similares con existentes
    const esSimilarAExistente = preguntasExistentes.some(existing => {
      const similitud = calcularSimilaridad(existing, pregunta.pregunta)
      return similitud >= UMBRAL_SIMILARIDAD
    })
    
    if (esSimilarAExistente) {
      eliminadas++
      continue
    }
    
    // Verificar duplicados dentro del mismo lote
    const esSimilarEnLote = resultado.some(existing => 
      calcularSimilaridad(existing.pregunta, pregunta.pregunta) >= UMBRAL_SIMILARIDAD
    )
    
    if (!esSimilarEnLote) {
      resultado.push(pregunta)
    } else {
      eliminadas++
    }
  }
  
  return { filtradas: resultado, eliminadas }
}

class LoggerCron {
  private archivoLog: string
  private consola: boolean

  constructor(archivoLog: string, consola: boolean = true) {
    this.archivoLog = archivoLog
    this.consola = consola
    
    // Crear directorio de logs si no existe
    const dirLogs = path.dirname(archivoLog)
    if (!fs.existsSync(dirLogs)) {
      fs.mkdirSync(dirLogs, { recursive: true })
    }
  }

  log(mensaje: string, nivel: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' = 'INFO') {
    const timestamp = new Date().toISOString()
    const linea = `[${timestamp}] [${nivel}] ${mensaje}`
    
    // Escribir en archivo
    fs.appendFileSync(this.archivoLog, linea + '\n')
    
    // Mostrar en consola si está habilitado
    if (this.consola) {
      const colores = {
        'INFO': '\x1b[36m',      // Cyan
        'WARN': '\x1b[33m',      // Yellow
        'ERROR': '\x1b[31m',     // Red
        'SUCCESS': '\x1b[32m'    // Green
      }
      const reset = '\x1b[0m'
      console.log(`${colores[nivel]}${linea}${reset}`)
    }
  }

  info(mensaje: string) { this.log(mensaje, 'INFO') }
  warn(mensaje: string) { this.log(mensaje, 'WARN') }
  error(mensaje: string) { this.log(mensaje, 'ERROR') }
  success(mensaje: string) { this.log(mensaje, 'SUCCESS') }
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

async function generarPreguntasParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico',
  numPreguntas: number = 30,
  logger: LoggerCron
): Promise<PreguntaGenerada[]> {
  // Obtener preguntas existentes para este tema ANTES de generar
  let preguntasExistentes: string[] = []
  try {
    const questionsEnBD = await prisma.question.findMany({
      where: {
        temaCodigo: temaId.toUpperCase()
      },
      select: {
        text: true
      }
    })
    preguntasExistentes = questionsEnBD.map(q => q.text)
  } catch (error) {
    logger.warn(`  ⚠️  No se pudieron obtener preguntas existentes: ${String(error).substring(0, 50)}`)
  }

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
]`

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096
    })

    const contenido = response.choices[0]?.message?.content || ''
    
    // Extraer JSON del contenido
    const jsonMatch = contenido.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta')
    }

    const preguntasGeneradas = JSON.parse(jsonMatch[0]) as PreguntaGenerada[]
    
    // Filtrar duplicados y preguntas muy similares
    const { filtradas, eliminadas } = filtrarDuplicados(preguntasGeneradas, preguntasExistentes)
    
    if (eliminadas > 0) {
      logger.info(`  🔍 Filtrado: ${preguntasGeneradas.length} generadas → ${filtradas.length} aceptadas (${eliminadas} eliminadas por duplicidad)`)
    }
    
    return filtradas
  } catch (error) {
    logger.error(`Error generando preguntas para ${temaTitulo}: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

function parsearArgumentos(): ConfiguracionCron {
  const args = process.argv.slice(2)
  const config: ConfiguracionCron = {
    todos: false,
    soloGeneral: false,
    soloEspecifico: false,
    numPreguntas: 30,
    archivoLog: 'logs/cron-generation.log',
    dryRun: false
  }

  for (const arg of args) {
    if (arg.startsWith('--tema=')) {
      config.temaParcial = arg.replace('--tema=', '')
    } else if (arg === '--all') {
      config.todos = true
    } else if (arg === '--general-only') {
      config.soloGeneral = true
    } else if (arg === '--specific-only') {
      config.soloEspecifico = true
    } else if (arg.startsWith('--num-questions=')) {
      config.numPreguntas = parseInt(arg.replace('--num-questions=', ''))
    } else if (arg.startsWith('--log-file=')) {
      config.archivoLog = arg.replace('--log-file=', '')
    } else if (arg === '--dry-run') {
      config.dryRun = true
    }
  }

  return config
}

// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

async function main() {
  const config = parsearArgumentos()
  const logger = new LoggerCron(config.archivoLog)

  logger.info('═'.repeat(60))
  logger.info('INICIANDO GENERACIÓN AUTOMÁTICA DE PREGUNTAS')
  logger.info('═'.repeat(60))
  logger.info(`Configuración:`)
  logger.info(`  - Modo: ${config.dryRun ? 'DRY RUN' : 'PRODUCCIÓN'}`)
  logger.info(`  - Solo general: ${config.soloGeneral}`)
  logger.info(`  - Solo específico: ${config.soloEspecifico}`)
  logger.info(`  - Preguntas por tema: ${config.numPreguntas}`)
  logger.info(`  - Archivo de log: ${config.archivoLog}`)

  try {
    // Filtrar temas según configuración
    let temasAGenerar = TEMARIO_OFICIAL
    
    if (config.soloGeneral) {
      temasAGenerar = temasAGenerar.filter(t => t.categoria === 'general')
    }
    if (config.soloEspecifico) {
      temasAGenerar = temasAGenerar.filter(t => t.categoria === 'especifico')
    }
    if (config.temaParcial) {
      temasAGenerar = temasAGenerar.filter(t => 
        t.id.toLowerCase().startsWith(config.temaParcial!.toLowerCase())
      )
    }

    logger.info(`Temas a procesar: ${temasAGenerar.length}`)

    // Crear cuestionario contenedor
    let cuestionarioId: string | null = null
    if (!config.dryRun) {
      const questionnaire = await prisma.questionnaire.create({
        data: {
          title: `Preguntas Automáticas - ${new Date().toISOString()}`,
          type: 'theory',
          published: false
        }
      })
      cuestionarioId = questionnaire.id
      logger.info(`Cuestionario creado: ${cuestionarioId}`)
    }

    let totalPreguntas = 0
    let temasExitosos = 0
    let temasFallidos = 0

    // Procesar cada tema
    for (const tema of temasAGenerar) {
      logger.info(``)
      logger.info(`Procesando: Tema ${tema.numero} - ${tema.titulo}`)

      try {
        // Generar preguntas
        const preguntas = await generarPreguntasParaTema(
          tema.id,
          tema.numero,
          tema.titulo,
          tema.descripcion,
          tema.categoria,
          config.numPreguntas,
          logger
        )

        if (preguntas.length === 0) {
          logger.warn(`  No se generaron preguntas`)
          temasFallidos++
          continue
        }

        logger.success(`  ${preguntas.length} preguntas generadas`)

        // Guardar en BD si no es dry-run
        if (!config.dryRun && cuestionarioId) {
          let preguntasGuardadas = 0
          for (const p of preguntas) {
            try {
              await prisma.question.create({
                data: {
                  questionnaireId: cuestionarioId,
                  text: p.pregunta,
                  options: JSON.stringify(p.opciones),
                  correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta],
                  explanation: p.explicacion,
                  temaCodigo: tema.id.toUpperCase(),
                  temaNumero: tema.numero,
                  temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
                  temaTitulo: tema.titulo,
                  difficulty: p.dificultad
                }
              })
              preguntasGuardadas++
            } catch (error) {
              logger.warn(`    Error guardando pregunta: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
          logger.success(`  ${preguntasGuardadas} preguntas guardadas en BD`)
          totalPreguntas += preguntasGuardadas
        } else {
          totalPreguntas += preguntas.length
        }

        temasExitosos++

        // Pequeña pausa para no saturar API
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        logger.error(`  Error procesando tema: ${error instanceof Error ? error.message : String(error)}`)
        temasFallidos++
      }
    }

    // Resumen final
    logger.info(``)
    logger.info('═'.repeat(60))
    logger.info('RESUMEN DE EJECUCIÓN')
    logger.info('═'.repeat(60))
    logger.success(`Temas procesados exitosamente: ${temasExitosos}`)
    logger.warn(`Temas con errores: ${temasFallidos}`)
    logger.success(`Total preguntas: ${totalPreguntas}`)
    if (config.dryRun) {
      logger.info('NOTA: Modo DRY RUN - No se guardó nada en la BD')
    }
    logger.info('═'.repeat(60))

    process.exit(0)
  } catch (error) {
    logger.error(`Error crítico: ${error instanceof Error ? error.message : String(error)}`)
    logger.error(error instanceof Error ? error.stack || '' : '')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
