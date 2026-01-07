/**
 * PROMPTS MEJORADOS PARA GENERACIÓN DE PREGUNTAS
 * Basados en exámenes oficiales reales C1 Administrativos SS
 */

export const EJEMPLOS_PREGUNTAS_OFICIALES = `
## EJEMPLOS DE PREGUNTAS DE EXÁMENES OFICIALES REALES

Estas son preguntas REALES de exámenes de 2022-2024. DEBES generar preguntas con este EXACTO nivel de rigor:

### EJEMPLO 1 - LGSS (Examen 2024):
Pregunta: "Conforme al artículo 205.1.a) del Real Decreto Legislativo 8/2015, de 30 de octubre, ¿qué porcentaje de la base reguladora corresponde aplicar para el cálculo de la pensión de jubilación a quien acceda a la misma con 65 años de edad y acredite 38 años y 6 meses de cotización efectiva?"

a) El 100 por 100
b) El 97 por 100
c) El 95 por 100  
d) El 50 por 100 más un 3 por 100 adicional por cada año completo de cotización

Respuesta correcta: a) El 100 por 100

Motivación: "El artículo 205.1.a) del RDL 8/2015 establece textualmente: 'Cuando se acceda a la pensión de jubilación a los sesenta y cinco años de edad, será necesario tener acreditados treinta y ocho años y seis meses de cotización para la obtención del cien por cien de la base reguladora'. Por tanto, cumpliendo ambos requisitos (65 años de edad y 38,5 años cotizados), corresponde aplicar el 100% de la base reguladora. La opción b) sería incorrecta ya que el 97% corresponde a 37 años cotizados con 65 años de edad. La opción c) no tiene correspondencia con ningún supuesto del artículo 205. La opción d) hace referencia al sistema de cálculo anterior, derogado."

---

### EJEMPLO 2 - Constitución (Examen 2023):
Pregunta: "Según el artículo 149.1.17ª de la Constitución Española, ¿qué competencia tiene el Estado en materia de Seguridad Social?"

a) Competencia exclusiva sin perjuicio de la ejecución de sus servicios por las Comunidades Autónomas
b) Competencia compartida con las Comunidades Autónomas
c) Legislación básica y régimen económico, correspondiendo la ejecución a las Comunidades Autónomas
d) Competencia plena sin ningún tipo de participación autonómica

Respuesta correcta: a) Competencia exclusiva sin perjuicio de la ejecución de sus servicios por las Comunidades Autónomas

Motivación: "El artículo 149.1.17ª de la CE establece que el Estado tiene competencia exclusiva sobre 'legislación básica y régimen económico de la Seguridad Social, sin perjuicio de la ejecución de sus servicios por las Comunidades Autónomas'. Esto significa que, aunque el Estado tiene la competencia legislativa exclusiva (opción a correcta), las CCAA pueden ejecutar los servicios. La opción b) es incorrecta porque no es competencia compartida. La opción c) confunde la fórmula de otras materias. La opción d) es incorrecta porque sí hay participación autonómica en la ejecución."

---

### EJEMPLO 3 - LGSS Afiliación (Examen 2024):
Pregunta: "De acuerdo con el artículo 13.2 del RDL 8/2015, ¿qué efectos produce la afiliación de un trabajador?"

a) Efectos únicamente durante la vigencia de la relación laboral
b) Efectos limitados a un año tras la finalización del contrato
c) Efectos que se mantienen durante toda la vida del trabajador, sin necesidad de renovación
d) Efectos que requieren renovación anual

Respuesta correcta: c) Efectos que se mantienen durante toda la vida del trabajador, sin necesidad de renovación

Motivación: "El artículo 13.2 del RDL 8/2015 establece el principio de 'afiliación única y vitalicia'. Textualmente: 'La afiliación al Sistema de la Seguridad Social es obligatoria, única para toda la vida y para todo el sistema y con carácter general, se efectuará mediante la asignación al interesado de un número de la Seguridad Social'. Por tanto, la afiliación no caduca ni requiere renovación (opción c correcta). Las opciones a) y b) son incorrectas porque limitan temporalmente los efectos. La opción d) contradice el carácter vitalicio establecido en la norma."

---

### EJEMPLO 4 - Procedimiento Administrativo (Examen 2023):
Pregunta: "Según el artículo 21.1 de la Ley 39/2015, del Procedimiento Administrativo Común, ¿cuál es el plazo máximo para dictar y notificar la resolución en un procedimiento administrativo cuando no se establezca un plazo específico?"

a) Un mes
b) Tres meses
c) Seis meses
d) Un año

Respuesta correcta: c) Seis meses

Motivación: "El artículo 21.1 de la Ley 39/2015 establece: 'El plazo máximo en el que debe notificarse la resolución será el fijado por la norma reguladora del correspondiente procedimiento. Este plazo no podrá exceder de seis meses salvo que una norma con rango de ley establezca uno mayor'. Por tanto, cuando no existe plazo específico, se aplica el plazo máximo general de 6 meses (opción c). La opción a) es incorrecta, aunque un mes es el plazo para algunos procedimientos específicos. La opción b) de 3 meses es un plazo común pero no el máximo general. La opción d) de un año excede el máximo salvo ley especial."

---

## CARACTERÍSTICAS COMUNES DE ESTAS PREGUNTAS:

1. **Citas exactas de artículos:** "artículo 205.1.a)", "artículo 149.1.17ª"
2. **Referencias al rango normativo:** "RDL 8/2015", "Constitución Española"
3. **Lenguaje formal:** "Conforme a", "De acuerdo con", "Según"
4. **Opciones numéricamente precisas:** porcentajes exactos, plazos concretos
5. **Motivaciones que:**
   - Citan textualmente la norma (entrecomillado)
   - Explican por qué la correcta es válida
   - Explican por qué cada incorrecta falla
   - Usan referencias cruzadas cuando procede

GENERA PREGUNTAS CON ESTE EXACTO NIVEL DE RIGOR Y PRECISIÓN.
`

