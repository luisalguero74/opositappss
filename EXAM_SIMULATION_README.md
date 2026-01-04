# Sistema de Simulacros de Examen

## Descripción

El sistema de simulacros de examen permite a los usuarios practicar con exámenes completos que simulan las condiciones reales de las oposiciones a la Seguridad Social.

## Características

### Formato del Examen
- **Parte 1 - Teoría**: 70 preguntas aleatorias de los test de temario
- **Parte 2 - Práctico**: 1 supuesto práctico con 15 preguntas
- **Tiempo total**: 120 minutos (2 horas)
- **Puntuación**: 85 puntos en total (70 + 15)

### Sistema de Tiempo
- Contador regresivo de 120:00 a 00:00
- **Alarma a los 30 minutos restantes**:
  - El contador se pone en ROJO
  - Suena un triple pitido (🔊🔊🔊)
  - Aparece advertencia visual: "⚠️ Quedan 30 minutos"
- Auto-envío cuando el tiempo llega a 00:00

### Funcionalidades para Usuarios

1. **Inicio de Simulacro**
   - Ruta: `/dashboard/exam-simulation`
   - Botón "Iniciar Nuevo Simulacro"
   - Se generan 70 preguntas aleatorias + 1 caso práctico

2. **Realización del Examen**
   - Ruta: `/dashboard/exam-simulation/[id]`
   - Navegación entre Parte 1 (Teoría) y Parte 2 (Práctico)
   - Contador de tiempo en header sticky
   - Indicador de progreso (preguntas respondidas)
   - Botón de envío manual

3. **Resultados**
   - Ruta: `/dashboard/exam-simulation/results/[id]`
   - Puntuación total y desglosada (teoría/práctico)
   - Porcentaje de acierto con código de colores:
     - Verde (≥70%): Sobresaliente
     - Amarillo (≥50%): Aprobado
     - Rojo (<50%): No apto
   - Solucionario completo con respuestas correctas e incorrectas marcadas

4. **Historial**
   - Lista de simulacros completados
   - Puntuaciones, porcentajes y tiempo empleado
   - Fecha de realización

### Panel de Administrador

1. **Base de Datos de Preguntas**
   - Ruta: `/admin/questions`
   - Visualización de todas las preguntas con sus opciones
   - Filtros por tipo (teoría/práctico) y búsqueda
   - Estadísticas de total de preguntas disponibles

2. **Estadísticas de Simulacros**
   - Ruta: `/admin/exam-stats`
   - Métricas globales:
     - Total de simulacros realizados
     - Nota media general, teoría y práctico
     - Tasa de aprobados
     - Tiempo medio empleado
   - Tabla detallada de todos los simulacros:
     - Usuario, fecha, puntuaciones, porcentaje
     - Ordenados por fecha más reciente

## Estructura de Base de Datos

### Modelo ExamSimulation
```prisma
model ExamSimulation {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  theoryQuestions   String   // JSON: 70 preguntas
  practicalCase     String   // JSON: caso + 15 preguntas
  userAnswers       String   // JSON: respuestas del usuario
  score             Int      // Total 0-85
  theoryScore       Int      // 0-70
  practicalScore    Int      // 0-15
  timeSpent         Int      // Minutos
  completed         Boolean
  startedAt         DateTime
  completedAt       DateTime?
  createdAt         DateTime
}
```

## APIs

### POST /api/exam-simulation
Crea un nuevo simulacro con preguntas aleatorias.

**Respuesta**:
```json
{
  "id": "...",
  "theoryQuestions": "[...]",  // 70 preguntas
  "practicalCase": "{...}"      // Caso + 15 preguntas
}
```

### GET /api/exam-simulation
Obtiene el historial de simulacros del usuario.

**Respuesta**:
```json
[
  {
    "id": "...",
    "score": 75,
    "theoryScore": 62,
    "practicalScore": 13,
    "timeSpent": 105,
    "completed": true,
    "completedAt": "2024-01-15T10:30:00Z"
  }
]
```

### GET /api/exam-simulation/[id]
Obtiene los datos de un simulacro específico.

### POST /api/exam-simulation/[id]/submit
Envía las respuestas y calcula la puntuación.

**Body**:
```json
{
  "theoryAnswers": ["respuesta1", "respuesta2", ...],  // 70 respuestas
  "practicalAnswers": ["respuesta1", ...],             // 15 respuestas
  "timeSpent": 105                                     // Minutos
}
```

**Respuesta**:
```json
{
  "score": 75,
  "theoryScore": 62,
  "practicalScore": 13,
  "totalQuestions": 85,
  "percentage": "88.24"
}
```

### GET /api/admin/questions
Admin: Obtiene todas las preguntas de la base de datos.

### GET /api/admin/exam-stats
Admin: Obtiene estadísticas de todos los simulacros.

## Estructura del Caso Práctico

Cada simulacro genera un caso práctico realista sobre Seguridad Social española:

```json
{
  "enunciado": "SUPUESTO PRÁCTICO: Don Juan Pérez García...",
  "questions": [
    {
      "text": "¿Qué prestación le corresponde...?",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": "Incapacidad permanente absoluta"
    }
    // ... 15 preguntas
  ]
}
```

Las opciones están barajadas aleatoriamente para cada pregunta.

## Acceso desde Dashboard

Tarjeta en el dashboard principal con icono 📝:
- Título: "Simulacros de Examen"
- Descripción: "Practica con exámenes completos de 70+15 preguntas y 120 minutos"
- Botón: "Ir a Simulacros →"

## Notas de Implementación

- Las preguntas de teoría se seleccionan aleatoriamente de todos los cuestionarios de tipo "teoría"
- El caso práctico se genera con contenido realista basado en escenarios comunes de oposiciones
- El sistema de alarma utiliza Audio API del navegador para reproducir el pitido
- Los resultados se almacenan permanentemente para análisis histórico
- Compatible con el sistema de monetización (se puede restringir a usuarios Premium)

## Próximas Mejoras Sugeridas

- [ ] Exportar resultados a PDF
- [ ] Comparativa con otros usuarios (anónima)
- [ ] Gráficos de evolución temporal
- [ ] Simulacros personalizados (elegir temas específicos)
- [ ] Modo práctica sin límite de tiempo
- [ ] Notas y marcadores en preguntas
