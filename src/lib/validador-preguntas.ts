/**
 * VALIDADOR DE PREGUNTAS GENERADAS
 * Verifica la calidad antes de guardar en BD
 */

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

interface ResultadoValidacion {
  valida: boolean
  errores: string[]
  advertencias: string[]
  puntuacion: number // 0-100
}

export class ValidadorPreguntas {
  
  /**
   * Valida una pregunta generada
   */
  static validar(pregunta: PreguntaGenerada): ResultadoValidacion {
    const errores: string[] = []
    const advertencias: string[] = []
    let puntuacion = 100

    // 1. VALIDAR ESTRUCTURA BÁSICA
    if (!pregunta.pregunta || pregunta.pregunta.length < 20) {
      errores.push('Pregunta demasiado corta (mínimo 20 caracteres)')
      puntuacion -= 30
    }

    if (!pregunta.opciones || pregunta.opciones.length !== 4) {
      errores.push('Debe haber exactamente 4 opciones')
      puntuacion -= 40
    }

    if (pregunta.respuestaCorrecta < 0 || pregunta.respuestaCorrecta > 3) {
      errores.push('respuestaCorrecta debe estar entre 0 y 3')
      puntuacion -= 40
    }

    // 2. VALIDAR EXPLICACIÓN/MOTIVACIÓN
    const validacionExplicacion = this.validarExplicacion(pregunta.explicacion)
    errores.push(...validacionExplicacion.errores)
    advertencias.push(...validacionExplicacion.advertencias)
    puntuacion -= validacionExplicacion.penalizacion

    // 3. VALIDAR OPCIONES
    const validacionOpciones = this.validarOpciones(pregunta.opciones)
    errores.push(...validacionOpciones.errores)
    advertencias.push(...validacionOpciones.advertencias)
    puntuacion -= validacionOpciones.penalizacion

    // 4. VALIDAR PREGUNTA
    const validacionPregunta = this.validarTextoPregunta(pregunta.pregunta)
    advertencias.push(...validacionPregunta.advertencias)
    puntuacion -= validacionPregunta.penalizacion

    return {
      valida: errores.length === 0 && puntuacion >= 60,
      errores,
      advertencias,
      puntuacion: Math.max(0, puntuacion)
    }
  }

  /**
   * Valida la explicación/motivación
   */
  private static validarExplicacion(explicacion: string): {
    errores: string[]
    advertencias: string[]
    penalizacion: number
  } {
    const errores: string[] = []
    const advertencias: string[] = []
    let penalizacion = 0

    if (!explicacion || explicacion.length < 100) {
      errores.push('Explicación demasiado corta (mínimo 100 caracteres)')
      penalizacion += 30
      return { errores, advertencias, penalizacion }
    }

    // CRÍTICO: Debe incluir referencias legales
    const tieneReferenciaLegal = this.verificarReferenciasLegales(explicacion)
    if (!tieneReferenciaLegal.tieneReferencia) {
      errores.push('La explicación DEBE incluir referencia específica a artículo/ley')
      penalizacion += 25
    } else if (!tieneReferenciaLegal.tieneCitaTextual) {
      advertencias.push('Se recomienda incluir cita textual entrecomillada del artículo')
      penalizacion += 10
    }

    // CRÍTICO: Debe explicar por qué las incorrectas están mal
    const palabrasClaveExplicacion = ['incorrecta', 'incorrectas', 'incorrecta porque', 'opción']
    const tieneExplicacionIncorrectas = palabrasClaveExplicacion.some(palabra => 
      explicacion.toLowerCase().includes(palabra)
    )
    
    if (!tieneExplicacionIncorrectas) {
      advertencias.push('Se recomienda explicar por qué las opciones incorrectas lo son')
      penalizacion += 10
    }

    // Verificar que menciona la opción correcta
    const mencionaCorrecta = /opción [A-Da-d]|respuesta [A-Da-d]|correcta es/i.test(explicacion)
    if (!mencionaCorrecta) {
      advertencias.push('Se recomienda mencionar explícitamente cuál es la opción correcta')
      penalizacion += 5
    }

    return { errores, advertencias, penalizacion }
  }

  /**
   * Verifica la presencia de referencias legales
   */
  private static verificarReferenciasLegales(texto: string): {
    tieneReferencia: boolean
    tieneCitaTextual: boolean
    referencias: string[]
  } {
    // Patrones de referencias legales
    const patronesReferencia = [
      /art(?:ículo|iculo)?\.?\s*\d+/gi,
      /ley\s+\d+\/\d+/gi,
      /real decreto(?:\s+legislativo)?\s+\d+\/\d+/gi,
      /rdl\s+\d+\/\d+/gi,
      /constitución española/gi,
      /estatuto de los trabajadores/gi,
      /ce\s+\d+/gi
    ]

    const referencias: string[] = []
    let tieneReferencia = false

    for (const patron of patronesReferencia) {
      const matches = texto.match(patron)
      if (matches) {
        tieneReferencia = true
        referencias.push(...matches)
      }
    }

    // Verificar citas textuales (texto entre comillas)
    const tieneCitaTextual = /["«]([^"»]{10,})["»]/.test(texto)

    return {
      tieneReferencia,
      tieneCitaTextual,
      referencias: [...new Set(referencias)] // Eliminar duplicados
    }
  }