export const PROMPT_MEJORADO_LGSS = (numPreguntas: number) => `
${EJEMPLOS_PREGUNTAS_OFICIALES}

---

## TU TAREA

Genera ${numPreguntas} preguntas IDÉNTICAS en estilo y rigor a los ejemplos anteriores sobre la Ley General de la Seguridad Social (RDL 8/2015).

## REQUISITOS CRÍTICOS:

1. **CITAS TEXTUALES OBLIGATORIAS:**
   - SIEMPRE entre comillas la parte relevante del artículo
   - Referencia exacta: "artículo X.Y" o "artículo X, apartado Y"
   - Si hay letra: "artículo X.Y.z)"

2. **MOTIVACIONES ESTRUCTURA OBLIGATORIA:**
   Formato: "El artículo X.Y del RDL 8/2015 establece [textualmente/que]: '[CITA EXACTA]'. 
   [Explicación de por qué la respuesta A es correcta].
   La opción B es incorrecta porque [razón específica con referencia si aplica].
   La opción C es incorrecta porque [razón específica].
   La opción D es incorrecta porque [razón específica]."

3. **OPCIONES INCORRECTAS REALISTAS:**
   - Basadas en confusiones reales (ej: 38 años vs 37 años vs 36 años)
   - Datos de artículos relacionados pero diferentes
   - Normativa anterior derogada
   - Casos límite o excepciones

4. **TEMAS A CUBRIR (distribuir uniformemente):**
   - Afiliación (Art. 13-17, 74-125)
   - Cotización (Art. 129-145)  
   - Jubilación (Art. 199-216)
   - Incapacidad Temporal/Permanente (Art. 128-151)
   - Prestaciones (Art. 177-240)
   - Regímenes (Art. 6-73)
   - Recaudación (Art. 146-175)

5. **VERIFICACIÓN:**
   - Antes de responder, verifica que CADA motivación incluya al menos una cita entrecomillada
   - Verifica que CADA opción incorrecta tenga su razón específica de error
   - Verifica que los números de artículo sean plausibles (RDL 8/2015 tiene 355 artículos)

FORMATO JSON:
[{
  "pregunta": "...",
  "opciones": ["a) ...", "b) ...", "c) ...", "d) ..."],
  "respuestaCorrecta": 0,
  "explicacion": "...",
  "dificultad": "media"
}]

SOLO responde con el JSON. Sin texto adicional.
`

export const PROMPT_MEJORADO_TEMAGENERAL = (
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: string,
  numPreguntas: number,
  preguntasExistentes: string[] = []
) => {
  let seccionPreguntasExistentes = ''
  if (preguntasExistentes.length > 0) {
    const preguntasMostrar = preguntasExistentes.slice(0, 50)
    seccionPreguntasExistentes = `

⚠️ PREGUNTAS YA EXISTENTES DE ESTE TEMA (${preguntasExistentes.length} en total):
${preguntasMostrar.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${preguntasExistentes.length > 50 ? '\n... y ' + (preguntasExistentes.length - 50) + ' más.' : ''}

🚫 IMPORTANTE: NO REPITAS ni REFORMULES ninguna de estas preguntas existentes.
Genera preguntas COMPLETAMENTE NUEVAS sobre aspectos diferentes del tema.
`
  }

  return `
${EJEMPLOS_PREGUNTAS_OFICIALES}

---

## TU TAREA

Genera ${numPreguntas} preguntas IDÉNTICAS en estilo y rigor a los ejemplos anteriores sobre:

**Tema ${temaNumero}: ${temaTitulo}**
**Categoría:** ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}
**Descripción:** ${temaDescripcion}
${seccionPreguntasExistentes}

## REQUISITOS CRÍTICOS:

1. **NORMATIVA APLICABLE según el tema:**
   - Si es Constitución: artículos de la CE 1978
   - Si es Administración: Ley 40/2015, Ley 39/2015
   - Si es Función Pública: EBEP (Ley 7/2007)
   - Si es Laboral: Estatuto de los Trabajadores
   - Si es UE: Tratados, Reglamentos específicos

2. **CITAS TEXTUALES OBLIGATORIAS:**
   - SIEMPRE entrecomillar la parte relevante del artículo
   - Usar nomenclatura oficial: "artículo X de la Ley Y"
   - Incluir rango normativo completo la primera vez

3. **MOTIVACIONES - ESTRUCTURA OBLIGATORIA:**
   CADA EXPLICACIÓN DEBE SEGUIR ESTE FORMATO:
   - Cita del artículo con texto entrecomillado
   - Explicación de por qué la opción correcta lo es
   - Explicación de por qué CADA opción incorrecta lo es (con referencias si aplica)

4. **DISTRACTORES REALISTAS:**
   - Basados en confusiones comunes (ej: mayorías parlamentarias)
   - Datos correctos pero de otro artículo/ley
   - Supuestos de normativa anterior o derogada
   - Casos excepcionales presentados como regla general

5. **ESTILO DE EXAMEN OFICIAL:**
   - Lenguaje formal: "Conforme a", "Según", "De acuerdo con"
   - Datos específicos y concretos (plazos, porcentajes, números)
   - Opciones equilibradas en longitud
   - Respuesta inequívoca con la normativa

FORMATO JSON:
[{
  "pregunta": "...",
  "opciones": ["a) ...", "b) ...", "c) ...", "d) ..."],
  "respuestaCorrecta": 0,
  "explicacion": "...",
  "dificultad": "media"
}]

SOLO responde con el JSON. Sin texto adicional.
`
}