  /**
   * Valida las opciones de respuesta
   */
  private static validarOpciones(opciones: string[]): {
    errores: string[]
    advertencias: string[]
    penalizacion: number
  } {
    const errores: string[] = []
    const advertencias: string[] = []
    let penalizacion = 0

    if (opciones.length !== 4) {
      errores.push('Debe haber exactamente 4 opciones')
      penalizacion += 40
      return { errores, advertencias, penalizacion }
    }

    // Verificar que las opciones tengan contenido significativo
    for (let i = 0; i < opciones.length; i++) {
      if (!opciones[i] || opciones[i].trim().length < 5) {
        errores.push(`La opción ${i} está vacía o es demasiado corta`)
        penalizacion += 15
      }
    }

    // Verificar que las opciones tengan longitud similar (equilibrio)
    const longitudes = opciones.map(o => o.length)
    const longitudMedia = longitudes.reduce((a, b) => a + b, 0) / longitudes.length
    const desviaciones = longitudes.map(l => Math.abs(l - longitudMedia))
    const desviacionMaxima = Math.max(...desviaciones)

    if (desviacionMaxima > longitudMedia * 0.8) {
      advertencias.push('Las opciones tienen longitudes muy diferentes (se recomienda más equilibrio)')
      penalizacion += 5
    }

    // Verificar que no haya opciones duplicadas
    const opcionesUnicas = new Set(opciones.map(o => o.trim().toLowerCase()))
    if (opcionesUnicas.size < 4) {
      errores.push('Hay opciones duplicadas o muy similares')
      penalizacion += 20
    }

    // Verificar formato de opciones (deberían empezar con a), b), c), d))
    const formatoCorrecto = opciones.every((opt, i) => {
      const letraEsperada = String.fromCharCode(97 + i) // a, b, c, d
      return opt.trim().toLowerCase().startsWith(letraEsperada + ')')
    })

    if (!formatoCorrecto) {
      advertencias.push('Se recomienda que las opciones empiecen con a), b), c), d)')
      penalizacion += 3
    }

    return { errores, advertencias, penalizacion }
  }

  /**
   * Valida el texto de la pregunta
   */
  private static validarTextoPregunta(pregunta: string): {
    advertencias: string[]
    penalizacion: number
  } {
    const advertencias: string[] = []
    let penalizacion = 0

    // Verificar que no sea una pregunta negativa (menos clara)
    if (/no es|no son|no corresponde|no se|cuál no/i.test(pregunta)) {
      advertencias.push('Se recomienda evitar preguntas en negativo (menos claras)')
      penalizacion += 5
    }

    // Verificar lenguaje formal
    const tieneFormalismoLegal = /según|conforme|de acuerdo con|a tenor de|en virtud de/i.test(pregunta)
    if (!tieneFormalismoLegal) {
      advertencias.push('Se recomienda usar lenguaje formal (según, conforme, de acuerdo con...)')
      penalizacion += 3
    }

    // Verificar que termine en signo de interrogación
    if (!pregunta.trim().endsWith('?')) {
      advertencias.push('La pregunta debería terminar con signo de interrogación')
      penalizacion += 2
    }

    return { advertencias, penalizacion }
  }

  /**
   * Valida un lote de preguntas
   */
  static validarLote(preguntas: PreguntaGenerada[]): {
    totalValidas: number
    totalInvalidas: number
    preguntasConProblemas: Array<{
      indice: number
      puntuacion: number
      errores: string[]
      advertencias: string[]
    }>
    reporteGeneral: string
  } {
    const resultados = preguntas.map((p, i) => ({
      indice: i,
      ...this.validar(p)
    }))

    const validas = resultados.filter(r => r.valida)
    const invalidas = resultados.filter(r => !r.valida)
    const conProblemas = resultados.filter(r => r.advertencias.length > 0 || r.errores.length > 0)

    const puntuacionMedia = resultados.reduce((sum, r) => sum + r.puntuacion, 0) / resultados.length

    const reporteGeneral = `
📊 REPORTE DE VALIDACIÓN
========================
Total preguntas: ${preguntas.length}
✅ Válidas: ${validas.length} (${Math.round(validas.length / preguntas.length * 100)}%)
❌ Inválidas: ${invalidas.length}
⚠️  Con advertencias: ${conProblemas.length}

Puntuación media: ${Math.round(puntuacionMedia)}/100

${invalidas.length > 0 ? '\n⚠️  PREGUNTAS INVÁLIDAS:' : ''}
${invalidas.map(r => `  - Pregunta ${r.indice + 1}: Puntuación ${r.puntuacion}/100\n    Errores: ${r.errores.join(', ')}`).join('\n')}
    `

    return {
      totalValidas: validas.length,
      totalInvalidas: invalidas.length,
      preguntasConProblemas: conProblemas.map(r => ({
        indice: r.indice,
        puntuacion: r.puntuacion,
        errores: r.errores,
        advertencias: r.advertencias
      })),
      reporteGeneral
    }
  }
}
